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
      'ultimo sync guarda o carimbo do SERVIDOR, não o relógio do aparelho',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final storage = await _storagePronta();
    await seedTicket(db, id: 'X', patio: 'p1');
    await enqueueTicket(db, 'X');

    // Servidor responde com um instante bem distante do relógio local: se o
    // engine gravasse DateTime.now(), o teste falharia.
    const doServidor = '2026-07-14T18:30:00.000Z';
    final dio = fakeDio(
      (_) => jsonResponse({'ok': true, 'sincronizado_em': doServidor}),
    );

    await SyncEngine(db: db, dio: dio, storage: storage).drain();

    final salvo = DateTime.parse((await storage.readUltimoSync())!);
    expect(
      salvo.toUtc(),
      DateTime.parse(doServidor).toUtc(),
      reason: 'o painel exibe a hora do servidor; o app tem de exibir a MESMA',
    );

    await db.close();
  });

  test('API antiga (sem o campo) não quebra: cai no relógio local', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final storage = await _storagePronta();
    await seedTicket(db, id: 'X', patio: 'p1');
    await enqueueTicket(db, 'X');

    final antes = DateTime.now();
    final dio = fakeDio((_) => jsonResponse({'ok': true}));

    await SyncEngine(db: db, dio: dio, storage: storage).drain();

    final salvo = DateTime.parse((await storage.readUltimoSync())!);
    expect(salvo.isBefore(antes.subtract(const Duration(minutes: 1))), isFalse);

    await db.close();
  });
}
