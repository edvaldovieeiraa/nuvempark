import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/auth/data/token_storage.dart';
import 'package:nuvempark_app/features/estadias/data/estadia_repository.dart';
import 'package:nuvempark_app/features/sync/data/sync_engine.dart';

import '../../support/fakes.dart';
import 'estadia_repository_test.dart' show hospede;

Future<TokenStorage> _storage() async {
  final s = TokenStorage(MemSecureStorage());
  await s.saveTenant(id: 't1', codigo: '1234');
  await s.savePatioId('p1');
  return s;
}

Future<String> _contratar(AppDatabase db) async {
  await seedCaixaAberto(db, id: 'cx1', patio: 'p1');
  final r = await EstadiaRepository(db: db).contratar(
    patioId: 'p1',
    placa: 'RTO4F21',
    tipoVeiculo: 'carro',
    tarifa: hospede,
    diarias: 3,
    formaPagamento: 'pix',
    caixaSessaoId: 'cx1',
    operadorId: 'op1',
  );
  return r.estadiaId;
}

void main() {
  test('servidor confirma: estadia e pagamento ficam sincronizados', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final id = await _contratar(db);
    final enviados = <String>[];
    final dio = fakeDio((o) {
      enviados.add((o.data as Map)['entidade'] as String);
      return jsonResponse({'ok': true, 'sincronizado_em': '2026-10-09T12:00:00Z'});
    });

    final r = await SyncEngine(db: db, dio: dio, storage: await _storage()).drain();

    expect(r.failed, 0);
    expect(enviados.take(2), ['estadia', 'estadia_pagamento'], reason: 'estadia antes do pagamento');
    expect((await db.estadiasDao.getEstadia(id))!.syncStatus, 'sincronizado');
    expect((await db.estadiasDao.pagamentosDa(id)).single.syncStatus, 'sincronizado');
    await db.close();
  });

  test('503 (estadia ainda não chegou ao servidor): pagamento volta para a fila, não falha', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final id = await _contratar(db);
    final dio = fakeDio((o) {
      final ent = (o.data as Map)['entidade'];
      if (ent == 'estadia_pagamento') {
        return jsonResponse({'error': 'Estadia ainda não sincronizada'}, status: 503);
      }
      return jsonResponse({'ok': true});
    });

    await SyncEngine(db: db, dio: dio, storage: await _storage()).drain();

    expect(await db.syncDao.countFalhos(), 0);
    expect((await db.estadiasDao.pagamentosDa(id)).single.syncStatus, 'pendente');
    await db.close();
  });
}
