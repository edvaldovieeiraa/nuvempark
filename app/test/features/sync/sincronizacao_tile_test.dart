import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/auth/data/token_storage.dart';
import 'package:nuvempark_app/features/sync/data/foto_uploader.dart';
import 'package:nuvempark_app/features/sync/data/sync_engine.dart';
import 'package:nuvempark_app/features/sync/presentation/sincronizacao_tile.dart';
import 'package:nuvempark_app/features/sync/presentation/sync_info_provider.dart';

import '../../support/fakes.dart';

const _mb = 1024 * 1024;

Widget _montar(SyncInfo info) => ProviderScope(
      overrides: [syncInfoProvider.overrideWithValue(AsyncData(info))],
      child: const MaterialApp(home: Scaffold(body: SincronizacaoTile())),
    );

void main() {
  final agora = DateTime.now();

  testWidgets('enviando fotos: texto do progresso e barra', (tester) async {
    await tester.pumpWidget(_montar(SyncInfo(
      pendentes: 0,
      falhos: 0,
      ultimoSync: agora,
      fotosPendentes: 12,
      progresso: FotoProgresso(
          atual: 3, total: 10, bytesEnviados: _mb, bytesTotal: 4 * _mb),
    )));
    expect(find.text('Enviando foto 3 de 10 · 1,0 de 4,0 MB'), findsOneWidget);
    final barra =
        tester.widget<LinearProgressIndicator>(find.byType(LinearProgressIndicator));
    expect(barra.value, closeTo(0.25, 0.001));
  });

  testWidgets('pendentes: registros, fotos e MB; sem barra', (tester) async {
    await tester.pumpWidget(_montar(SyncInfo(
      pendentes: 3,
      falhos: 0,
      ultimoSync: agora,
      fotosPendentes: 12,
      fotosBytes: 5 * _mb,
    )));
    expect(find.textContaining('3 registros e 12 fotos (5,0 MB) aguardando envio'),
        findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
  });

  testWidgets('falhas: convite a reenviar', (tester) async {
    await tester.pumpWidget(_montar(SyncInfo(
        pendentes: 0, falhos: 0, ultimoSync: agora, fotosFalhas: 2)));
    expect(find.text('2 fotos falharam · toque para reenviar'), findsOneWidget);
  });

  testWidgets('em dia', (tester) async {
    await tester.pumpWidget(
        _montar(SyncInfo(pendentes: 0, falhos: 0, ultimoSync: agora)));
    expect(find.textContaining('Tudo em dia'), findsOneWidget);
  });

  group('sincronizarAgora', () {
    test(
        'reabre as falhas de dados e de fotos (menos arquivo ausente), drena '
        'e dispara a rodada de fotos', () async {
      final db = AppDatabase.forTesting(NativeDatabase.memory());
      final tmp = Directory.systemTemp.createTempSync('sync_agora_');
      final storage = TokenStorage(MemSecureStorage());
      await storage.saveTenant(id: 't1', codigo: '1234');
      await storage.savePatioId('p1');

      // Dado que esgotou as tentativas — antes o toque nunca o reabria.
      await seedTicket(db, id: 'X', patio: 'p1');
      await enqueueTicket(db, 'X');
      await db.customStatement("UPDATE sync_log SET status = 'falhou'");

      final arquivo = File('${tmp.path}/a.jpg')..writeAsBytesSync([1]);
      for (final (id, codigo) in [('http', 'http_permanente'), ('sem', 'sem_arquivo')]) {
        await db.fotosEnvioDao.enfileirar(FotosEnvioCompanion.insert(
          id: id,
          tipo: 'avaria',
          operacaoId: 'p1',
          ticketId: 'X',
          caminhoLocal: arquivo.path,
          criadoEm: 1,
          status: const Value('falhou'),
          erroCodigo: Value(codigo),
          tentativas: const Value(1),
        ));
      }

      final pedidosFoto = <String>[];
      final dio = fakeDio((o) {
        if (o.path.contains('/foto')) {
          pedidosFoto.add(o.path);
          throw DioException.connectionError(requestOptions: o, reason: 'off');
        }
        return jsonResponse({'ok': true});
      });

      final r = await sincronizarAgora(
        db: db,
        engine: SyncEngine(db: db, dio: dio, storage: storage),
        uploader: FotoUploader(db: db, dio: dio),
      );
      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(r.synced, 1, reason: 'o item que tinha falhado subiu');
      expect(await db.syncDao.countFalhos(), 0);
      expect(pedidosFoto, isNotEmpty, reason: 'a rodada de fotos foi disparada');
      final status = {
        for (final f in await db.select(db.fotosEnvio).get()) f.id: f.status
      };
      expect(status, {'http': 'pendente', 'sem': 'falhou'});

      await db.close();
      tmp.deleteSync(recursive: true);
    });
  });
}
