import 'dart:io';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';

/// Aparelho em campo com o banco v5 atualiza o app: a migração para a v6
/// (fila de fotos) cria a fila e leva para ela as fotos de entrada que ainda
/// não subiram — sem isso, elas ficariam para trás quando o envio sair do
/// SyncEngine.
void main() {
  test('v5 → v6: fotos de entrada pendentes entram na fila; nada se perde',
      () async {
    final ddl = File('test/fixtures/schema_v5.sql').readAsStringSync();
    final executor = NativeDatabase.memory(setup: (raw) {
      for (final stmt in ddl.split(';\n')) {
        if (stmt.trim().isNotEmpty) raw.execute(stmt);
      }
      void ticket(String id, {String? foto, int enviada = 0, int criado = 1}) =>
          raw.execute(
              'INSERT INTO tickets (id, operacao_id, placa, tipo_veiculo, '
              'entrada_epoch, operador_id, criado_em, atualizado_em, '
              'foto_entrada_path, foto_entrada_enviada) '
              "VALUES ('$id', 'p1', 'ABC1D23', 'carro', 1, 'op1', $criado, 1, "
              "${foto == null ? 'NULL' : "'$foto'"}, $enviada)");
      ticket('pendente', foto: '/fotos/pendente.jpg', criado: 100);
      ticket('enviada', foto: '/fotos/enviada.jpg', enviada: 1);
      ticket('sem-foto');
      raw.execute('PRAGMA user_version = 5');
    });
    final db = AppDatabase.forTesting(executor);

    final fila = await db.select(db.fotosEnvio).get();
    expect(fila, hasLength(1), reason: 'só a foto que ainda não subiu');
    final f = fila.single;
    expect(f.id, 'entrada-pendente');
    expect(f.tipo, 'entrada');
    expect(f.operacaoId, 'p1');
    expect(f.ticketId, 'pendente');
    expect(f.caminhoLocal, '/fotos/pendente.jpg');
    expect(f.status, 'pendente');
    expect(f.bytes, 0, reason: 'medido pelo uploader, não pela migração');
    expect(f.tentativas, 0);
    expect(f.criadoEm, 100, reason: 'herda a ordem do ticket');

    expect(await db.ticketsDao.getById('pendente'), isNotNull);
    expect(await db.ticketsDao.getById('enviada'), isNotNull);
    expect(await db.ticketsDao.getById('sem-foto'), isNotNull);

    final versao = await db.customSelect('PRAGMA user_version').getSingle();
    expect(versao.read<int>('user_version'), 6);
    await db.close();
  });
}
