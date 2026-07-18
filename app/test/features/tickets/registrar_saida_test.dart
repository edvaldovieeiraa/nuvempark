import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/tickets/data/ticket_repository.dart';

import '../../support/fakes.dart';

/// Executa o future e devolve o resultado OU a exceção capturada — para testar
/// concorrência sem que um erro derrube o Future.wait.
Future<Object?> _capturar(Future<Object?> f) async {
  try {
    return await f;
  } catch (e) {
    return e;
  }
}

void main() {
  const patio = 'p1';
  const ticketId = 't1';
  const sessaoId = 'cx1';
  const valor = 12.5;

  Future<int> contarSync(AppDatabase db, String entidade) async {
    final futuro = DateTime.now().millisecondsSinceEpoch + 60000;
    final pend = await db.syncDao.getPendentes(futuro);
    return pend.where((s) => s.entidade == entidade).length;
  }

  test(
      'saída fecha o ticket e registra a receita no caixa na MESMA transação (2 itens de outbox)',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: ticketId, patio: patio);
    await seedCaixaAberto(db, id: sessaoId, patio: patio);

    final r = await TicketRepository(db: db).registrarSaida(
      ticketId: ticketId,
      valorCalculado: valor,
      valorCobrado: valor,
      formaPagamento: 'dinheiro',
      operadorSaidaId: 'op-saida',
      tabelaPrecoId: 'tp1',
      caixaSessaoId: sessaoId,
      placa: 'ABC1D23',
    );

    expect(r.caixaMovimentoId, isNotNull, reason: 'movimento de caixa criado');

    final ticket = await db.ticketsDao.getById(ticketId);
    expect(ticket!.status, 'fechado');
    expect(ticket.valorCobrado, valor);
    expect(ticket.formaPagamento, 'dinheiro');

    final movs = await db.caixaDao.getMovimentosBySessao(sessaoId);
    expect(movs.length, 1);
    expect(movs.first.tipo, 'entrada');
    expect(movs.first.ticketId, ticketId, reason: 'movimento amarrado ao ticket');
    expect(movs.first.valor, valor);

    final sessao = await db.caixaDao.getSessaoById(sessaoId);
    expect(sessao!.totalEntradas, valor, reason: 'entra no fechamento');

    expect(await contarSync(db, 'ticket'), 1);
    expect(await contarSync(db, 'caixa_movimento'), 1);

    await db.close();
  });

  test(
      'duplo-toque: duas saídas simultâneas do mesmo ticket → UM fechamento e UMA receita',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: ticketId, patio: patio);
    await seedCaixaAberto(db, id: sessaoId, patio: patio);
    final repo = TicketRepository(db: db);

    Future<Object?> saida() => _capturar(repo.registrarSaida(
          ticketId: ticketId,
          valorCalculado: valor,
          valorCobrado: valor,
          formaPagamento: 'dinheiro',
          operadorSaidaId: 'op-saida',
          tabelaPrecoId: 'tp1',
          caixaSessaoId: sessaoId,
          placa: 'ABC1D23',
        ));

    // Disparadas concorrentemente: a segunda encontra o ticket já fechado.
    final rs = await Future.wait([saida(), saida()]);

    final sucessos = rs.whereType<SaidaResult>().toList();
    final erros = rs.where((r) => r is! SaidaResult).toList();
    expect(sucessos.length, 1, reason: 'exatamente uma saída efetivada');
    expect(erros.length, 1);
    expect(erros.first, isA<TicketJaFechadoException>());

    // O essencial: a gaveta NÃO recebeu o dobro.
    final movs = await db.caixaDao.getMovimentosBySessao(sessaoId);
    expect(movs.length, 1, reason: 'sem receita duplicada');
    final sessao = await db.caixaDao.getSessaoById(sessaoId);
    expect(sessao!.totalEntradas, valor, reason: 'total não dobrou');
    expect(await contarSync(db, 'caixa_movimento'), 1);
    expect(await contarSync(db, 'ticket'), 1);

    await db.close();
  });

  test('segunda saída (sequencial) lança TicketJaFechadoException e não duplica',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: ticketId, patio: patio);
    await seedCaixaAberto(db, id: sessaoId, patio: patio);
    final repo = TicketRepository(db: db);

    await repo.registrarSaida(
      ticketId: ticketId,
      valorCalculado: valor,
      valorCobrado: valor,
      formaPagamento: 'dinheiro',
      operadorSaidaId: 'op-saida',
      caixaSessaoId: sessaoId,
      placa: 'ABC1D23',
    );

    expect(
      () => repo.registrarSaida(
        ticketId: ticketId,
        valorCalculado: valor,
        valorCobrado: valor,
        formaPagamento: 'dinheiro',
        operadorSaidaId: 'op-saida',
        caixaSessaoId: sessaoId,
        placa: 'ABC1D23',
      ),
      throwsA(isA<TicketJaFechadoException>()),
    );

    final movs = await db.caixaDao.getMovimentosBySessao(sessaoId);
    expect(movs.length, 1);

    await db.close();
  });

  test('pix dinâmico entra no CAIXA como forma "pix" (não é semCaixa)',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: ticketId, patio: patio);
    await seedCaixaAberto(db, id: sessaoId, patio: patio);

    // É assim que a tela fecha o Pix dinâmico: forma 'pix' + caixa (sem semCaixa).
    final r = await TicketRepository(db: db).registrarSaida(
      ticketId: ticketId,
      valorCalculado: valor,
      valorCobrado: valor,
      formaPagamento: 'pix',
      operadorSaidaId: 'op-saida',
      caixaSessaoId: sessaoId,
      placa: 'ABC1D23',
    );

    expect(r.caixaMovimentoId, isNotNull);
    final movs = await db.caixaDao.getMovimentosBySessao(sessaoId);
    expect(movs.length, 1, reason: 'receita do pix dinâmico entra na gaveta');
    expect(movs.first.formaPagamento, 'pix');
    expect(movs.first.valor, valor);

    await db.close();
  });

  test('saída sem caixa (pix online): fecha o ticket e NÃO cria movimento',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: ticketId, patio: patio);
    await seedCaixaAberto(db, id: sessaoId, patio: patio);

    final r = await TicketRepository(db: db).registrarSaida(
      ticketId: ticketId,
      valorCalculado: valor,
      valorCobrado: valor,
      formaPagamento: 'pix_online',
      operadorSaidaId: 'op-saida',
      // sem caixaSessaoId → não movimenta a gaveta
    );

    expect(r.caixaMovimentoId, isNull);
    final ticket = await db.ticketsDao.getById(ticketId);
    expect(ticket!.status, 'fechado');
    final movs = await db.caixaDao.getMovimentosBySessao(sessaoId);
    expect(movs, isEmpty);
    expect(await contarSync(db, 'caixa_movimento'), 0);
    expect(await contarSync(db, 'ticket'), 1);

    await db.close();
  });

  test('livre passagem (valor 0): fecha sem movimento mesmo com caixa aberto',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: ticketId, patio: patio);
    await seedCaixaAberto(db, id: sessaoId, patio: patio);

    final r = await TicketRepository(db: db).registrarSaida(
      ticketId: ticketId,
      valorCalculado: 0,
      valorCobrado: 0,
      formaPagamento: 'livre_passagem',
      operadorSaidaId: 'op-saida',
      caixaSessaoId: sessaoId,
      placa: 'ABC1D23',
    );

    expect(r.caixaMovimentoId, isNull, reason: 'valor 0 não movimenta caixa');
    final movs = await db.caixaDao.getMovimentosBySessao(sessaoId);
    expect(movs, isEmpty);

    await db.close();
  });

  test('ticket inexistente lança Exception (não TicketJaFechado)', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());

    expect(
      () => TicketRepository(db: db).registrarSaida(
        ticketId: 'nao-existe',
        valorCalculado: valor,
        valorCobrado: valor,
        formaPagamento: 'dinheiro',
        operadorSaidaId: 'op-saida',
      ),
      throwsA(isA<Exception>().having(
          (e) => e is TicketJaFechadoException, 'não é TicketJaFechado', isFalse)),
    );

    await db.close();
  });
}
