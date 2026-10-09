import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/core/di/providers.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/auth/data/token_storage.dart';
import 'package:nuvempark_app/features/estadias/presentation/estadia_saida_panel.dart';
import 'package:nuvempark_app/features/sync/data/sync_mutex.dart';
import 'package:nuvempark_app/features/tickets/data/tickets_abertos_sync.dart';
import 'package:nuvempark_app/features/tickets/domain/ticket_model.dart';
import 'package:nuvempark_app/features/tickets/presentation/providers/ticket_provider.dart';

import '../../../support/fakes.dart';
import 'fakes_ui.dart';

void main() {
  late AppDatabase db;
  late TokenStorage storage;

  setUp(() async {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    storage = TokenStorage(MemSecureStorage());
    await storage.savePatioId('p1');
  });
  tearDown(() => db.close());

  TicketModel ticket() => TicketModel(
        id: 't1',
        operacaoId: 'p1',
        placa: 'RTO4F21',
        tipoVeiculo: 'carro',
        entrada: DateTime.now().subtract(const Duration(hours: 2)),
        status: 'aberto',
        operadorId: 'op',
        syncStatus: 'sincronizado',
        estadiaId: 'e1',
      );

  Future<void> montarPainel(WidgetTester tester) async {
    final offline = TicketsAbertosSync(
      db: db,
      dio: fakeDio((_) => throw DioException.connectionError(
          requestOptions: RequestOptions(), reason: 'offline')),
      mutex: SyncMutex(),
    );
    await tester.pumpWidget(montar(
      EstadiaSaidaPanel(ticket: ticket(), patio: patioTeste),
      overrides: [
        appDatabaseProvider.overrideWithValue(db),
        tokenStorageProvider.overrideWithValue(storage),
        ticketsAbertosSyncProvider.overrideWithValue(offline),
      ],
    ));
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
    await tester.pumpAndSettle();
  }

  testWidgets('estadia válida: sem cobrança, só "Confirmar saída"', (tester) async {
    await tester.runAsync(() => db.estadiasDao.inserirEstadia(
        estadiaTeste(validaAte: DateTime.now().add(const Duration(hours: 5))).toCompanion(true)));
    await montarPainel(tester);

    expect(find.text('SEM COBRANÇA'), findsOneWidget);
    expect(find.text('Confirmar saída'), findsOneWidget);
    expect(find.text('Dinheiro'), findsNothing);
  });

  testWidgets('vencida: escolha de intenção sem pré-marcar; formas só depois de "Vai embora"',
      (tester) async {
    await tester.runAsync(() => db.estadiasDao.inserirEstadia(
        estadiaTeste(validaAte: DateTime.now().subtract(const Duration(hours: 2))).toCompanion(true)));
    await montarPainel(tester);

    expect(find.text('Vai embora'), findsOneWidget);
    expect(find.text('Vai continuar hospedado'), findsOneWidget);
    expect(find.text('Dinheiro'), findsNothing);
    expect(find.textContaining('Não deu para conferir'), findsOneWidget,
        reason: 'offline: avisa que a validade não foi conferida');

    await tester.tap(find.text('Vai embora'));
    await tester.pumpAndSettle();
    expect(find.text('Dinheiro'), findsOneWidget);
  });

  testWidgets('estadia ausente no aparelho: bloqueia a cobrança e oferece sincronizar',
      (tester) async {
    await montarPainel(tester);
    expect(find.textContaining('Estadia não encontrada'), findsOneWidget);
    expect(find.text('Sincronizar agora'), findsOneWidget);
  });
}
