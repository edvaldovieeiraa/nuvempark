import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../../database/app_database.dart';
import '../../patio/domain/tarifa_config.dart';
import '../../tickets/data/ticket_repository.dart';
import '../domain/estadia_engine.dart';

/// Caixa ausente ou fechado: toda cobrança de estadia passa pela gaveta.
class CaixaFechadoException implements Exception {
  const CaixaFechadoException();
  @override
  String toString() => 'Abra o caixa para cobrar a estadia';
}

/// A placa já tem estadia válida: o caminho é renovar, não contratar outra.
class EstadiaJaAtivaException implements Exception {
  const EstadiaJaAtivaException(this.estadiaId);
  final String estadiaId;
}

/// As diárias escolhidas não levam a validade até depois de agora.
class DiariasInsuficientesException implements Exception {
  const DiariasInsuficientesException(this.minimo);
  final int minimo;
}

enum SituacaoHospede { valida, vencidaRecente }

class ReconhecimentoHospede {
  const ReconhecimentoHospede({required this.estadia, required this.situacao});
  final Estadia estadia;
  final SituacaoHospede situacao;
}

/// O que foi GRAVADO — a tela imprime isto, não o que calculou antes do
/// diálogo de confirmação (o relógio andou nesse meio-tempo).
class EstadiaCriada {
  const EstadiaCriada({
    required this.estadiaId,
    required this.ticketId,
    required this.validaAte,
  });
  final String estadiaId;
  final String ticketId;
  final DateTime validaAte;
}

class RenovacaoFeita {
  const RenovacaoFeita({required this.validaAte, required this.valor, this.ticketId});
  final DateTime validaAte;
  final double valor;

  /// Renovou e entrou: o ticket criado junto.
  final String? ticketId;
}

/// Gravação local da estadia de hóspede (offline-first, como mensalidade):
/// cada operação é UMA transação Drift com tudo que ela toca — estadia,
/// pagamento, movimento de caixa, ticket — e os itens de outbox na ordem em
/// que o servidor precisa recebê-los (estadia antes do pagamento dela).
///
/// O vencimento local é estendido aqui com a mesma fórmula que o banco aplica
/// (EstadiaEngine.renovacao ↔ fn_estadia_registrar_pagamento); o ciclo de
/// tickets abertos traz depois o vencimento do servidor, que é a verdade.
class EstadiaRepository {
  EstadiaRepository({required this.db, DateTime Function()? relogio})
      : _relogio = relogio ?? DateTime.now;

  final AppDatabase db;
  final DateTime Function() _relogio;

  /// Janela em que uma estadia vencida ainda é reconhecida na entrada.
  static const janelaVencida = Duration(days: 7);

  TicketRepository get _tickets => TicketRepository(db: db);

  // ── Consultas ──────────────────────────────────────────────────────────────

  Future<Estadia?> estadia(String id) => db.estadiasDao.getEstadia(id);

  Future<List<EstadiaPagamento>> pagamentos(String estadiaId) =>
      db.estadiasDao.pagamentosDa(estadiaId);

  /// A placa é de hóspede? Válida, ou vencida há até 7 dias (aviso na volta).
  /// Mais antiga que isso: carro comum.
  Future<ReconhecimentoHospede?> reconhecerHospede(
    String patioId,
    String placa,
  ) async {
    final e = await db.estadiasDao
        .ultimaPorPlaca(patioId, placa.trim().toUpperCase());
    if (e == null) return null;
    final agora = _relogio().millisecondsSinceEpoch;
    if (e.validaAteEpoch > agora) {
      return ReconhecimentoHospede(estadia: e, situacao: SituacaoHospede.valida);
    }
    if (agora - e.validaAteEpoch <= janelaVencida.inMilliseconds) {
      return ReconhecimentoHospede(
          estadia: e, situacao: SituacaoHospede.vencidaRecente);
    }
    return null;
  }

  // ── Contratação ────────────────────────────────────────────────────────────

  /// Contrata a estadia e registra a entrada do carro, juntos.
  Future<EstadiaCriada> contratar({
    required String patioId,
    required String placa,
    required String tipoVeiculo,
    required TarifaConfig tarifa,
    required int diarias,
    required String formaPagamento,
    required String caixaSessaoId,
    required String operadorId,
    String? fotoEntradaPath,
  }) async {
    final placaNorm = placa.trim().toUpperCase();
    final agora = _relogio();
    final calculo = EstadiaEngine.contratacao(
      diarias: diarias,
      diariaValor: tarifa.diariaValor!,
      diariaHoras: tarifa.diariaHoras!,
      inicio: agora,
    );

    return db.transaction(() async {
      await _exigirCaixaAberto(caixaSessaoId);
      final atual = await reconhecerHospede(patioId, placaNorm);
      if (atual?.situacao == SituacaoHospede.valida) {
        throw EstadiaJaAtivaException(atual!.estadia.id);
      }

      final estadiaId = await _criarEstadia(
        patioId: patioId,
        placa: placaNorm,
        tipoVeiculo: tipoVeiculo,
        tarifa: tarifa,
        inicio: agora,
        validaAte: calculo.validaAte,
        diarias: diarias,
        valor: calculo.valor,
        operadorId: operadorId,
        agoraMs: agora.millisecondsSinceEpoch,
      );
      await _registrarPagamento(
        patioId: patioId,
        estadiaId: estadiaId,
        placa: placaNorm,
        tipo: 'contratacao',
        diarias: diarias,
        valor: calculo.valor,
        formaPagamento: formaPagamento,
        base: null,
        caixaSessaoId: caixaSessaoId,
        operadorId: operadorId,
        agoraMs: agora.millisecondsSinceEpoch,
      );
      final ticketId = await _tickets.registrarEntrada(
        placa: placaNorm,
        tipoVeiculo: tipoVeiculo,
        patioId: patioId,
        operadorId: operadorId,
        tarifaId: tarifa.id,
        origem: 'estadia',
        estadiaId: estadiaId,
        fotoEntradaPath: fotoEntradaPath,
        entradaEpoch: agora.millisecondsSinceEpoch,
      );
      return EstadiaCriada(
          estadiaId: estadiaId, ticketId: ticketId, validaAte: calculo.validaAte);
    });
  }

  /// Ticket avulso aberto vira estadia contada DESDE A ENTRADA do carro
  /// (Revisão 6): o tempo já no pátio entra na estadia, nada é cobrado avulso.
  Future<EstadiaCriada> converterTicket({
    required String ticketId,
    required TarifaConfig tarifa,
    required int diarias,
    required String formaPagamento,
    required String caixaSessaoId,
    required String operadorId,
  }) async {
    final agora = _relogio();
    return db.transaction(() async {
      await _exigirCaixaAberto(caixaSessaoId);
      final ticket = await db.ticketsDao.getById(ticketId);
      if (ticket == null || ticket.status != 'aberto' || ticket.origem != 'avulso') {
        throw StateError('Só um ticket avulso aberto pode virar estadia');
      }
      final inicio = DateTime.fromMillisecondsSinceEpoch(ticket.entradaEpoch);
      final calculo = EstadiaEngine.contratacao(
        diarias: diarias,
        diariaValor: tarifa.diariaValor!,
        diariaHoras: tarifa.diariaHoras!,
        inicio: inicio,
      );
      if (!calculo.validaAte.isAfter(agora)) {
        throw DiariasInsuficientesException(EstadiaEngine.minimoDiarias(
            inicio: inicio, agora: agora, diariaHoras: tarifa.diariaHoras!));
      }

      final estadiaId = await _criarEstadia(
        patioId: ticket.operacaoId,
        placa: ticket.placa,
        tipoVeiculo: ticket.tipoVeiculo,
        tarifa: tarifa,
        inicio: inicio,
        validaAte: calculo.validaAte,
        diarias: diarias,
        valor: calculo.valor,
        operadorId: operadorId,
        agoraMs: agora.millisecondsSinceEpoch,
      );
      await _registrarPagamento(
        patioId: ticket.operacaoId,
        estadiaId: estadiaId,
        placa: ticket.placa,
        tipo: 'contratacao',
        diarias: diarias,
        valor: calculo.valor,
        formaPagamento: formaPagamento,
        base: null,
        caixaSessaoId: caixaSessaoId,
        operadorId: operadorId,
        agoraMs: agora.millisecondsSinceEpoch,
      );

      final agoraMs = agora.millisecondsSinceEpoch;
      await db.ticketsDao.atualizar(
        ticketId,
        TicketsCompanion(
          origem: const Value('estadia'),
          estadiaId: Value(estadiaId),
          tabelaPrecoId: Value(tarifa.id),
          syncStatus: const Value('pendente'),
          atualizadoEm: Value(agoraMs),
        ),
      );
      await _enfileirar('ticket', ticketId, 'update', {
        'origem': 'estadia',
        'estadia_id': estadiaId,
        'tabela_preco_id': tarifa.id,
        'atualizado_em': agoraMs,
      }, criadoEm: agoraMs);
      return EstadiaCriada(
          estadiaId: estadiaId, ticketId: ticketId, validaAte: calculo.validaAte);
    });
  }

  // ── Renovação ──────────────────────────────────────────────────────────────

  /// Renova sem mexer em ticket (ficha da estadia, entrada já registrada).
  Future<RenovacaoFeita> renovar({
    required String estadiaId,
    required int diarias,
    required String formaPagamento,
    required String caixaSessaoId,
    required String operadorId,
    required bool carroDentro,
  }) =>
      db.transaction(() => _renovar(
            estadiaId: estadiaId,
            diarias: diarias,
            formaPagamento: formaPagamento,
            caixaSessaoId: caixaSessaoId,
            operadorId: operadorId,
            carroDentro: carroDentro,
          ));

  /// Saída de estadia vencida em que o hóspede "vai continuar": renova a partir
  /// do vencimento antigo (cobre o atraso) e fecha o ticket a R$ 0.
  Future<RenovacaoFeita> renovarESair({
    required String estadiaId,
    required String ticketId,
    required int diarias,
    required String formaPagamento,
    required String caixaSessaoId,
    required String operadorId,
  }) =>
      db.transaction(() async {
        final r = await _renovar(
          estadiaId: estadiaId,
          diarias: diarias,
          formaPagamento: formaPagamento,
          caixaSessaoId: caixaSessaoId,
          operadorId: operadorId,
          carroDentro: true,
        );
        await _tickets.registrarSaida(
          ticketId: ticketId,
          valorCalculado: 0,
          valorCobrado: 0,
          formaPagamento: formaHospede,
          operadorSaidaId: operadorId,
        );
        return r;
      });

  /// Volta de hóspede com a estadia vencida: renova a partir de agora (o tempo
  /// fora não é cobrado) e registra a entrada na mesma transação.
  Future<RenovacaoFeita> renovarEEntrar({
    required String estadiaId,
    required int diarias,
    required String formaPagamento,
    required String caixaSessaoId,
    required String operadorId,
    String? fotoEntradaPath,
  }) =>
      db.transaction(() async {
        final r = await _renovar(
          estadiaId: estadiaId,
          diarias: diarias,
          formaPagamento: formaPagamento,
          caixaSessaoId: caixaSessaoId,
          operadorId: operadorId,
          carroDentro: false,
        );
        final e = (await db.estadiasDao.getEstadia(estadiaId))!;
        final ticketId = await registrarEntradaHospede(e,
            operadorId: operadorId, fotoEntradaPath: fotoEntradaPath);
        return RenovacaoFeita(validaAte: r.validaAte, valor: r.valor, ticketId: ticketId);
      });

  /// Entrada de placa com estadia válida: ticket sem cobrança ligado à estadia.
  Future<String> registrarEntradaHospede(
    Estadia e, {
    required String operadorId,
    String? fotoEntradaPath,
  }) =>
      _tickets.registrarEntrada(
        placa: e.placa,
        tipoVeiculo: e.tipoVeiculo,
        patioId: e.operacaoId,
        operadorId: operadorId,
        tarifaId: e.tarifaId,
        origem: 'estadia',
        estadiaId: e.id,
        fotoEntradaPath: fotoEntradaPath,
        entradaEpoch: _relogio().millisecondsSinceEpoch,
      );

  /// Forma gravada na saída de hóspede sem cobrança (não entra no caixa).
  static const formaHospede = 'hospede';

  Future<RenovacaoFeita> _renovar({
    required String estadiaId,
    required int diarias,
    required String formaPagamento,
    required String caixaSessaoId,
    required String operadorId,
    required bool carroDentro,
  }) async {
    await _exigirCaixaAberto(caixaSessaoId);
    final e = await db.estadiasDao.getEstadia(estadiaId);
    if (e == null) throw StateError('Estadia não encontrada neste aparelho');

    final agora = _relogio();
    final r = EstadiaEngine.renovacao(
      validaAte: DateTime.fromMillisecondsSinceEpoch(e.validaAteEpoch),
      diariaHoras: e.diariaHoras,
      diariaValor: e.diariaValor,
      diarias: diarias,
      agora: agora,
      carroDentro: carroDentro,
    );
    if (diarias < r.minimoDiarias || !r.cobreAgora) {
      throw DiariasInsuficientesException(r.minimoDiarias);
    }

    await db.estadiasDao.atualizarEstadia(
      estadiaId,
      EstadiasCompanion(
        validaAteEpoch: Value(r.novaValidaAte.millisecondsSinceEpoch),
        diarias: Value(e.diarias + diarias),
        valorTotal: Value(e.valorTotal + r.valor),
        atualizadoEm: Value(agora.millisecondsSinceEpoch),
      ),
    );
    await _registrarPagamento(
      patioId: e.operacaoId,
      estadiaId: estadiaId,
      placa: e.placa,
      tipo: 'renovacao',
      diarias: diarias,
      valor: r.valor,
      formaPagamento: formaPagamento,
      base: r.base,
      caixaSessaoId: caixaSessaoId,
      operadorId: operadorId,
      agoraMs: agora.millisecondsSinceEpoch,
    );
    return RenovacaoFeita(validaAte: r.novaValidaAte, valor: r.valor);
  }

  // ── Peças comuns ───────────────────────────────────────────────────────────

  Future<void> _exigirCaixaAberto(String caixaSessaoId) async {
    final sessao = await db.caixaDao.getSessaoById(caixaSessaoId);
    if (sessao == null || sessao.status != 'aberta') {
      throw const CaixaFechadoException();
    }
  }

  Future<String> _criarEstadia({
    required String patioId,
    required String placa,
    required String tipoVeiculo,
    required TarifaConfig tarifa,
    required DateTime inicio,
    required DateTime validaAte,
    required int diarias,
    required double valor,
    required String operadorId,
    required int agoraMs,
  }) async {
    final id = const Uuid().v4();
    await db.estadiasDao.inserirEstadia(EstadiasCompanion.insert(
      id: id,
      operacaoId: patioId,
      placa: placa,
      tipoVeiculo: tipoVeiculo,
      tarifaId: tarifa.id,
      diariaValor: tarifa.diariaValor!,
      diariaHoras: tarifa.diariaHoras!,
      inicioEpoch: inicio.millisecondsSinceEpoch,
      validaAteEpoch: validaAte.millisecondsSinceEpoch,
      diarias: diarias,
      valorTotal: valor,
      operadorId: Value(operadorId),
      criadoEm: agoraMs,
      atualizadoEm: agoraMs,
    ));
    await _enfileirar('estadia', id, 'create', {
      'id': id,
      'placa': placa,
      'tipo_veiculo': tipoVeiculo,
      'tarifa_id': tarifa.id,
      'diaria_valor': tarifa.diariaValor,
      'diaria_horas': tarifa.diariaHoras,
      'inicio': inicio.millisecondsSinceEpoch,
      'valida_ate': validaAte.millisecondsSinceEpoch,
      'diarias': diarias,
      'valor_total': valor,
      'operador_id': operadorId,
    }, criadoEm: agoraMs);
    return id;
  }

  /// Pagamento + movimento de caixa + total da sessão + outbox (pagamento
  /// antes do movimento). Chamado dentro da transação do caller.
  Future<void> _registrarPagamento({
    required String patioId,
    required String estadiaId,
    required String placa,
    required String tipo,
    required int diarias,
    required double valor,
    required String formaPagamento,
    required DateTime? base,
    required String caixaSessaoId,
    required String operadorId,
    required int agoraMs,
  }) async {
    final pagamentoId = const Uuid().v4();
    final movimentoId = const Uuid().v4();
    final descricao =
        '${tipo == 'renovacao' ? 'Renovação' : 'Estadia'} — $placa · $diarias diária${diarias == 1 ? '' : 's'}';

    await db.estadiasDao.inserirPagamento(EstadiaPagamentosCompanion.insert(
      id: pagamentoId,
      operacaoId: patioId,
      estadiaId: estadiaId,
      tipo: tipo,
      diarias: diarias,
      valor: valor,
      formaPagamento: formaPagamento,
      baseEpoch: Value(base?.millisecondsSinceEpoch),
      operadorId: Value(operadorId),
      caixaSessaoId: Value(caixaSessaoId),
      caixaMovimentoId: Value(movimentoId),
      pagoEmEpoch: agoraMs,
      criadoEm: agoraMs,
    ));
    await db.caixaDao.inserirMovimento(CaixaMovimentosCompanion(
      id: Value(movimentoId),
      caixaSessaoId: Value(caixaSessaoId),
      tipo: const Value('entrada'),
      valor: Value(valor),
      descricao: Value(descricao),
      formaPagamento: Value(formaPagamento),
      estadiaPagamentoId: Value(pagamentoId),
      criadoEm: Value(agoraMs),
      syncStatus: const Value('pendente'),
    ));
    final sessao = await db.caixaDao.getSessaoById(caixaSessaoId);
    if (sessao != null) {
      await db.caixaDao.atualizarSessao(
        caixaSessaoId,
        CaixaSessoesCompanion(
          totalEntradas: Value(sessao.totalEntradas + valor),
          syncStatus: const Value('pendente'),
        ),
      );
    }

    await _enfileirar('estadia_pagamento', pagamentoId, 'create', {
      'id': pagamentoId,
      'estadia_id': estadiaId,
      'tipo': tipo,
      'diarias': diarias,
      'valor': valor,
      'forma_pagamento': formaPagamento,
      'base': ?base?.millisecondsSinceEpoch,
      'operador_id': operadorId,
      'caixa_sessao_id': caixaSessaoId,
      'caixa_movimento_id': movimentoId,
      'pago_em': agoraMs,
    }, criadoEm: agoraMs);
    await _enfileirar('caixa_movimento', movimentoId, 'create', {
      'id': movimentoId,
      'caixa_sessao_id': caixaSessaoId,
      'tipo': 'entrada',
      'valor': valor,
      'descricao': descricao,
      'forma_pagamento': formaPagamento,
      'estadia_pagamento_id': pagamentoId,
      'criado_em': agoraMs,
    }, criadoEm: agoraMs);
  }

  /// Todos os itens de UMA operação levam o mesmo `criadoEm`: a outbox ordena
  /// por ele e desempata pelo id, então saem na ordem em que foram
  /// enfileirados — estadia, pagamento, movimento, ticket.
  Future<void> _enfileirar(
    String entidade,
    String entidadeId,
    String operacao,
    Map<String, Object?> payload, {
    required int criadoEm,
  }) =>
      db.syncDao.enqueue(SyncLogCompanion(
        entidade: Value(entidade),
        entidadeId: Value(entidadeId),
        operacao: Value(operacao),
        payload: Value(jsonEncode(payload)),
        criadoEm: Value(criadoEm),
      ));
}
