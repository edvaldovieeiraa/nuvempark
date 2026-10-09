import 'dart:convert';

import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/estadias/data/estadia_repository.dart';
import 'package:nuvempark_app/features/patio/domain/tarifa_config.dart';

import '../../support/fakes.dart';

final hospede = TarifaConfig(
  id: 'tar-hosp',
  operacaoId: 'p1',
  nome: 'Hóspede (diária)',
  tipoVeiculo: 'carro',
  ordem: 0,
  visivelOperador: true,
  fracaoInicialMinutos: 15,
  fracaoInicialValor: 5,
  fracaoAdicionalMinutos: 15,
  fracaoAdicionalValor: 3,
  tetoDiaria: 60,
  toleranciaMinutos: 10,
  pernoiteValor: 0,
  pernoiteHoraInicio: 22,
  pernoiteHoraFim: 6,
  vigenciaInicio: DateTime(2020),
  modalidade: 'hospede',
  diariaValor: 30,
  diariaHoras: 24,
);

final t0 = DateTime(2026, 10, 8, 14, 30);

Future<List<SyncLogData>> _outbox(AppDatabase db) =>
    db.syncDao.getPendentes(DateTime(2100).millisecondsSinceEpoch);

void main() {
  late AppDatabase db;
  late DateTime agora;
  late EstadiaRepository repo;

  setUp(() async {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    agora = t0;
    repo = EstadiaRepository(db: db, relogio: () => agora);
    await seedCaixaAberto(db, id: 'cx1', patio: 'p1');
  });
  tearDown(() => db.close());

  Future<String> contratar({int diarias = 3, String placa = 'RTO4F21'}) async {
    final r = await repo.contratar(
      patioId: 'p1',
      placa: placa,
      tipoVeiculo: 'carro',
      tarifa: hospede,
      diarias: diarias,
      formaPagamento: 'pix',
      caixaSessaoId: 'cx1',
      operadorId: 'op1',
    );
    return r.estadiaId;
  }

  group('contratar', () {
    test('estadia + pagamento + caixa + ticket de entrada, numa transação, 4 itens na outbox em ordem',
        () async {
      final estadiaId = await contratar();

      final e = (await db.estadiasDao.getEstadia(estadiaId))!;
      expect(e.placa, 'RTO4F21');
      expect(e.inicioEpoch, t0.millisecondsSinceEpoch);
      expect(e.validaAteEpoch, t0.add(const Duration(hours: 72)).millisecondsSinceEpoch);
      expect(e.diarias, 3);
      expect(e.valorTotal, 90);
      expect(e.diariaValor, 30, reason: 'preço congelado na estadia');

      final pg = (await db.estadiasDao.pagamentosDa(estadiaId)).single;
      expect(pg.tipo, 'contratacao');
      expect(pg.valor, 90);
      expect(pg.formaPagamento, 'pix');

      final mov = (await db.caixaDao.getMovimentosBySessao('cx1')).single;
      expect(mov.id, pg.caixaMovimentoId);
      expect(mov.estadiaPagamentoId, pg.id);
      expect(mov.ticketId, isNull);
      expect(mov.valor, 90);
      expect((await db.caixaDao.getSessaoById('cx1'))!.totalEntradas, 90);

      final ticket = (await db.ticketsDao.getAbertoByPlaca('p1', 'RTO4F21'))!;
      expect(ticket.origem, 'estadia');
      expect(ticket.estadiaId, estadiaId);
      expect(ticket.entradaEpoch, t0.millisecondsSinceEpoch);

      final out = await _outbox(db);
      expect(out.map((s) => s.entidade),
          ['estadia', 'estadia_pagamento', 'caixa_movimento', 'ticket']);
      final payloadPg = jsonDecode(out[1].payload) as Map<String, dynamic>;
      expect(payloadPg['tipo'], 'contratacao');
      expect(payloadPg['estadia_id'], estadiaId);
      expect(payloadPg, isNot(contains('operacao_id')));
    });

    test('caixa fechado: nada é gravado', () async {
      await db.caixaDao.atualizarSessao(
          'cx1', const CaixaSessoesCompanion(status: Value('fechada')));
      await expectLater(contratar(), throwsA(isA<CaixaFechadoException>()));
      expect(await _outbox(db), isEmpty);
      expect(await db.ticketsDao.getAbertoByPlaca('p1', 'RTO4F21'), isNull);
    });

    test('placa já hóspede com estadia válida: recusa (o caminho é renovar)', () async {
      await contratar();
      await expectLater(contratar(), throwsA(isA<EstadiaJaAtivaException>()));
    });
  });

  group('renovar', () {
    test('estadia válida: estende do vencimento; pagamento e caixa', () async {
      final id = await contratar();
      agora = t0.add(const Duration(hours: 10));

      await repo.renovar(
        estadiaId: id,
        diarias: 2,
        formaPagamento: 'dinheiro',
        caixaSessaoId: 'cx1',
        operadorId: 'op1',
        carroDentro: true,
      );

      final e = (await db.estadiasDao.getEstadia(id))!;
      expect(e.validaAteEpoch, t0.add(const Duration(hours: 120)).millisecondsSinceEpoch);
      expect(e.diarias, 5);
      expect(e.valorTotal, 150);
      final pg = (await db.estadiasDao.pagamentosDa(id)).last;
      expect(pg.tipo, 'renovacao');
      expect(pg.baseEpoch, t0.add(const Duration(hours: 72)).millisecondsSinceEpoch);
      expect((await db.caixaDao.getSessaoById('cx1'))!.totalEntradas, 150);
    });

    test('vencida com carro dentro há 30 h: 1 diária não cobre → recusa', () async {
      final id = await contratar();
      agora = t0.add(const Duration(hours: 72 + 30));
      await expectLater(
        repo.renovar(
          estadiaId: id,
          diarias: 1,
          formaPagamento: 'pix',
          caixaSessaoId: 'cx1',
          operadorId: 'op1',
          carroDentro: true,
        ),
        throwsA(isA<DiariasInsuficientesException>()),
      );
    });

    test('renovarESair: renova do vencimento e fecha o ticket a R\$ 0 sem outro movimento',
        () async {
      final id = await contratar();
      final ticket = (await db.ticketsDao.getAbertoByPlaca('p1', 'RTO4F21'))!;
      agora = t0.add(const Duration(hours: 77));

      await repo.renovarESair(
        estadiaId: id,
        ticketId: ticket.id,
        diarias: 1,
        formaPagamento: 'pix',
        caixaSessaoId: 'cx1',
        operadorId: 'op1',
      );

      final e = (await db.estadiasDao.getEstadia(id))!;
      expect(e.validaAteEpoch, t0.add(const Duration(hours: 96)).millisecondsSinceEpoch);
      final fechado = (await db.ticketsDao.getById(ticket.id))!;
      expect(fechado.status, 'fechado');
      expect(fechado.valorCobrado, 0);
      expect(fechado.formaPagamento, 'hospede');
      expect((await db.caixaDao.getMovimentosBySessao('cx1')).length, 2,
          reason: 'contratação + renovação; a saída a R\$ 0 não mexe no caixa');
    });

    test('renovarEEntrar: carro fora, vencida → conta de agora e cria o ticket', () async {
      final id = await contratar();
      final ticket = (await db.ticketsDao.getAbertoByPlaca('p1', 'RTO4F21'))!;
      // o carro saiu dentro do prazo
      await db.ticketsDao.atualizar(
          ticket.id, const TicketsCompanion(status: Value('fechado')));
      agora = t0.add(const Duration(hours: 72 + 19));

      await repo.renovarEEntrar(
        estadiaId: id,
        diarias: 1,
        formaPagamento: 'pix',
        caixaSessaoId: 'cx1',
        operadorId: 'op1',
      );

      final e = (await db.estadiasDao.getEstadia(id))!;
      expect(e.validaAteEpoch, agora.add(const Duration(hours: 24)).millisecondsSinceEpoch);
      final novo = (await db.ticketsDao.getAbertoByPlaca('p1', 'RTO4F21'))!;
      expect(novo.estadiaId, id);
      expect(novo.entradaEpoch, agora.millisecondsSinceEpoch);
    });
  });

  group('converterTicket', () {
    test('ticket avulso aberto vira estadia contada da entrada', () async {
      final entrada = t0;
      await db.ticketsDao.inserir(TicketsCompanion.insert(
        id: 'tk1',
        operacaoId: 'p1',
        placa: 'QAB2C34',
        tipoVeiculo: 'carro',
        entradaEpoch: entrada.millisecondsSinceEpoch,
        operadorId: 'op1',
        criadoEm: 0,
        atualizadoEm: 0,
      ));
      agora = entrada.add(const Duration(hours: 3, minutes: 20));

      final r = await repo.converterTicket(
        ticketId: 'tk1',
        tarifa: hospede,
        diarias: 1,
        formaPagamento: 'dinheiro',
        caixaSessaoId: 'cx1',
        operadorId: 'op1',
      );

      final e = (await db.estadiasDao.getEstadia(r.estadiaId))!;
      expect(e.inicioEpoch, entrada.millisecondsSinceEpoch);
      expect(e.validaAteEpoch, entrada.add(const Duration(hours: 24)).millisecondsSinceEpoch);
      final t = (await db.ticketsDao.getById('tk1'))!;
      expect(t.origem, 'estadia');
      expect(t.estadiaId, r.estadiaId);
      final upd = (await _outbox(db)).firstWhere((s) => s.entidade == 'ticket');
      expect(upd.operacao, 'update');
      final payload = jsonDecode(upd.payload) as Map<String, dynamic>;
      expect(payload['estadia_id'], r.estadiaId);
      expect(payload['origem'], 'estadia');
    });

    test('diárias que não cobrem desde a entrada: recusa', () async {
      await db.ticketsDao.inserir(TicketsCompanion.insert(
        id: 'tk2',
        operacaoId: 'p1',
        placa: 'QAB2C34',
        tipoVeiculo: 'carro',
        entradaEpoch: t0.millisecondsSinceEpoch,
        operadorId: 'op1',
        criadoEm: 0,
        atualizadoEm: 0,
      ));
      agora = t0.add(const Duration(hours: 26));
      await expectLater(
        repo.converterTicket(
          ticketId: 'tk2',
          tarifa: hospede,
          diarias: 1,
          formaPagamento: 'pix',
          caixaSessaoId: 'cx1',
          operadorId: 'op1',
        ),
        throwsA(isA<DiariasInsuficientesException>()),
      );
    });
  });

  group('reconhecerHospede', () {
    test('válida, vencida há até 7 dias e vencida há mais', () async {
      await contratar();

      agora = t0.add(const Duration(hours: 10));
      var r = await repo.reconhecerHospede('p1', 'rto4f21');
      expect(r?.situacao, SituacaoHospede.valida);

      agora = t0.add(const Duration(hours: 72 + 19));
      r = await repo.reconhecerHospede('p1', 'RTO4F21');
      expect(r?.situacao, SituacaoHospede.vencidaRecente);

      agora = t0.add(const Duration(days: 3 + 8));
      expect(await repo.reconhecerHospede('p1', 'RTO4F21'), isNull);
    });
  });
}
