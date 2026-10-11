import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/auth/data/token_storage.dart';
import 'package:nuvempark_app/features/sync/data/foto_uploader.dart';
import 'package:nuvempark_app/features/sync/data/sync_engine.dart';
import 'package:nuvempark_app/features/sync/data/sync_mutex.dart';
import 'package:nuvempark_app/features/tickets/data/tickets_abertos_sync.dart';

import '../../support/fakes.dart';

/// O defeito que motivou a fila de fotos: o envio de fotos segurava a trava
/// dos dados, e um lote grande congelava a lista do pátio e as entradas novas.
/// Aqui uma foto fica presa para sempre e os dados têm de andar mesmo assim.
///
/// Prova a TRAVA, não o objetivo de "lista em ≤ 5 s com o upload saturando um
/// sinal fraco" — isso só o roteiro no aparelho mede.
void main() {
  test('foto presa no envio não segura drain() nem puxar()', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final tmp = Directory.systemTemp.createTempSync('nao_bloqueia_');
    final storage = TokenStorage(MemSecureStorage());
    await storage.saveTenant(id: 't1', codigo: '1234');
    await storage.savePatioId('p1');

    final arquivo = File('${tmp.path}/a.jpg')..writeAsBytesSync([1, 2, 3]);
    await db.fotosEnvioDao.enfileirar(FotosEnvioCompanion.insert(
      id: 'avaria-A-0',
      tipo: 'avaria',
      operacaoId: 'p1',
      ticketId: 'T',
      caminhoLocal: arquivo.path,
      criadoEm: 1,
    ));
    await seedTicket(db, id: 'X', patio: 'p1');
    await enqueueTicket(db, 'X');

    final dio = fakeDio((o) {
      if (o.path.endsWith('/sync')) return jsonResponse({'ok': true});
      final r = jsonResponse({'tickets': <Object>[]});
      r.headers['etag'] = ['"v1"'];
      return r;
    });
    // /foto* fica pendurado — o upload travado num sinal ruim.
    final travado = _Travado(dio.httpClientAdapter);
    dio.httpClientAdapter = travado;

    final mutex = SyncMutex();
    final uploader = FotoUploader(db: db, dio: dio);
    final rodada = uploader.rodada(); // sem await, como no SyncLoop
    await travado.fotoChegou.future;

    final engine = SyncEngine(db: db, dio: dio, storage: storage, mutex: mutex);
    final veiculos = TicketsAbertosSync(db: db, dio: dio, mutex: mutex);

    final r = await engine.drain().timeout(const Duration(seconds: 2));
    expect(r.synced, 1, reason: 'a entrada subiu com a foto presa');
    await veiculos.puxar('p1').timeout(const Duration(seconds: 2));

    uploader.cancelar();
    expect(await rodada, 0);
    final foto = await (db.select(db.fotosEnvio)).getSingle();
    expect((foto.status, foto.tentativas), ('pendente', 0),
        reason: 'cancelada não gasta tentativa');

    await db.close();
    tmp.deleteSync(recursive: true);
  });
}

/// Repassa tudo ao adapter original, menos /foto*, que fica pendurado até
/// a requisição ser cancelada.
class _Travado implements HttpClientAdapter {
  _Travado(this._original);
  final HttpClientAdapter _original;
  final fotoChegou = Completer<void>();

  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<List<int>>? corpo,
      Future<void>? cancelFuture) async {
    if (o.path.contains('/foto')) {
      if (!fotoChegou.isCompleted) fotoChegou.complete();
      await Completer<void>().future; // nunca completa
    }
    return _original.fetch(o, corpo?.cast(), cancelFuture);
  }

  @override
  void close({bool force = false}) {}
}
