import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../../core/config/env.dart';
import '../../../database/app_database.dart';
import 'ticket_remoto.dart';
import '../domain/ticket_model.dart';
import '../domain/reconhecimento_cliente.dart';

/// Ticket alvo de registrarSaida() já estava fechado (status != 'aberto').
/// Tipo dedicado para o caller distinguir "já foi registrado antes" de erros
/// reais de escrita (importante no retry de pagamento e no duplo-toque).
class TicketJaFechadoException implements Exception {
  const TicketJaFechadoException();
  @override
  String toString() => 'Ticket já foi fechado';
}

/// Resultado de uma saída efetivada por ESTE chamador. Se a saída não
/// aconteceu (ticket inexistente ou já fechado), registrarSaida lança em vez de
/// devolver — logo, receber um SaidaResult significa "eu fechei agora".
class SaidaResult {
  const SaidaResult({required this.caixaMovimentoId});

  /// id do movimento de caixa criado, ou null quando a saída não passou pela
  /// gaveta (pix online, livre passagem, isenção ou valor cobrado 0).
  final String? caixaMovimentoId;
}

/// Repositório de tickets. NOTA de porte NuvemPark: os payloads de sync NÃO
/// incluem `operacao_id` — o envelope de sync já carrega `patio_id`/`tenant_id`.
/// As chaves de data são `entrada`/`saida`/`atualizado_em` (epoch-ms) para casar
/// com o backend (`toIso()` aceita epoch-ms), NÃO `entrada_epoch`.
class TicketRepository {
  TicketRepository({required this.db, this.dio});

  final AppDatabase db;

  /// Opcional: sem ele as buscas ficam só no Drift (testes antigos, offline).
  final Dio? dio;

  /// Busca pontual de ticket aberto no servidor quando o Drift não tem.
  ///
  /// O ciclo de 30s do bootstrap traz os carros dos outros aparelhos, mas o
  /// caso mais comum é justamente o que ele perde: o carro entrou pelo aparelho
  /// do pátio agora há pouco e já está no caixa. Achou → grava localmente, e a
  /// saída segue pelo caminho de sempre (offline-first).
  ///
  /// Qualquer falha de rede vira null: a tela já sabe dizer "não encontrado".
  Future<Ticket?> _buscarAbertoNoServidor(
    String patioId, {
    String? placa,
    String? id,
  }) async {
    final d = dio;
    if (d == null) return null;
    try {
      final resp = await d.get<dynamic>(
        Env.ticketAbertoUrl,
        queryParameters: {
          'patio_id': patioId,
          'placa': ?placa,
          'id': ?id,
        },
      );
      final body = resp.data;
      if (body is! Map || body['ticket'] is! Map) return null;
      final m = Map<String, dynamic>.from(body['ticket'] as Map);
      await db.ticketsDao.inserirSeAusente(ticketRemotoParaCompanion(m, patioId));
      final local = await db.ticketsDao.getById(m['id'] as String);
      // Já existia aqui fechado (saída local ainda não enviada): não reabre.
      return local?.status == 'aberto' ? local : null;
    } catch (_) {
      return null;
    }
  }

  /// Reconhece a placa contra o cache local de clientes de livre passagem.
  Future<ReconhecimentoCliente?> reconhecerPlaca(
    String patioId,
    String placa,
  ) async {
    final cliente = await db.clientesDao
        .getClienteByPlaca(patioId, placa.trim().toUpperCase());
    if (cliente == null) return null;

    final ocupadas =
        await db.ticketsDao.contarAbertosPorCliente(patioId, cliente.id);

    final StatusReconhecimento status;
    if (cliente.bloqueado) {
      status = StatusReconhecimento.bloqueado;
    } else if (_vencido(cliente.vencimentoEpoch)) {
      status = StatusReconhecimento.vencido;
    } else if (ocupadas >= cliente.vagas) {
      status = StatusReconhecimento.vagasEsgotadas;
    } else {
      status = StatusReconhecimento.livrePassagem;
    }

    return ReconhecimentoCliente(
      clienteId: cliente.id,
      nome: cliente.nome,
      planoId: cliente.planoId,
      planoNome: cliente.planoNome,
      planoTipo: cliente.planoTipo,
      vagas: cliente.vagas,
      vagasOcupadas: ocupadas,
      status: status,
    );
  }

  /// Vencido = data de vencimento anterior ao início de hoje.
  static bool _vencido(int? vencimentoEpoch) {
    if (vencimentoEpoch == null) return false;
    final agora = DateTime.now();
    final inicioHoje =
        DateTime(agora.year, agora.month, agora.day).millisecondsSinceEpoch;
    return vencimentoEpoch < inicioHoje;
  }

  /// Ticket aberto com esta placa (veículo ainda no pátio), se houver.
  Future<Ticket?> ticketAbertoPorPlaca(String patioId, String placa) async {
    final placaNorm = placa.trim().toUpperCase();
    return await db.ticketsDao.getAbertoByPlaca(patioId, placaNorm) ??
        await _buscarAbertoNoServidor(patioId, placa: placaNorm);
  }

  Future<String> registrarEntrada({
    required String placa,
    required String tipoVeiculo,
    required String patioId,
    required String operadorId,
    String? caixaSessaoId,
    String? tarifaId,
    String? clienteId,
    String? planoId,
    String origem = 'avulso',
    String? fotoEntradaPath,
    // Ticket de hóspede: a estadia que cobre esta passagem (origem 'estadia').
    String? estadiaId,
    // Hora da entrada; nula = agora. A contratação passa a MESMA hora da
    // estadia, para início da estadia e entrada do carro baterem.
    int? entradaEpoch,
  }) async {
    final id = const Uuid().v4();
    final agora = entradaEpoch ?? DateTime.now().millisecondsSinceEpoch;
    final placaNorm = placa.trim().toUpperCase();

    // Payload alinhado ao backend NuvemPark (sem operacao_id; chave `entrada`).
    final payload = jsonEncode({
      'id': id,
      'placa': placaNorm,
      'tipo_veiculo': tipoVeiculo,
      'entrada': agora,
      'status': 'aberto',
      'operador_id': operadorId,
      'caixa_sessao_id': caixaSessaoId,
      'tabela_preco_id': tarifaId,
      'cliente_id': clienteId,
      'plano_id': planoId,
      'origem': origem,
      'estadia_id': ?estadiaId,
      'atualizado_em': agora,
    });

    await db.transaction(() async {
      await db.ticketsDao.inserir(TicketsCompanion(
        id: Value(id),
        operacaoId: Value(patioId),
        placa: Value(placaNorm),
        tipoVeiculo: Value(tipoVeiculo),
        entradaEpoch: Value(agora),
        status: const Value('aberto'),
        operadorId: Value(operadorId),
        caixaSessaoId: Value(caixaSessaoId),
        tabelaPrecoId: Value(tarifaId),
        clienteId: Value(clienteId),
        planoId: Value(planoId),
        origem: Value(origem),
        estadiaId: Value(estadiaId),
        fotoEntradaPath: Value(fotoEntradaPath),
        fotoEntradaEnviada: const Value(false),
        syncStatus: const Value('pendente'),
        criadoEm: Value(agora),
        atualizadoEm: Value(agora),
      ));
      await db.syncDao.enqueue(SyncLogCompanion(
        entidade: const Value('ticket'),
        entidadeId: Value(id),
        operacao: const Value('create'),
        payload: Value(payload),
        criadoEm: Value(agora),
      ));
    });

    return id;
  }

  /// Efetiva a SAÍDA de um veículo: fecha o ticket e — quando o dinheiro passa
  /// pela gaveta AGORA — registra a receita no caixa, TUDO numa única transação
  /// atômica.
  ///
  /// Blindagem contra pagamento duplo (duplo-toque / concorrência): o fecho é
  /// CONDICIONAL a `status = 'aberto'` (fecharSeAberto). Só quem encontra o
  /// ticket ainda aberto efetiva a saída e cria o movimento de caixa; os demais
  /// veem 0 linhas e recebem [TicketJaFechadoException] — a gaveta nunca é
  /// creditada duas vezes pelo mesmo carro. Como fecho e caixa vivem na MESMA
  /// transação, também não há janela em que o ticket fica fechado sem a receita
  /// correspondente (nem o contrário).
  ///
  /// [operadorSaidaId] é quem VALIDOU a saída — não o `operador_id` do ticket,
  /// que é de quem registrou a entrada (muitas vezes de outro turno).
  ///
  /// A receita entra no caixa só quando [caixaSessaoId] != null e
  /// [valorCobrado] > 0. Pix online / livre passagem / isenção passam
  /// `caixaSessaoId` nulo e não movimentam a gaveta.
  Future<SaidaResult> registrarSaida({
    required String ticketId,
    required double valorCalculado,
    required double valorCobrado,
    required String formaPagamento,
    required String operadorSaidaId,
    String? motivoIsencao,
    String? tabelaPrecoId,
    // Receita no caixa (só quando o dinheiro passa pela gaveta agora).
    String? caixaSessaoId,
    String? placa,
    // Campos de pagamento (Pix/cartão). Opcionais: o ramo manual omite nulos.
    String? atk,
    String? itk,
    String? authorizationCode,
    String? brand,
    String? pan,
    int? installments,
    String? paymentProcessor,
    double valorAbatido = 0,
  }) async {
    final agora = DateTime.now().millisecondsSinceEpoch;

    final ticketPayload = montarPayloadFechamentoTicket(
      agora: agora,
      valorCalculado: valorCalculado,
      valorCobrado: valorCobrado,
      formaPagamento: formaPagamento,
      operadorSaidaId: operadorSaidaId,
      motivoIsencao: motivoIsencao,
      tabelaPrecoId: tabelaPrecoId,
      atk: atk,
      itk: itk,
      authorizationCode: authorizationCode,
      brand: brand,
      pan: pan,
      installments: installments,
      paymentProcessor: paymentProcessor,
      valorAbatido: valorAbatido,
    );

    return db.transaction(() async {
      // Fecho ATÔMICO: 1 linha = eu fechei; 0 = já estava fechado ou não existe.
      final fechados = await db.ticketsDao.fecharSeAberto(
        ticketId,
        TicketsCompanion(
          saidaEpoch: Value(agora),
          valorCalculado: Value(valorCalculado),
          valorCobrado: Value(valorCobrado),
          formaPagamento: Value(formaPagamento),
          motivoIsencao: Value(motivoIsencao),
          tabelaPrecoId: Value(tabelaPrecoId),
          atk: Value(atk),
          itk: Value(itk),
          authorizationCode: Value(authorizationCode),
          brand: Value(brand),
          cardPan: Value(pan),
          installments: Value(installments),
          paymentProcessor: Value(paymentProcessor),
          status: const Value('fechado'),
          syncStatus: const Value('pendente'),
          atualizadoEm: Value(agora),
        ),
      );

      if (fechados == 0) {
        // Distingue "não existe" de "já fechado" — o caller trata diferente.
        final existing = await db.ticketsDao.getById(ticketId);
        if (existing == null) throw Exception('Ticket não encontrado');
        throw const TicketJaFechadoException();
      }

      await db.syncDao.enqueue(SyncLogCompanion(
        entidade: const Value('ticket'),
        entidadeId: Value(ticketId),
        operacao: const Value('update'),
        payload: Value(jsonEncode(ticketPayload)),
        criadoEm: Value(agora),
      ));

      // Receita no caixa — amarrada ao fecho na mesma transação. Só é alcançada
      // porque o fecho acima teve sucesso, então nunca roda em duplicidade.
      String? movimentoId;
      if (caixaSessaoId != null && valorCobrado > 0) {
        movimentoId = const Uuid().v4();
        final descricao = 'Ticket ${placa ?? ''}'.trim();
        final movimentoPayload = jsonEncode({
          'id': movimentoId,
          'caixa_sessao_id': caixaSessaoId,
          'tipo': 'entrada',
          'valor': valorCobrado,
          'descricao': descricao,
          'ticket_id': ticketId,
          'forma_pagamento': formaPagamento,
          'criado_em': agora,
        });

        await db.caixaDao.inserirMovimento(CaixaMovimentosCompanion(
          id: Value(movimentoId),
          caixaSessaoId: Value(caixaSessaoId),
          tipo: const Value('entrada'),
          valor: Value(valorCobrado),
          descricao: Value(descricao),
          ticketId: Value(ticketId),
          formaPagamento: Value(formaPagamento),
          criadoEm: Value(agora),
          syncStatus: const Value('pendente'),
        ));

        final sessao = await db.caixaDao.getSessaoById(caixaSessaoId);
        if (sessao != null) {
          await db.caixaDao.atualizarSessao(
            caixaSessaoId,
            CaixaSessoesCompanion(
              totalEntradas: Value(sessao.totalEntradas + valorCobrado),
              syncStatus: const Value('pendente'),
            ),
          );
        }

        await db.syncDao.enqueue(SyncLogCompanion(
          entidade: const Value('caixa_movimento'),
          entidadeId: Value(movimentoId),
          operacao: const Value('create'),
          payload: Value(movimentoPayload),
          criadoEm: Value(agora),
        ));
      }

      return SaidaResult(caixaMovimentoId: movimentoId);
    });
  }

  Future<List<TicketModel>> getTicketsAbertos(String patioId) async {
    final rows = await db.ticketsDao.getAbertos(patioId);
    return rows.map(_toModel).toList();
  }

  /// Histórico de movimentos (qualquer status) para a tela de movimentos do app.
  Future<List<TicketModel>> getMovimentos(String patioId) async {
    final rows = await db.ticketsDao.getRecentes(patioId);
    return rows.map(_toModel).toList();
  }

  Future<TicketModel?> buscarAbertoByPlaca(
    String patioId,
    String placa,
  ) async {
    final row = await db.ticketsDao.getAbertoByPlaca(
      patioId,
      placa.trim().toUpperCase(),
    );
    return row != null ? _toModel(row) : null;
  }

  /// Com [patioId], um id que este aparelho não conhece (QR impresso por outro
  /// aparelho) é procurado no servidor.
  Future<TicketModel?> getById(String id, {String? patioId}) async {
    final row = await db.ticketsDao.getById(id) ??
        (patioId != null
            ? await _buscarAbertoNoServidor(patioId, id: id)
            : null);
    return row != null ? _toModel(row) : null;
  }

  static TicketModel _toModel(Ticket row) => TicketModel(
        id: row.id,
        operacaoId: row.operacaoId,
        placa: row.placa,
        tipoVeiculo: row.tipoVeiculo,
        entrada: DateTime.fromMillisecondsSinceEpoch(row.entradaEpoch),
        saida: row.saidaEpoch != null
            ? DateTime.fromMillisecondsSinceEpoch(row.saidaEpoch!)
            : null,
        valorCalculado: row.valorCalculado,
        valorCobrado: row.valorCobrado,
        formaPagamento: row.formaPagamento,
        motivoIsencao: row.motivoIsencao,
        status: row.status,
        operadorId: row.operadorId,
        caixaSessaoId: row.caixaSessaoId,
        tabelaPrecoId: row.tabelaPrecoId,
        clienteId: row.clienteId,
        planoId: row.planoId,
        origem: row.origem,
        syncStatus: row.syncStatus,
        fotoEntradaPath: row.fotoEntradaPath,
      );
}

/// Monta o payload de sync do fechamento de ticket. Chaves base sempre
/// presentes; chaves de pagamento (Pix/cartão) só entram quando não-nulas.
Map<String, dynamic> montarPayloadFechamentoTicket({
  required int agora,
  required double valorCalculado,
  required double valorCobrado,
  required String formaPagamento,
  required String operadorSaidaId,
  String? motivoIsencao,
  String? tabelaPrecoId,
  String? atk,
  String? itk,
  String? authorizationCode,
  String? brand,
  String? pan,
  int? installments,
  String? paymentProcessor,
  /// Quanto o voucher de parceiro abateu. Vai para `liberacoes.valor_abatido`
  /// no servidor, e é ele que a competência do parceiro soma — não fica no
  /// ticket. Zero significa "sem voucher": o campo sai do payload e o servidor
  /// não tem o que gravar.
  double valorAbatido = 0,
}) {
  return <String, dynamic>{
    'saida': agora,
    'valor_calculado': valorCalculado,
    'valor_cobrado': valorCobrado,
    'forma_pagamento': formaPagamento,
    // Quem validou a saída. O painel precisa disto para auditar isenção e
    // mensalista, que não deixam rastro no caixa (não geram movimento).
    'operador_saida_id': operadorSaidaId,
    'motivo_isencao': motivoIsencao,
    'tabela_preco_id': tabelaPrecoId,
    'status': 'fechado',
    'atualizado_em': agora,
    // Null-aware: omitido quando nulo → pagamento manual = payload enxuto.
    'atk': ?atk,
    'itk': ?itk,
    'authorization_code': ?authorizationCode,
    'brand': ?brand,
    'pan': ?pan,
    'installments': ?installments,
    'payment_processor': ?paymentProcessor,
    'valor_abatido': ?(valorAbatido > 0 ? valorAbatido : null),
  };
}
