import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../../database/app_database.dart';
import 'vencimento.dart';

/// Registro de pagamento de mensalidade pelo OPERADOR (offline-first).
///
/// Decisão A: recebido no app SEMPRE amarra caixa (gaveta do operador). Grava
/// numa MESMA transação: (a) mensalidade_pagamento, (b) caixa_movimento tipo
/// 'entrada', (c) amarra caixa_movimento_id, (d) enfileira OS DOIS na outbox.
/// Payload em epoch-ms (pago_em), competência 'YYYY-MM-01', SEM operacao_id.
class MensalidadeRepository {
  MensalidadeRepository({required this.db});

  final AppDatabase db;

  Future<int> countPagamentosCompetencia(
    String clienteId,
    String competencia,
  ) =>
      db.mensalidadePagamentosDao
          .countByClienteCompetencia(clienteId, competencia);

  Future<List<MensalidadePagamento>> historico(String clienteId) =>
      db.mensalidadePagamentosDao.getByCliente(clienteId);

  Future<void> registrarPagamento({
    required String patioId,
    required String clienteId,
    required String clienteNome,
    String? planoId,
    required String competencia, // 'YYYY-MM-01'
    required double valor,
    required String formaPagamento,
    required String caixaSessaoId,
    required String operadorId,
    required String operadorNome,
    String? observacao,
  }) async {
    final pagamentoId = const Uuid().v4();
    final movimentoId = const Uuid().v4();
    final agora = DateTime.now().millisecondsSinceEpoch;
    final descricao = 'Mensalidade — $clienteNome';

    final pagamentoPayload = jsonEncode({
      'id': pagamentoId,
      'cliente_id': clienteId,
      'plano_id': planoId,
      'competencia': competencia,
      'valor': valor,
      'forma_pagamento': formaPagamento,
      'pago_em': agora, // epoch-ms
      'origem': 'app',
      'registrado_por': operadorId,
      'registrado_por_nome': operadorNome,
      'caixa_sessao_id': caixaSessaoId,
      'caixa_movimento_id': movimentoId,
      'observacao': observacao,
    });

    final movimentoPayload = jsonEncode({
      'id': movimentoId,
      'caixa_sessao_id': caixaSessaoId,
      'tipo': 'entrada',
      'valor': valor,
      'descricao': descricao,
      'forma_pagamento': formaPagamento,
      'criado_em': agora,
    });

    await db.transaction(() async {
      // (a) mensalidade_pagamento
      await db.mensalidadePagamentosDao.inserir(MensalidadePagamentosCompanion(
        id: Value(pagamentoId),
        operacaoId: Value(patioId),
        clienteId: Value(clienteId),
        clienteNome: Value(clienteNome),
        planoId: Value(planoId),
        competencia: Value(competencia),
        valor: Value(valor),
        formaPagamento: Value(formaPagamento),
        pagoEmEpoch: Value(agora),
        origem: const Value('app'),
        registradoPor: Value(operadorId),
        caixaSessaoId: Value(caixaSessaoId),
        caixaMovimentoId: Value(movimentoId), // (c) amarração
        observacao: Value(observacao),
        syncStatus: const Value('pendente'),
        criadoEm: Value(agora),
      ));

      // (b) caixa_movimento tipo 'entrada' (aparece no fechamento de caixa)
      await db.caixaDao.inserirMovimento(CaixaMovimentosCompanion(
        id: Value(movimentoId),
        caixaSessaoId: Value(caixaSessaoId),
        tipo: const Value('entrada'),
        valor: Value(valor),
        descricao: Value(descricao),
        formaPagamento: Value(formaPagamento),
        criadoEm: Value(agora),
        syncStatus: const Value('pendente'),
      ));

      final row = await db.caixaDao.getSessaoById(caixaSessaoId);
      if (row != null) {
        await db.caixaDao.atualizarSessao(
          caixaSessaoId,
          CaixaSessoesCompanion(
            totalEntradas: Value(row.totalEntradas + valor),
            syncStatus: const Value('pendente'),
          ),
        );
      }

      // (e) avança a vigência local do cliente (mesma regra do painel/API) —
      // reflexo imediato; o servidor reconcilia no próximo bootstrap.
      final cli = await db.clientesDao.getClienteById(clienteId);
      if (cli != null) {
        final atual = cli.vencimentoEpoch != null
            ? DateTime.fromMillisecondsSinceEpoch(cli.vencimentoEpoch!)
            : null;
        final novo = proximoVencimento(atual, cli.diaVencimento);
        await db.clientesDao
            .atualizarVencimento(clienteId, novo.millisecondsSinceEpoch);
      }

      // (d) enfileira OS DOIS na outbox
      await db.syncDao.enqueue(SyncLogCompanion(
        entidade: const Value('mensalidade_pagamento'),
        entidadeId: Value(pagamentoId),
        operacao: const Value('create'),
        payload: Value(pagamentoPayload),
        criadoEm: Value(agora),
      ));
      await db.syncDao.enqueue(SyncLogCompanion(
        entidade: const Value('caixa_movimento'),
        entidadeId: Value(movimentoId),
        operacao: const Value('create'),
        payload: Value(movimentoPayload),
        criadoEm: Value(agora),
      ));
    });
  }
}
