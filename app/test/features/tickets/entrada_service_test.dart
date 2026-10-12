import 'dart:async';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/estadias/data/estadia_repository.dart';
import 'package:nuvempark_app/features/patio/domain/tarifa_config.dart';
import 'package:nuvempark_app/features/tickets/data/entrada_service.dart';
import 'package:nuvempark_app/features/tickets/data/ticket_repository.dart';

import '../../support/fakes.dart';

final _hospede = TarifaConfig(
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

/// Servidor que nunca responde: a busca de ticket aberto só termina pelo prazo.
class _ServidorMudo implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? s,
          Future<void>? c) =>
      Completer<ResponseBody>().future;

  @override
  void close({bool force = false}) {}
}

void main() {
  late AppDatabase db;
  late DateTime agora;
  late EntradaService servico;
  late EstadiaRepository estadias;

  EntradaService novoServico({Dio? dio}) => EntradaService(
        tickets: TicketRepository(db: db, dio: dio),
        estadias: estadias,
      );

  setUp(() async {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    agora = DateTime(2026, 10, 8, 14, 30);
    estadias = EstadiaRepository(db: db, relogio: () => agora);
    servico = novoServico();
  });
  tearDown(() => db.close());

  Future<void> mensalista(
    String placa, {
    bool bloqueado = false,
    int? vencimentoEpoch,
  }) async {
    await db.into(db.patioClientes).insert(PatioClientesCompanion.insert(
          id: 'cli-$placa',
          operacaoId: 'p1',
          nome: 'Cliente $placa',
          planoId: const Value('plano-1'),
          bloqueado: Value(bloqueado),
          vencimentoEpoch: Value(vencimentoEpoch),
        ));
    await db.into(db.patioClientePlacas).insert(PatioClientePlacasCompanion.insert(
          operacaoId: 'p1',
          placa: placa,
          clienteId: 'cli-$placa',
        ));
  }

  /// Hóspede com estadia contratada e o carro já fora do pátio.
  Future<void> hospedeFora(String placa) async {
    await seedCaixaAberto(db, id: 'cx1', patio: 'p1');
    final r = await estadias.contratar(
      patioId: 'p1',
      placa: placa,
      tipoVeiculo: 'carro',
      tarifa: _hospede,
      diarias: 3,
      formaPagamento: 'pix',
      caixaSessaoId: 'cx1',
      operadorId: 'op1',
    );
    await (db.update(db.tickets)..where((t) => t.id.equals(r.ticketId)))
        .write(const TicketsCompanion(status: Value('fechado')));
  }

  Future<List<Ticket>> abertos() =>
      (db.select(db.tickets)..where((t) => t.status.equals('aberto'))).get();

  Future<EntradaRegistrada> registrar(EntradaLiberada a, {String? foto}) =>
      servico.registrar(
        a,
        patioId: 'p1',
        tipoVeiculo: 'carro',
        tarifaId: 'tar-1',
        operadorId: 'op1',
        fotoEntradaPath: foto,
      );

  Future<Ticket> ticket(String id) =>
      (db.select(db.tickets)..where((t) => t.id.equals(id))).getSingle();

  test('placa desconhecida entra como avulso, com tipo, tabela e foto', () async {
    final a = await servico.analisar(patioId: 'p1', placa: 'abc1d23');
    expect(a, isA<EntradaLiberada>());
    final r = await registrar(a as EntradaLiberada, foto: '/fotos/x.jpg');
    expect(r.origem, 'avulso');
    expect(r.aviso, isNull);
    final t = await ticket(r.ticketId);
    expect((t.placa, t.tipoVeiculo, t.tabelaPrecoId, t.origem, t.fotoEntradaPath),
        ('ABC1D23', 'carro', 'tar-1', 'avulso', '/fotos/x.jpg'));
  });

  test('mensalista com livre passagem entra como plano', () async {
    await mensalista('MEN1A11');
    final a = await servico.analisar(patioId: 'p1', placa: 'MEN1A11');
    final r = await registrar(a as EntradaLiberada);
    expect(r.origem, 'plano');
    expect(r.aviso, isNull);
    final t = await ticket(r.ticketId);
    expect((t.origem, t.clienteId, t.planoId), ('plano', 'cli-MEN1A11', 'plano-1'));
  });

  test('mensalista com plano vencido entra como avulso e devolve o motivo',
      () async {
    await mensalista('VEN1A11',
        vencimentoEpoch: DateTime(2020).millisecondsSinceEpoch);
    final a = await servico.analisar(patioId: 'p1', placa: 'VEN1A11');
    final r = await registrar(a as EntradaLiberada);
    expect(r.origem, 'avulso');
    expect(r.aviso, 'Plano vencido — cobrar avulso');
    expect((await ticket(r.ticketId)).clienteId, isNull,
        reason: 'avulso não fica ligado ao plano');
  });

  test('mensalista bloqueado entra como avulso e devolve o motivo', () async {
    await mensalista('BLO1A11', bloqueado: true);
    final a = await servico.analisar(patioId: 'p1', placa: 'BLO1A11');
    final r = await registrar(a as EntradaLiberada);
    expect(r.origem, 'avulso');
    expect(r.aviso, 'Cliente bloqueado — cobrar avulso');
  });

  test('hóspede com estadia válida entra pela estadia', () async {
    await hospedeFora('RTO4F21');
    agora = agora.add(const Duration(hours: 10));
    final a = await servico.analisar(patioId: 'p1', placa: 'RTO4F21');
    expect((a as EntradaLiberada).hospede, isNotNull);
    final r = await registrar(a);
    expect(r.origem, 'estadia');
    expect((await ticket(r.ticketId)).estadiaId, isNotNull);
  });

  test('hóspede vencido pausa e não grava nada', () async {
    await hospedeFora('RTO4F21');
    agora = agora.add(const Duration(hours: 72 + 19));
    final antes = (await db.select(db.tickets).get()).length;
    final a = await servico.analisar(patioId: 'p1', placa: 'RTO4F21');
    expect(a, isA<EntradaHospedeVencido>());
    expect((await db.select(db.tickets).get()).length, antes);
  });

  test('placa com entrada aberta pausa e não grava nada', () async {
    await seedTicket(db, id: 't-aberto', patio: 'p1'); // placa ABC1D23
    final a = await servico.analisar(patioId: 'p1', placa: 'abc1d23');
    expect(a, isA<EntradaJaNoPatio>());
    expect((a as EntradaJaNoPatio).ticket.id, 't-aberto');
    expect(await abertos(), hasLength(1));
  });

  test('servidor que não responde: vale o resultado local dentro do prazo',
      () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://test.local'))
      ..httpClientAdapter = _ServidorMudo();
    servico = novoServico(dio: dio);
    final relogio = Stopwatch()..start();
    final a = await servico.analisar(
      patioId: 'p1',
      placa: 'NOV1A11',
      prazoServidor: const Duration(milliseconds: 150),
    );
    expect(a, isA<EntradaLiberada>());
    expect(relogio.elapsed, lessThan(const Duration(seconds: 2)));
  });
}
