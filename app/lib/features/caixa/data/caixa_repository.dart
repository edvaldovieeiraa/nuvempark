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

    // Blindagem: nunca abrir uma 2ª sessão se já há uma aberta (duplo-toque /
    // reabertura). A checagem e a inserção correm na MESMA transação, que o
    // SQLite serializa — duas aberturas simultâneas devolvem a mesma sessão.
    return db.transaction(() async {
      final existente = await db.caixaDao.getSessaoAberta(patioId, operadorId);
      if (existente != null) return existente.id;

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
      return id;
    });
  }

  Future<CaixaModel?> getSessaoAberta(String patioId, String operadorId) async {
    final row = await db.caixaDao.getSessaoAberta(patioId, operadorId);
    return row != null ? _toModel(row) : null;
  }

  Future<CaixaModel?> getSessaoById(String id) async {
    final row = await db.caixaDao.getSessaoById(id);
    return row != null ? _toModel(row) : null;
  }

  /// Última sessão fechada do operador — usada para reimprimir o fechamento.
  Future<CaixaModel?> getUltimaSessaoFechada(
      String patioId, String operadorId) async {
    final row = await db.caixaDao.getUltimaSessaoFechada(patioId, operadorId);
    return row != null ? _toModel(row) : null;
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

    // Idempotência: sessão já fechada → no-op. Devolve o resultado a partir do
    // que foi gravado, sem reescrever nem reenfileirar sync (duplo-toque/retry
    // não geram fechamento duplicado).
    if (row.status != 'aberta') {
      final contado = row.totalFechamento ?? totalCalculado;
      return FechamentoResult(
        totalCalculado: totalCalculado,
        totalContado: contado,
        divergencia: contado - totalCalculado,
        jaEstavaFechada: true,
      );
    }

    final divergencia = totalContado - totalCalculado;
    final agora = DateTime.now().millisecondsSinceEpoch;

    final payload = jsonEncode({
      'status': 'fechada',
      'total_fechamento': totalContado,
      'fechamento': agora,
      'observacao_fechamento': observacao,
    });

    var fechouAgora = false;
    await db.transaction(() async {
      // Fecho condicional: se outra chamada fechou entre a leitura e aqui, muda
      // 0 linhas e não reenfileira o sync — evita duplicidade na corrida.
      final n = await db.caixaDao.fecharSeAberta(
        caixaSessaoId,
        CaixaSessoesCompanion(
          status: const Value('fechada'),
          totalFechamento: Value(totalContado),
          fechamentoEpoch: Value(agora),
          observacaoFechamento: Value(observacao),
          syncStatus: const Value('pendente'),
        ),
      );
      if (n == 0) return;
      fechouAgora = true;
      await db.syncDao.enqueue(SyncLogCompanion(
        entidade: const Value('caixa_sessao'),
        entidadeId: Value(caixaSessaoId),
        operacao: const Value('update'),
        payload: Value(payload),
        criadoEm: Value(agora),
      ));
    });

    // Perdedor da corrida (outra chamada fechou primeiro): no-op idempotente,
    // devolve o que ficou gravado em vez de mentir que este fechou.
    if (!fechouAgora) {
      final atual = await db.caixaDao.getSessaoById(caixaSessaoId);
      final contado = atual?.totalFechamento ?? totalCalculado;
      return FechamentoResult(
        totalCalculado: totalCalculado,
        totalContado: contado,
        divergencia: contado - totalCalculado,
        jaEstavaFechada: true,
      );
    }

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
