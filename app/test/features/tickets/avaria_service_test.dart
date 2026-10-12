import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart' hide isNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/tickets/data/avaria_service.dart';

void main() {
  late AppDatabase db;
  late Directory tmp;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    tmp = Directory.systemTemp.createTempSync('avaria_');
  });
  tearDown(() async {
    await db.close();
    tmp.deleteSync(recursive: true);
  });

  test(
      'enfileirar(): avaria na outbox e fotos na fila, sem rede (modo avião)',
      () async {
    final f0 = File('${tmp.path}/0.jpg')..writeAsBytesSync(List.filled(300, 1));
    final f1 = File('${tmp.path}/1.jpg')..writeAsBytesSync(List.filled(700, 1));

    // O serviço não tem mais Dio: o caminho crítico da entrada não toca a rede.
    final id = await AvariaService(db: db).enfileirar(
      ticketId: 'T1',
      patioId: 'p1',
      placa: 'ABC1D23',
      descricao: 'risco na porta',
      operadorId: 'op1',
      fotosPaths: [f0.path, f1.path],
    );

    final pendentes =
        await db.syncDao.getPendentes(DateTime.now().millisecondsSinceEpoch);
    expect(pendentes, hasLength(1));
    final item = pendentes.single;
    expect(item.entidade, 'avaria');
    expect(item.entidadeId, id);
    expect(item.operacao, 'create');

    final payload = jsonDecode(item.payload) as Map<String, dynamic>;
    expect(payload['ticket_id'], 'T1');
    expect(payload['descricao'], 'risco na porta');
    // Caminhos previstos no servidor: a avaria sobe com eles mesmo offline.
    expect(payload['fotos'], ['avarias/$id/0.jpg', 'avarias/$id/1.jpg']);

    // As fotos ficam GRAVADAS na fila — antes subiam em memória e se perdiam
    // com o app fechado ou sem sinal.
    final fila = await (db.select(db.fotosEnvio)
          ..orderBy([(f) => OrderingTerm.asc(f.indice)]))
        .get();
    expect(fila, hasLength(2));
    expect(fila.map((f) => f.id), ['avaria-$id-0', 'avaria-$id-1']);
    expect(fila.map((f) => f.indice), [0, 1]);
    expect(fila.map((f) => f.bytes), [300, 700]);
    expect(fila.map((f) => f.caminhoLocal), [f0.path, f1.path]);
    for (final f in fila) {
      expect(f.tipo, 'avaria');
      expect(f.avariaId, id);
      expect(f.ticketId, 'T1');
      expect(f.operacaoId, 'p1');
      expect(f.status, 'pendente');
    }
  });

  test('enfileirar() sem fotos: só a avaria, fila vazia', () async {
    await AvariaService(db: db).enfileirar(
      ticketId: 'T1',
      patioId: 'p1',
      placa: 'ABC1D23',
      descricao: 'arranhão',
      operadorId: 'op1',
      fotosPaths: const [],
    );
    final payload = jsonDecode((await db.syncDao
            .getPendentes(DateTime.now().millisecondsSinceEpoch))
        .single
        .payload) as Map<String, dynamic>;
    expect(payload['fotos'], isEmpty);
    expect(await db.select(db.fotosEnvio).get(), isEmpty);
  });
}
