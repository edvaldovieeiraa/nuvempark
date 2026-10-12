import 'dart:io';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/tickets/data/ticket_repository.dart';

/// A foto de entrada nasce na fila de envio junto com o ticket — é a fila, e
/// não mais o SyncEngine, que decide quando ela sobe.
void main() {
  late AppDatabase db;
  late Directory tmp;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    tmp = Directory.systemTemp.createTempSync('entrada_foto_');
  });
  tearDown(() async {
    await db.close();
    tmp.deleteSync(recursive: true);
  });

  Future<String> entrar({String? foto}) => TicketRepository(db: db).registrarEntrada(
        placa: 'abc1d23',
        tipoVeiculo: 'carro',
        patioId: 'p1',
        operadorId: 'op1',
        fotoEntradaPath: foto,
      );

  test('com foto: linha pendente na fila, com o tamanho do arquivo', () async {
    final arquivo = File('${tmp.path}/placa.jpg')..writeAsBytesSync(List.filled(2048, 7));

    final id = await entrar(foto: arquivo.path);

    final fila = await db.select(db.fotosEnvio).get();
    expect(fila, hasLength(1));
    final f = fila.single;
    expect(f.id, 'entrada-$id');
    expect(f.tipo, 'entrada');
    expect(f.operacaoId, 'p1');
    expect(f.ticketId, id);
    expect(f.caminhoLocal, arquivo.path);
    expect(f.bytes, 2048);
    expect(f.status, 'pendente');
    expect((await db.ticketsDao.getById(id))!.fotoEntradaEnviada, isFalse);
  });

  test('sem foto: nada na fila', () async {
    await entrar();
    expect(await db.select(db.fotosEnvio).get(), isEmpty);
  });

  test('arquivo já ausente: entra na fila com 0 bytes (o envio marca a falha)',
      () async {
    final id = await entrar(foto: '${tmp.path}/nao-existe.jpg');
    final f = (await db.select(db.fotosEnvio).get()).single;
    expect(f.id, 'entrada-$id');
    expect(f.bytes, 0);
  });
}
