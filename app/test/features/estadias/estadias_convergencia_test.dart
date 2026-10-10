import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/estadias/data/estadia_repository.dart';
import 'package:nuvempark_app/features/sync/data/sync_mutex.dart';
import 'package:nuvempark_app/features/tickets/data/tickets_abertos_sync.dart';

import '../../support/fakes.dart';
import 'estadia_repository_test.dart' show hospede;

/// O ciclo de 5 s também traz as estadias: a contratada em outro aparelho, a
/// renovada em outro aparelho e os pagamentos (a ficha precisa deles).
void main() {
  Map<String, dynamic> estadiaJson({
    String id = 'eR',
    String validaAte = '2026-10-11T17:30:00Z',
    int diarias = 3,
    double total = 90,
    List<Map<String, dynamic>> pagamentos = const [],
  }) =>
      {
        'id': id,
        'placa': 'RTO4F21',
        'tipo_veiculo': 'carro',
        'tarifa_id': 'tar-hosp',
        'diaria_valor': '30.00',
        'diaria_horas': 24,
        'inicio': '2026-10-08T17:30:00+00:00',
        'valida_ate': validaAte,
        'diarias': diarias,
        'valor_total': total,
        'pagamentos': pagamentos,
      };

  final pgContratacao = {
    'id': 'pg0',
    'tipo': 'contratacao',
    'diarias': 3,
    'valor': 90,
    'forma_pagamento': 'pix',
    'pago_em': '2026-10-08T17:30:00+00:00',
  };

  Dio resposta(List<Map<String, dynamic>>? estadias) => fakeDio((_) {
        final r = jsonResponse({'tickets': <dynamic>[], 'estadias': ?estadias});
        r.headers['etag'] = ['"x${estadias.hashCode}"'];
        return r;
      });

  TicketsAbertosSync sync(AppDatabase db, Dio dio) =>
      TicketsAbertosSync(db: db, dio: dio, mutex: SyncMutex());

  test('estadia de outro aparelho chega com os pagamentos, já sincronizada', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());

    final mudou = await sync(db, resposta([estadiaJson(pagamentos: [pgContratacao])])).puxar('p1');

    expect(mudou, isTrue);
    final e = (await db.estadiasDao.getEstadia('eR'))!;
    expect(e.operacaoId, 'p1');
    expect(e.diariaValor, 30);
    expect(e.validaAteEpoch, DateTime.parse('2026-10-11T17:30:00Z').millisecondsSinceEpoch);
    expect(e.syncStatus, 'sincronizado');
    final pg = (await db.estadiasDao.pagamentosDa('eR')).single;
    expect(pg.formaPagamento, 'pix');
    expect(pg.syncStatus, 'sincronizado');
    await db.close();
  });

  test('renovação feita em outro aparelho atualiza o vencimento local', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await sync(db, resposta([estadiaJson()])).puxar('p1');

    final mudou = await sync(
      db,
      resposta([estadiaJson(validaAte: '2026-10-12T17:30:00Z', diarias: 4, total: 120)]),
    ).puxar('p1');

    expect(mudou, isTrue);
    final e = (await db.estadiasDao.getEstadia('eR'))!;
    expect(e.validaAteEpoch, DateTime.parse('2026-10-12T17:30:00Z').millisecondsSinceEpoch);
    expect(e.diarias, 4);
    await db.close();
  });

  test('renovação local ainda não enviada não é desfeita pelo servidor', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedCaixaAberto(db, id: 'cx1', patio: 'p1');
    final repo = EstadiaRepository(db: db);
    final r = await repo.contratar(
      patioId: 'p1',
      placa: 'RTO4F21',
      tipoVeiculo: 'carro',
      tarifa: hospede,
      diarias: 1,
      formaPagamento: 'pix',
      caixaSessaoId: 'cx1',
      operadorId: 'op1',
    );
    await repo.renovar(
      estadiaId: r.estadiaId,
      diarias: 2,
      formaPagamento: 'pix',
      caixaSessaoId: 'cx1',
      operadorId: 'op1',
      carroDentro: true,
    );
    final local = (await db.estadiasDao.getEstadia(r.estadiaId))!;

    // O servidor ainda só conhece a contratação (1 diária).
    final antigo = DateTime.fromMillisecondsSinceEpoch(local.inicioEpoch)
        .add(const Duration(hours: 24))
        .toUtc()
        .toIso8601String();
    await sync(db, resposta([estadiaJson(id: r.estadiaId, validaAte: antigo, diarias: 1, total: 30)]))
        .puxar('p1');

    final depois = (await db.estadiasDao.getEstadia(r.estadiaId))!;
    expect(depois.validaAteEpoch, local.validaAteEpoch);
    expect(depois.diarias, 3);
    await db.close();
  });

  test('API sem o campo estadias: nada muda', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await sync(db, resposta([estadiaJson()])).puxar('p1');

    final mudou = await sync(db, resposta(null)).puxar('p1');

    expect(mudou, isFalse);
    expect(await db.estadiasDao.getEstadia('eR'), isNotNull);
    await db.close();
  });

  test('mesma lista de novo: nada mudou', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await sync(db, resposta([estadiaJson(pagamentos: [pgContratacao])])).puxar('p1');
    final mudou = await sync(db, resposta([estadiaJson(pagamentos: [pgContratacao])])).puxar('p1');
    expect(mudou, isFalse);
    await db.close();
  });
}
