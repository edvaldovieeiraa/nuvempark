import 'package:drift/drift.dart' show Value;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/caixa/data/caixa_repository.dart';
import 'package:nuvempark_app/features/caixa/domain/caixa_model.dart';

import '../../support/fakes.dart';

void main() {
  const patio = 'p1';
  const sessaoId = 'cx1';

  Future<int> contarSync(AppDatabase db, String entidade) async {
    final futuro = DateTime.now().millisecondsSinceEpoch + 60000;
    final pend = await db.syncDao.getPendentes(futuro);
    return pend.where((s) => s.entidade == entidade).length;
  }

  Future<void> seedMovimento(
    AppDatabase db, {
    required String id,
    required String tipo,
    required double valor,
  }) {
    return db.caixaDao.inserirMovimento(CaixaMovimentosCompanion.insert(
      id: id,
      caixaSessaoId: sessaoId,
      tipo: tipo,
      valor: valor,
      descricao: 'seed',
      criadoEm: DateTime.now().millisecondsSinceEpoch,
    ));
  }

  test('fecharCaixa recomputa dos MOVIMENTOS (fonte da verdade), imune a drift',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedCaixaAberto(db, id: sessaoId, patio: patio); // fundo 100.0
    await seedMovimento(db, id: 'm1', tipo: 'entrada', valor: 40);
    await seedMovimento(db, id: 'm2', tipo: 'entrada', valor: 10);
    await seedMovimento(db, id: 'm3', tipo: 'sangria', valor: 30);

    // Corrompe o total acumulado de propósito: o fechamento não pode confiar nele.
    await db.caixaDao.atualizarSessao(
        sessaoId, const CaixaSessoesCompanion(totalEntradas: Value(999)));

    final res = await CaixaRepository(db: db)
        .fecharCaixa(caixaSessaoId: sessaoId, totalContado: 120);

    // 100 (fundo) + 50 (entradas) - 30 (sangria) = 120
    expect(res.totalCalculado, 120);
    expect(res.divergencia, 0);

    await db.close();
  });

  test('fecharCaixa é idempotente: fechar 2x não duplica sync nem reescreve',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedCaixaAberto(db, id: sessaoId, patio: patio);
    await seedMovimento(db, id: 'm1', tipo: 'entrada', valor: 50);
    final repo = CaixaRepository(db: db);

    final primeiro =
        await repo.fecharCaixa(caixaSessaoId: sessaoId, totalContado: 150);
    expect(primeiro.jaEstavaFechada, isFalse);

    final sessao1 = await db.caixaDao.getSessaoById(sessaoId);
    expect(sessao1!.status, 'fechada');
    expect(sessao1.totalFechamento, 150);
    expect(await contarSync(db, 'caixa_sessao'), 1);

    // Segundo fechamento (duplo-toque / retry): não pode duplicar nada.
    final segundo = await repo.fecharCaixa(
        caixaSessaoId: sessaoId, totalContado: 999, observacao: 'outro');
    expect(segundo.jaEstavaFechada, isTrue, reason: 'sinaliza no-op idempotente');

    final sessao2 = await db.caixaDao.getSessaoById(sessaoId);
    expect(sessao2!.totalFechamento, 150, reason: 'valor original preservado');
    expect(await contarSync(db, 'caixa_sessao'), 1,
        reason: 'sem sync de fechamento duplicado');

    await db.close();
  });

  test(
      'fecharCaixa sob concorrência: só um fecha, o outro é no-op idempotente (1 sync)',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedCaixaAberto(db, id: sessaoId, patio: patio);
    await seedMovimento(db, id: 'm1', tipo: 'entrada', valor: 50);
    final repo = CaixaRepository(db: db);

    Future<FechamentoResult> fechar() =>
        repo.fecharCaixa(caixaSessaoId: sessaoId, totalContado: 150);

    final rs = await Future.wait([fechar(), fechar()]);

    // Exatamente um efetivou o fechamento; o outro reconhece o no-op.
    expect(rs.where((r) => !r.jaEstavaFechada).length, 1,
        reason: 'um único fechamento efetivo');
    expect(rs.where((r) => r.jaEstavaFechada).length, 1,
        reason: 'o perdedor da corrida é idempotente');
    expect(await contarSync(db, 'caixa_sessao'), 1,
        reason: 'sem sync duplicado');
    final s = await db.caixaDao.getSessaoById(sessaoId);
    expect(s!.totalFechamento, 150);

    await db.close();
  });

  test('fecharCaixa em sessão inexistente lança Exception', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    expect(
      () => CaixaRepository(db: db)
          .fecharCaixa(caixaSessaoId: 'nao-existe', totalContado: 0),
      throwsA(isA<Exception>()),
    );
    await db.close();
  });

  test('abrirCaixa é idempotente sob concorrência: 2 aberturas → mesma sessão',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final repo = CaixaRepository(db: db);

    final ids = await Future.wait([
      repo.abrirCaixa(
          patioId: patio,
          operadorId: 'op1',
          operadorNome: 'Op',
          fundoCaixa: 100),
      repo.abrirCaixa(
          patioId: patio,
          operadorId: 'op1',
          operadorNome: 'Op',
          fundoCaixa: 100),
    ]);

    expect(ids[0], ids[1], reason: 'mesma sessão retornada');
    final aberta = await db.caixaDao.getSessaoAberta(patio, 'op1');
    expect(aberta, isNotNull);
    // Só UMA sessão aberta existe de fato.
    final todas = await db.caixaDao.getSessoesPendentesSync();
    expect(todas.where((s) => s.status == 'aberta').length, 1);

    await db.close();
  });
}
