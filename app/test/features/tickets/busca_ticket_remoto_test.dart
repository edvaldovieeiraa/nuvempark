import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/tickets/data/ticket_repository.dart';

import '../../support/fakes.dart';

/// O carro entrou pelo aparelho do pátio há segundos: o ciclo de 30s ainda não
/// trouxe o ticket, então a busca do caixa pergunta direto ao servidor.
void main() {
  final remoto = {
    'id': 'R',
    'placa': 'XYZ9A88',
    'tipo_veiculo': 'carro',
    'entrada': '2026-10-06T12:00:00.000Z',
    'operador_id': 'op-patio',
    'origem': 'avulso',
  };

  test('placa ausente no Drift: busca no servidor e grava localmente', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    RequestOptions? pedido;
    final dio = fakeDio((o) {
      pedido = o;
      return jsonResponse({'ticket': remoto});
    });

    final t = await TicketRepository(db: db, dio: dio)
        .ticketAbertoPorPlaca('p1', 'xyz9a88');

    expect(t, isNotNull);
    expect(t!.id, 'R');
    expect(pedido!.queryParameters['placa'], 'XYZ9A88');
    expect(pedido!.queryParameters['patio_id'], 'p1');
    final local = await db.ticketsDao.getById('R');
    expect(local!.syncStatus, 'sincronizado');
    await db.close();
  });

  test('id ausente no Drift (QR de outro aparelho): busca no servidor', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final dio = fakeDio((o) {
      expect(o.queryParameters['id'], 'R');
      return jsonResponse({'ticket': remoto});
    });

    final t = await TicketRepository(db: db, dio: dio)
        .getById('R', patioId: 'p1');

    expect(t, isNotNull);
    expect(t!.placa, 'XYZ9A88');
    await db.close();
  });

  test('servidor fora do ar: devolve null sem lançar', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final dio = fakeDio((_) => throw DioException.connectionError(
          requestOptions: RequestOptions(),
          reason: 'offline',
        ));

    final t = await TicketRepository(db: db, dio: dio)
        .ticketAbertoPorPlaca('p1', 'XYZ9A88');

    expect(t, isNull);
    await db.close();
  });

  test('achou no Drift: não vai à rede', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await seedTicket(db, id: 'L', patio: 'p1');
    final dio = fakeDio((_) => fail('não deveria chamar o servidor'));

    final t = await TicketRepository(db: db, dio: dio)
        .ticketAbertoPorPlaca('p1', 'ABC1D23');

    expect(t!.id, 'L');
    await db.close();
  });
}
