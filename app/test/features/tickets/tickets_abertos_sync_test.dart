import 'dart:async';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/sync/data/sync_mutex.dart';
import 'package:nuvempark_app/features/tickets/data/tickets_abertos_sync.dart';

import '../../support/fakes.dart';

/// Ciclo rápido dos veículos no pátio: é o que deixa o aparelho do caixa
/// enxergar, em segundos, o carro que entrou pelo aparelho do pátio.
void main() {
  Map<String, dynamic> remoto(String id, {String placa = 'XYZ9A88'}) => {
        'id': id,
        'placa': placa,
        'tipo_veiculo': 'carro',
        'entrada': '2026-10-06T12:00:00.000Z',
        'operador_id': 'op-patio',
        'caixa_sessao_id': null,
        'tabela_preco_id': null,
        'cliente_id': null,
        'plano_id': null,
        'origem': 'avulso',
      };

  ResponseBody lista(List<Map<String, dynamic>> tickets, {String etag = '"v1"'}) {
    final r = jsonResponse({'tickets': tickets});
    r.headers['etag'] = [etag];
    return r;
  }

  TicketsAbertosSync sync(AppDatabase db, Dio dio) =>
      TicketsAbertosSync(db: db, dio: dio, mutex: SyncMutex());

  test('ticket aberto de OUTRO aparelho passa a existir no Drift, já sincronizado',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());

    final mudou = await sync(db, fakeDio((_) => lista([remoto('R')]))).puxar('p1');

    expect(mudou, isTrue);
    final r = await db.ticketsDao.getById('R');
    expect(r, isNotNull);
    expect(r!.status, 'aberto');
    expect(r.placa, 'XYZ9A88');
    expect(r.operacaoId, 'p1');
    expect(r.entradaEpoch,
        DateTime.parse('2026-10-06T12:00:00.000Z').millisecondsSinceEpoch);
    expect(r.syncStatus, 'sincronizado', reason: 'não pode voltar pro servidor');
    expect(r.fotoEntradaEnviada, isTrue, reason: 'a foto não é deste aparelho');

    final futuro = DateTime.now().millisecondsSinceEpoch + 60000;
    expect(await db.syncDao.getPendentes(futuro), isEmpty,
        reason: 'ticket alheio não entra na outbox');
    await db.close();
  });

  test('ticket aberto já sincronizado que o servidor não lista mais sai do Drift',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: 'L', patio: 'p1');
    await db.ticketsDao.marcarSincronizado('L');

    final mudou = await sync(db, fakeDio((_) => lista([]))).puxar('p1');

    expect(mudou, isTrue);
    expect(await db.ticketsDao.getById('L'), isNull,
        reason: 'a saída foi dada em outro aparelho');
    await db.close();
  });

  test('ticket aberto que ainda NÃO subiu nunca é apagado', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: 'P', patio: 'p1'); // syncStatus = pendente

    await sync(db, fakeDio((_) => lista([]))).puxar('p1');

    expect(await db.ticketsDao.getById('P'), isNotNull);
    await db.close();
  });

  test('ticket sincronizado com foto ainda por enviar não é apagado', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: 'F', patio: 'p1');
    await db.ticketsDao.atualizar(
      'F',
      const TicketsCompanion(
        fotoEntradaPath: Value('/tmp/F.jpg'),
        fotoEntradaEnviada: Value(false),
        syncStatus: Value('sincronizado'),
      ),
    );

    await sync(db, fakeDio((_) => lista([]))).puxar('p1');

    expect(await db.ticketsDao.getById('F'), isNotNull);
    await db.close();
  });

  test('saída local ainda não enviada não é desfeita pelo servidor', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: 'S', patio: 'p1');
    await db.ticketsDao.atualizar(
      'S',
      const TicketsCompanion(status: Value('fechado')),
    );

    await sync(db, fakeDio((_) => lista([remoto('S')]))).puxar('p1');

    expect((await db.ticketsDao.getById('S'))!.status, 'fechado');
    await db.close();
  });

  test('ticket de outro pátio não é tocado', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: 'O', patio: 'p2');
    await db.ticketsDao.marcarSincronizado('O');

    await sync(db, fakeDio((_) => lista([]))).puxar('p1');

    expect(await db.ticketsDao.getById('O'), isNotNull);
    await db.close();
  });

  test('nada mudou no servidor: manda o ETag, recebe 304 e não mexe em nada',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final enviados = <String?>[];
    var chamada = 0;
    final dio = fakeDio((o) {
      enviados.add(o.headers['If-None-Match'] as String?);
      chamada++;
      if (chamada == 1) return lista([remoto('R')], etag: 'W/"v1"');
      return ResponseBody.fromString('', 304);
    });
    final s = sync(db, dio);

    expect(await s.puxar('p1'), isTrue);
    expect(await s.puxar('p1'), isFalse);

    expect(enviados, [null, 'W/"v1"']);
    expect(await db.ticketsDao.getById('R'), isNotNull);
    await db.close();
  });

  test('lista igual à local: responde que nada mudou', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final s = sync(db, fakeDio((_) => lista([remoto('R')])));

    expect(await s.puxar('p1'), isTrue);
    expect(await s.puxar('p1'), isFalse);
    await db.close();
  });

  test('servidor fora do ar ou rota inexistente: não lança e não apaga nada',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: 'L', patio: 'p1');
    await db.ticketsDao.marcarSincronizado('L');

    final offline = fakeDio((_) => throw DioException.connectionError(
          requestOptions: RequestOptions(),
          reason: 'offline',
        ));
    expect(await sync(db, offline).puxar('p1'), isFalse);

    final semRota = fakeDio((_) => jsonResponse({'error': 'x'}, status: 404));
    expect(await sync(db, semRota).puxar('p1'), isFalse);

    expect(await db.ticketsDao.getById('L'), isNotNull);
    await db.close();
  });

  test('a leitura espera o envio em curso terminar (trava compartilhada)',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final mutex = SyncMutex();
    final liberaEnvio = Completer<void>();
    final ordem = <String>[];

    final envio = mutex.exclusivo(() async {
      ordem.add('envio:inicio');
      await liberaEnvio.future;
      ordem.add('envio:fim');
    });
    final leitura = TicketsAbertosSync(
      db: db,
      dio: fakeDio((_) {
        ordem.add('leitura');
        return lista([]);
      }),
      mutex: mutex,
    ).puxar('p1');

    await Future<void>.delayed(const Duration(milliseconds: 20));
    expect(ordem, ['envio:inicio']);
    liberaEnvio.complete();
    await Future.wait([envio, leitura]);
    expect(ordem, ['envio:inicio', 'envio:fim', 'leitura']);
    await db.close();
  });
}
