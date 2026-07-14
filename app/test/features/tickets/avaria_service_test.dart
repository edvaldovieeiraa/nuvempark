import 'dart:convert';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/tickets/data/avaria_service.dart';

import '../../support/fakes.dart';

void main() {
  test(
      'enfileirar(): grava a avaria na outbox sem tocar na rede (modo avião)',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    // Qualquer requisição aqui é um bug: o caminho crítico da entrada não pode
    // depender de rede. Um dio que explode transforma isso em teste vermelho.
    final dio = fakeDio((o) => throw StateError('rede no caminho crítico: ${o.uri}'));

    final id = await AvariaService(db: db, dio: dio).enfileirar(
      ticketId: 'T1',
      placa: 'ABC1D23',
      descricao: 'risco na porta',
      operadorId: 'op1',
      totalFotos: 2,
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
    // Os caminhos são previstos, não confirmados pelo upload: a avaria sobe com
    // as fotos mesmo tendo sido registrada offline (antes, elas se perdiam).
    expect(payload['fotos'], ['avarias/$id/0.jpg', 'avarias/$id/1.jpg']);

    await db.close();
  });

  test('subirFotos(): foto inexistente não lança nem trava o fluxo', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final dio = fakeDio((o) => throw StateError('não deve subir arquivo ausente'));

    await AvariaService(db: db, dio: dio).subirFotos(
      avariaId: 'A1',
      patioId: 'p1',
      fotosPaths: ['/caminho/que/nao/existe.jpg'],
    );

    await db.close();
  });
}
