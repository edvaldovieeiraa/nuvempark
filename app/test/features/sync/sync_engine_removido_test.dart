import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/auth/data/token_storage.dart';
import 'package:nuvempark_app/features/sync/data/sync_engine.dart';

import '../../support/fakes.dart';

Future<TokenStorage> _storagePronta() async {
  final s = TokenStorage(MemSecureStorage());
  await s.saveTenant(id: 't1', codigo: '1234');
  await s.savePatioId('p1');
  return s;
}

void main() {
  test(
      'sync 200 {ignorado:true, motivo:removido}: item vira sincronizado, ticket some, sem retry',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final storage = await _storagePronta();
    await seedTicket(db, id: 'X', patio: 'p1');
    await enqueueTicket(db, 'X');

    final dio = fakeDio((o) {
      if (o.uri.path.endsWith('/sync')) {
        return jsonResponse({'ok': true, 'ignorado': true, 'motivo': 'removido'});
      }
      return jsonResponse({'ok': true}); // foto etc.
    });

    final r = await SyncEngine(db: db, dio: dio, storage: storage).drain();

    expect(r.synced, 1);
    expect(r.failed, 0);
    expect(await db.ticketsDao.getById('X'), isNull, reason: 'converge: X some');
    expect(await db.syncDao.countPendentes(), 0, reason: 'nada pendente');
    expect(await db.syncDao.countFalhos(), 0, reason: 'nunca entra em retry');

    await db.close();
  });

  test(
      'sync 200 SEM a flag (regressão): item sincronizado, ticket permanece intocado',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final storage = await _storagePronta();
    await seedTicket(db, id: 'X', patio: 'p1');
    await enqueueTicket(db, 'X');

    final dio = fakeDio((_) => jsonResponse({'ok': true}));

    final r = await SyncEngine(db: db, dio: dio, storage: storage).drain();

    expect(r.synced, 1);
    expect(await db.syncDao.countPendentes(), 0);

    final t = await db.ticketsDao.getById('X');
    expect(t, isNotNull, reason: 'ticket permanece');
    expect(t!.syncStatus, 'sincronizado', reason: 'fluxo atual inalterado');

    await db.close();
  });
}
