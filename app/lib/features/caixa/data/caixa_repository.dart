import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../../database/app_database.dart';
import '../domain/caixa_model.dart';

/// Repositório de caixa. NOTAS de porte NuvemPark:
///  - payloads NÃO incluem operacao_id (o envelope carrega patio_id/tenant_id);
///  - chaves de data são `abertura`/`fechamento` (epoch-ms), casam com toIso();
///  - tipo de movimento restrito a 'entrada'|'sangria'|'isencao' (CHECK do
///    banco). Receita de ticket → 'entrada'.
class CaixaRepository {
  CaixaRepository({required this.db});

  final AppDatabase db;

  Future<String> abrirCaixa({
    required String patioId,
    required String operadorId,
    required String operadorNome,
    required double fundoCaixa,
  }) async {
    // Blindagem: nunca abrir uma 2ª sessão se já há uma aberta (duplo-toque /
    // reabertura). Retorna a existente em vez de duplicar.
    final existente = await db.caixaDao.getSessaoAberta(patioId, operadorId);
    if (existente != null) return existente.id;

    final id = const Uuid().v4();
    final agora = DateTime.now().millisecondsSinceEpoch;

    final payload = jsonEncode({
      'id': id,
      'operador_id': operadorId,
      'operador_nome': operadorNome,
      'fundo_caixa': fundoCaixa,
      'status': 'aberta',
      'abertura': agora,
    });

    await db.transaction(() async {
      await db.caixaDao.abrirSessao(CaixaSessoesCompanion(
        id: Value(id),
        operacaoId: Value(patioId),
        operadorId: Value(operadorId),
        operadorNome: Value(operadorNome),
        fundoCaixa: Value(fundoCaixa),
        status: const Value('aberta'),
        aberturaEpoch: Value(agora),
        syncStatus: const Value('pendente'),
      ));
      await db.syncDao.enqueue(SyncLogCompanion(
        entidade: const Value('caixa_sessao'),
        entidadeId: Value(id),
        operacao: const Value('create'),
        payload: Value(payload),
        criadoEm: Value(agora),
      ));
    });

    return id;
  }

  Future<CaixaModel?> getSessaoAberta(String patioId, String operadorId) async {
    final row = await db.caixaDao.getSessaoAberta(patioId, operadorId);
    return row != null ? _toModel(row) : null;
  }

  Future<CaixaModel?> getSessaoById(String id) async {
    final row = await db.caixaDao.getSessaoById(id);
    return row != null ? _toModel(row) : null;
  }

  Future<void> registrarSangria({
    required String caixaSessaoId,
    required double valor,
    required String descricao,
  }) async {
    final id = const Uuid().v4();
    final agora = DateTime.now().millisecondsSinceEpoch;

    final payload = jsonEncode({
      'id': id,
      'caixa_sessao_id': caixaSessaoId,
      'tipo': 'sangria',
      'valor': valor,
      'descricao': descricao,
      'criado_em': agora,
    });

    await db.transaction(() async {
      await db.caixaDao.inserirMovimento(CaixaMovimentosCompanion(
        id: Value(id),
        caixaSessaoId: Value(caixaSessaoId),
        tipo: const Value('sangria'),
        valor: Value(valor),
        descricao: Value(descricao),
        criadoEm: Value(agora),
        syncStatus: const Value('pendente'),
      ));

      final row = await db.caixaDao.getSessaoById(caixaSessaoId);
      if (row != null) {
        await db.caixaDao.atualizarSessao(
          caixaSessaoId,
          CaixaSessoesCompanion(
            totalSangrias: Value(row.totalSangrias + valor),
            syncStatus: const Value('pendente'),
          ),
        );
      }

      await db.syncDao.enqueue(SyncLogCompanion(
        entidade: const Value('caixa_movimento'),
        entidadeId: Value(id),
        operacao: const Value('create'),
        payload: Value(payload),
        criadoEm: Value(agora),
      ));
    });
  }

  /// Lançamento manual do operador: receita ('entrada') ou despesa
  /// ('sangria'), sempre com descrição. Atualiza o total correspondente
  /// e enfileira o sync — mesma mecânica dos demais movimentos.
  Future<void> registrarLancamentoManual({
    required String caixaSessaoId,
    required bool receita,
    required double valor,
    required String descricao,
  }) async {
    final tipo = receita ? 'entrada' : 'sangria';
    final id = const Uuid().v4();
    final agora = DateTime.now().millisecondsSinceEpoch;

    final payload = jsonEncode({
      'id': id,
      'caixa_sessao_id': caixaSessaoId,
      'tipo': tipo,
      'valor': valor,
      'descricao': descricao,
      'criado_em': agora,
    });

    await db.transaction(() async {
      await db.caixaDao.inserirMovimento(CaixaMovimentosCompanion(
        id: Value(id),
        caixaSessaoId: Value(caixaSessaoId),
        tipo: Value(tipo),
        valor: Value(valor),
        descricao: Value(descricao),
        criadoEm: Value(agora),
        syncStatus: const Value('pendente'),
      ));

      final row = await db.caixaDao.getSessaoById(caixaSessaoId);
      if (row != null) {
        await db.caixaDao.atualizarSessao(
          caixaSessaoId,
          CaixaSessoesCompanion(
            totalEntradas:
                receita ? Value(row.totalEntradas + valor) : const Value.absent(),
            totalSangrias:
                receita ? const Value.absent() : Value(row.totalSangrias + valor),
            syncStatus: const Value('pendente'),
          ),
        );
      }

      await db.syncDao.enqueue(SyncLogCompanion(
        entidade: const Value('caixa_movimento'),
        entidadeId: Value(id),
        operacao: const Value('create'),
        payload: Value(payload),
        criadoEm: Value(agora),
      ));
    });
  }

  /// Registra a receita de um ticket como movimento tipo 'entrada'.
  Future<void> registrarEntradaTicket({
    required String caixaSessaoId,
    required String ticketId,
    required double valor,
    required String formaPagamento,
    required String placa,
  }) async {
    final id = const Uuid().v4();
    final agora = DateTime.now().millisecondsSinceEpoch;

    final payload = jsonEncode({
      'id': id,
      'caixa_sessao_id': caixaSessaoId,
      'tipo': 'entrada',
      'valor': valor,
      'descricao': 'Ticket $placa',
      'ticket_id': ticketId,
      'forma_pagamento': formaPagamento,
      'criado_em': agora,
    });

    await db.transaction(() async {
      await db.caixaDao.inserirMovimento(CaixaMovimentosCompanion(
        id: Value(id),
        caixaSessaoId: Value(caixaSessaoId),
        tipo: const Value('entrada'),
        valor: Value(valor),
        descricao: Value('Ticket $placa'),
        ticketId: Value(ticketId),
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

      await db.syncDao.enqueue(SyncLogCompanion(
        entidade: const Value('caixa_movimento'),
        entidadeId: Value(id),
        operacao: const Value('create'),
        payload: Value(payload),
        criadoEm: Value(agora),
      ));
    });
  }

  Future<FechamentoResult> fecharCaixa({
    required String caixaSessaoId,
    required double totalContado,
    String? observacao,
  }) async {
    final row = await db.caixaDao.getSessaoById(caixaSessaoId);
    if (row == null) throw Exception('Sessão de caixa não encontrada');

    // Blindagem: recomputa entradas/sangrias dos MOVIMENTOS (fonte da verdade),
    // não do total acumulado — imune a drift por falha parcial de atualização.
    // 'isencao' não movimenta dinheiro, então fica fora do saldo.
    final movs = await db.caixaDao.getMovimentosBySessao(caixaSessaoId);
    final entradas = movs
        .where((m) => m.tipo == 'entrada')
        .fold<double>(0, (t, m) => t + m.valor);
    final sangrias = movs
        .where((m) => m.tipo == 'sangria')
        .fold<double>(0, (t, m) => t + m.valor);

    final totalCalculado = row.fundoCaixa + entradas - sangrias;
    final divergencia = totalContado - totalCalculado;
    final agora = DateTime.now().millisecondsSinceEpoch;

    final payload = jsonEncode({
      'status': 'fechada',
      'total_fechamento': totalContado,
      'fechamento': agora,
      'observacao_fechamento': observacao,
    });

    await db.transaction(() async {
      await db.caixaDao.atualizarSessao(
        caixaSessaoId,
        CaixaSessoesCompanion(
          status: const Value('fechada'),
          totalFechamento: Value(totalContado),
          fechamentoEpoch: Value(agora),
          observacaoFechamento: Value(observacao),
          syncStatus: const Value('pendente'),
        ),
      );
      await db.syncDao.enqueue(SyncLogCompanion(
        entidade: const Value('caixa_sessao'),
        entidadeId: Value(caixaSessaoId),
        operacao: const Value('update'),
        payload: Value(payload),
        criadoEm: Value(agora),
      ));
    });

    return FechamentoResult(
      totalCalculado: totalCalculado,
      totalContado: totalContado,
      divergencia: divergencia,
    );
  }

  Future<List<MovimentoModel>> getMovimentos(String caixaSessaoId) async {
    final rows = await db.caixaDao.getMovimentosBySessao(caixaSessaoId);
    return rows.map((row) => _toMovimentoModel(row)).toList();
  }

  static CaixaModel _toModel(CaixaSessoe row) => CaixaModel(
        id: row.id,
        operacaoId: row.operacaoId,
        operadorId: row.operadorId,
        operadorNome: row.operadorNome,
        fundoCaixa: row.fundoCaixa,
        totalEntradas: row.totalEntradas,
        totalSangrias: row.totalSangrias,
        totalFechamento: row.totalFechamento,
        status: row.status,
        abertura: DateTime.fromMillisecondsSinceEpoch(row.aberturaEpoch),
        fechamento: row.fechamentoEpoch != null
            ? DateTime.fromMillisecondsSinceEpoch(row.fechamentoEpoch!)
            : null,
        observacaoFechamento: row.observacaoFechamento,
        syncStatus: row.syncStatus,
      );

  static MovimentoModel _toMovimentoModel(CaixaMovimento row) => MovimentoModel(
        id: row.id,
        caixaSessaoId: row.caixaSessaoId,
        tipo: row.tipo,
        valor: row.valor,
        descricao: row.descricao,
        ticketId: row.ticketId,
        formaPagamento: row.formaPagamento,
        criadoEm: DateTime.fromMillisecondsSinceEpoch(row.criadoEm),
      );
}
