import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/auth/data/token_storage.dart';
import 'package:nuvempark_app/features/mensalistas/data/mensalidade_repository.dart';
import 'package:nuvempark_app/features/sync/data/sync_engine.dart';

import '../../support/fakes.dart';

Future<void> _registrar(MensalidadeRepository repo) => repo.registrarPagamento(
      patioId: 'p1',
      clienteId: 'cli1',
      clienteNome: 'Maria',
      planoId: 'pl1',
      competencia: '2026-07-01',
      valor: 150.0,
      formaPagamento: 'pix',
      caixaSessaoId: 'cx1',
      operadorId: 'op1',
      operadorNome: 'Operador',
    );

void main() {
  test(
      'registrar com caixa aberto: pagamento + movimento amarrados na mesma transação, 2 itens de outbox',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedCaixaAberto(db, id: 'cx1', patio: 'p1');

    await _registrar(MensalidadeRepository(db: db));

    final pags = await db.mensalidadePagamentosDao.getByCliente('cli1');
    expect(pags.length, 1);
    final pag = pags.first;
    expect(pag.origem, 'app');
    expect(pag.caixaSessaoId, 'cx1');
    expect(pag.caixaMovimentoId, isNotNull);

    final movs = await db.caixaDao.getMovimentosBySessao('cx1');
    expect(movs.length, 1);
    expect(movs.first.id, pag.caixaMovimentoId, reason: 'amarração');
    expect(movs.first.tipo, 'entrada');
    expect(movs.first.valor, 150.0);
    expect(movs.first.descricao, 'Mensalidade — Maria');

    final sessao = await db.caixaDao.getSessaoById('cx1');
    expect(sessao!.totalEntradas, 150.0, reason: 'entra no fechamento');

    final futuro = DateTime.now().millisecondsSinceEpoch + 60000;
    final pend = await db.syncDao.getPendentes(futuro);
    expect(
        pend.where((s) => s.entidade == 'mensalidade_pagamento').length, 1);
    expect(pend.where((s) => s.entidade == 'caixa_movimento').length, 1);

    await db.close();
  });

  test(
      'sync da 4a entidade: marca sincronizado + envelope epoch-ms e SEM operacao_id',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final storage = TokenStorage(MemSecureStorage());
    await storage.saveTenant(id: 't1', codigo: '1234');
    await storage.savePatioId('p1');
    await seedCaixaAberto(db, id: 'cx1', patio: 'p1');
    await _registrar(MensalidadeRepository(db: db));

    final capturadas = <Map<String, dynamic>>[];
    final dio = fakeDio((_) => jsonResponse({'ok': true}));
    dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
      if (options.path.endsWith('/sync') && options.data is Map) {
        capturadas.add((options.data as Map).cast<String, dynamic>());
      }
      handler.next(options);
    }));

    final r = await SyncEngine(db: db, dio: dio, storage: storage).drain();
    expect(r.failed, 0);

    final pags = await db.mensalidadePagamentosDao.getByCliente('cli1');
    expect(pags.first.syncStatus, 'sincronizado');
    expect(await db.syncDao.countPendentes(), 0);

    final env =
        capturadas.firstWhere((e) => e['entidade'] == 'mensalidade_pagamento');
    expect(env.containsKey('operacao_id'), isFalse, reason: 'envelope sem operacao_id');
    expect(env['patio_id'], 'p1');
    expect(env['tenant_id'], 't1');
    final payload = env['payload'] as Map;
    expect(payload.containsKey('operacao_id'), isFalse);
    expect(payload['pago_em'], isA<int>(), reason: 'pago_em em epoch-ms');
    expect(payload['competencia'], '2026-07-01');

    await db.close();
  });

  test(
      'sem caixa aberto: gate (getSessaoAberta) é null → registro bloqueado na UI',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());

    // Sem sessão → o sinal que a UI usa para bloquear é null.
    expect(await db.caixaDao.getSessaoAberta('p1', 'op1'), isNull);

    // Com caixa aberto, o gate libera.
    await seedCaixaAberto(db, id: 'cx1', patio: 'p1');
    expect(await db.caixaDao.getSessaoAberta('p1', 'op1'), isNotNull);

    await db.close();
  });
}
