import 'dart:io';

import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/auth/data/token_storage.dart';
import 'package:nuvempark_app/features/sync/data/foto_limpeza.dart';

import '../../support/fakes.dart';

const _dia = Duration(days: 1);

void main() {
  late AppDatabase db;
  late Directory tmp;
  late TokenStorage storage;
  var agora = DateTime(2026, 10, 20, 12);

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    tmp = Directory.systemTemp.createTempSync('limpeza_');
    storage = TokenStorage(MemSecureStorage());
    agora = DateTime(2026, 10, 20, 12);
  });
  tearDown(() async {
    await db.close();
    tmp.deleteSync(recursive: true);
  });

  FotoLimpeza limpeza() => FotoLimpeza(db: db, storage: storage, agora: () => agora);

  Future<void> ticket(String id, {Duration? saiuHa}) =>
      db.ticketsDao.inserir(TicketsCompanion.insert(
        id: id,
        operacaoId: 'p1',
        placa: 'ABC1D23',
        tipoVeiculo: 'carro',
        entradaEpoch: 1,
        operadorId: 'op1',
        criadoEm: 1,
        atualizadoEm: 1,
        syncStatus: const Value('sincronizado'),
        status: Value(saiuHa == null ? 'aberto' : 'fechado'),
        saidaEpoch: Value(
            saiuHa == null ? null : agora.subtract(saiuHa).millisecondsSinceEpoch),
      ));

  Future<File> foto(String id, String ticketId,
      {String status = 'enviada', Duration enviadaHa = const Duration(days: 9)}) async {
    final f = File('${tmp.path}/$id.jpg')..writeAsBytesSync([1, 2, 3]);
    await db.fotosEnvioDao.enfileirar(FotosEnvioCompanion.insert(
      id: id,
      tipo: 'entrada',
      operacaoId: 'p1',
      ticketId: ticketId,
      caminhoLocal: f.path,
      criadoEm: 1,
      status: Value(status),
      enviadoEmEpoch: Value(agora.subtract(enviadaHa).millisecondsSinceEpoch),
    ));
    return f;
  }

  Future<FotoEnvio> ler(String id) =>
      (db.select(db.fotosEnvio)..where((f) => f.id.equals(id))).getSingle();

  test('apaga só o arquivo enviado de carro que saiu há 7 dias ou mais',
      () async {
    await ticket('saiu-8d', saiuHa: _dia * 8);
    await ticket('saiu-6d', saiuHa: _dia * 6);
    await ticket('aberto');
    final apagar = await foto('apagar', 'saiu-8d');
    final recente = await foto('recente', 'saiu-6d');
    final aberto = await foto('aberto', 'aberto', enviadaHa: _dia * 30);
    final pendente = await foto('pendente', 'saiu-8d', status: 'pendente');
    final falhou = await foto('falhou', 'saiu-8d', status: 'falhou');
    final orfao = File('${tmp.path}/sem-linha.jpg')..writeAsBytesSync([1]);

    expect(await limpeza().executar(), 1);

    expect(apagar.existsSync(), isFalse);
    expect((await ler('apagar')).arquivoApagadoEmEpoch,
        agora.millisecondsSinceEpoch);
    for (final f in [recente, aberto, pendente, falhou, orfao]) {
      expect(f.existsSync(), isTrue, reason: f.path);
    }
  });

  test('arquivo que já não existe conta como apagado', () async {
    await ticket('saiu', saiuHa: _dia * 8);
    final f = await foto('a', 'saiu');
    f.deleteSync();

    expect(await limpeza().executar(), 1);
    expect((await ler('a')).arquivoApagadoEmEpoch, isNotNull);
  });

  test('remove a linha de quem teve o arquivo apagado há mais de 30 dias',
      () async {
    await ticket('saiu', saiuHa: _dia * 60);
    await foto('a', 'saiu');
    await limpeza().executar(); // apaga hoje

    agora = agora.add(_dia * 31);
    await limpeza().executar();

    expect(await db.select(db.fotosEnvio).get(), isEmpty);
  });

  test('talvezExecutar: no máximo uma vez a cada 24 h', () async {
    await ticket('saiu', saiuHa: _dia * 8);
    await foto('a', 'saiu');
    final l = limpeza();

    expect(await l.talvezExecutar(), 1, reason: 'primeira vez roda');

    await foto('b', 'saiu');
    agora = agora.add(const Duration(hours: 23));
    expect(await l.talvezExecutar(), 0, reason: 'ainda não passou um dia');

    agora = agora.add(const Duration(hours: 2));
    expect(await l.talvezExecutar(), 1, reason: 'passou um dia');
  });

  test('talvezExecutar nunca lança', () async {
    await db.close();
    // Banco fechado: qualquer consulta falha — a limpeza tem de engolir.
    await expectLater(limpeza().talvezExecutar(), completion(0));
    db = AppDatabase.forTesting(NativeDatabase.memory());
  });
}
