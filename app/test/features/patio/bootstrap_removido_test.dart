import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/patio/data/bootstrap_repository.dart';

import '../../support/fakes.dart';

void main() {
  test(
      'bootstrap com tickets_removidos=[X]: apaga X do Drift + limpa a outbox de X; Y permanece',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: 'X', patio: 'p1');
    await seedTicket(db, id: 'Y', patio: 'p1');
    await enqueueTicket(db, 'X');
    await enqueueTicket(db, 'Y');

    final dio = fakeDio((_) => jsonResponse(bootstrapPayload(removidos: ['X'])));
    await BootstrapRepository(dio: dio, db: db).sincronizar('p1');

    expect(await db.ticketsDao.getById('X'), isNull, reason: 'X deve sumir');
    expect(await db.ticketsDao.getById('Y'), isNotNull, reason: 'Y permanece');

    final futuro = DateTime.now().millisecondsSinceEpoch + 60000;
    final pendentes = await db.syncDao.getPendentes(futuro);
    expect(
      pendentes.where((s) => s.entidadeId == 'X'),
      isEmpty,
      reason: 'outbox de X limpa',
    );
    expect(
      pendentes.where((s) => s.entidadeId == 'Y'),
      isNotEmpty,
      reason: 'outbox de Y intacta',
    );

    await db.close();
  });

  test('bootstrap SEM o campo tickets_removidos (backend antigo): não quebra',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: 'X', patio: 'p1');

    final dio = fakeDio((_) => jsonResponse(bootstrapPayload())); // sem o campo
    await BootstrapRepository(dio: dio, db: db).sincronizar('p1');

    expect(await db.ticketsDao.getById('X'), isNotNull);
    await db.close();
  });
}
