import 'package:dio/dio.dart';
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
      'HTTP 200 com corpo não-JSON (desafio de proxy) NÃO conta como sucesso',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final storage = await _storagePronta();
    await seedTicket(db, id: 'X', patio: 'p1');
    await enqueueTicket(db, 'X');

    // Cloudflare/proxy pode responder 200 com uma página HTML de desafio em vez
    // do JSON da API. `body` vem como String — jamais pode virar "sincronizado".
    final dio = fakeDio(
      (_) => ResponseBody.fromString(
        '<!DOCTYPE html><html><body>Checking your browser…</body></html>',
        200,
        headers: {
          Headers.contentTypeHeader: const ['text/html'],
        },
      ),
    );

    final r = await SyncEngine(db: db, dio: dio, storage: storage).drain();

    expect(r.synced, 0, reason: 'resposta não-JSON não pode virar sucesso');
    expect(r.failed, 1);
    // Sem carimbo de "sincronizado": o item continua na fila para reenvio.
    expect(await storage.readUltimoSync(), isNull);

    await db.close();
  });

  test('HTTP 200 com JSON sem ok:true também é rejeitado', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final storage = await _storagePronta();
    await seedTicket(db, id: 'Y', patio: 'p1');
    await enqueueTicket(db, 'Y');

    // JSON válido, mas não o contrato da API (nenhum ok:true).
    final dio = fakeDio((_) => jsonResponse({'mensagem': 'quem sou eu?'}));

    final r = await SyncEngine(db: db, dio: dio, storage: storage).drain();

    expect(r.synced, 0);
    expect(r.failed, 1);
    expect(await storage.readUltimoSync(), isNull);

    await db.close();
  });
}
