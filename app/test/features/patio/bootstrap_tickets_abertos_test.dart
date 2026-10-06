import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/patio/data/bootstrap_repository.dart';

import '../../support/fakes.dart';

/// Tickets abertos do pátio vindos do servidor: é o que deixa o aparelho do
/// caixa enxergar o carro que entrou pelo aparelho do pátio.
void main() {
  Map<String, dynamic> remoto(String id, {String placa = 'XYZ9A88'}) => {
        'id': id,
        'placa': placa,
        'tipo_veiculo': 'carro',
        'entrada': '2026-10-06T12:00:00.000Z',
        'operador_id': 'op-patio',
        'caixa_sessao_id': null,
        'tabela_preco_id': null,
        'cliente_id': null,
        'plano_id': null,
        'origem': 'avulso',
      };

  test('ticket aberto de OUTRO aparelho passa a existir no Drift, já sincronizado',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());

    final dio = fakeDio(
        (_) => jsonResponse(bootstrapPayload(abertos: [remoto('R')])));
    await BootstrapRepository(dio: dio, db: db).sincronizar('p1');

    final r = await db.ticketsDao.getById('R');
    expect(r, isNotNull);
    expect(r!.status, 'aberto');
    expect(r.placa, 'XYZ9A88');
    expect(r.operacaoId, 'p1');
    expect(r.entradaEpoch,
        DateTime.parse('2026-10-06T12:00:00.000Z').millisecondsSinceEpoch);
    expect(r.syncStatus, 'sincronizado', reason: 'não pode voltar pro servidor');
    expect(r.fotoEntradaEnviada, isTrue, reason: 'a foto não é deste aparelho');
    expect(await db.ticketsDao.getAbertoByPlaca('p1', 'XYZ9A88'), isNotNull);

    final futuro = DateTime.now().millisecondsSinceEpoch + 60000;
    expect(await db.syncDao.getPendentes(futuro), isEmpty,
        reason: 'ticket alheio não entra na outbox');
    await db.close();
  });

  test('ticket aberto já sincronizado que o servidor não lista mais sai do Drift',
      () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: 'L', patio: 'p1');
    await db.ticketsDao.marcarSincronizado('L');

    final dio = fakeDio((_) => jsonResponse(bootstrapPayload(abertos: [])));
    await BootstrapRepository(dio: dio, db: db).sincronizar('p1');

    expect(await db.ticketsDao.getById('L'), isNull,
        reason: 'a saída foi dada em outro aparelho');
    await db.close();
  });

  test('ticket aberto que ainda NÃO subiu nunca é apagado', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: 'P', patio: 'p1'); // syncStatus = pendente

    final dio = fakeDio((_) => jsonResponse(bootstrapPayload(abertos: [])));
    await BootstrapRepository(dio: dio, db: db).sincronizar('p1');

    expect(await db.ticketsDao.getById('P'), isNotNull);
    await db.close();
  });

  test('ticket sincronizado com foto ainda por enviar não é apagado', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: 'F', patio: 'p1');
    await db.ticketsDao.atualizar(
      'F',
      const TicketsCompanion(
        fotoEntradaPath: Value('/tmp/F.jpg'),
        fotoEntradaEnviada: Value(false),
        syncStatus: Value('sincronizado'),
      ),
    );

    final dio = fakeDio((_) => jsonResponse(bootstrapPayload(abertos: [])));
    await BootstrapRepository(dio: dio, db: db).sincronizar('p1');

    expect(await db.ticketsDao.getById('F'), isNotNull);
    await db.close();
  });

  test('saída local ainda não enviada não é desfeita pelo servidor', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: 'S', patio: 'p1');
    await db.ticketsDao.atualizar(
      'S',
      const TicketsCompanion(status: Value('fechado')),
    );

    final dio = fakeDio(
        (_) => jsonResponse(bootstrapPayload(abertos: [remoto('S')])));
    await BootstrapRepository(dio: dio, db: db).sincronizar('p1');

    expect((await db.ticketsDao.getById('S'))!.status, 'fechado');
    await db.close();
  });

  test('ticket de outro pátio não é tocado', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: 'O', patio: 'p2');
    await db.ticketsDao.marcarSincronizado('O');

    final dio = fakeDio((_) => jsonResponse(bootstrapPayload(abertos: [])));
    await BootstrapRepository(dio: dio, db: db).sincronizar('p1');

    expect(await db.ticketsDao.getById('O'), isNotNull);
    await db.close();
  });

  test('backend antigo (sem tickets_abertos): nada é apagado', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: 'L', patio: 'p1');
    await db.ticketsDao.marcarSincronizado('L');

    final dio = fakeDio((_) => jsonResponse(bootstrapPayload()));
    await BootstrapRepository(dio: dio, db: db).sincronizar('p1');

    expect(await db.ticketsDao.getById('L'), isNotNull);
    await db.close();
  });
}
