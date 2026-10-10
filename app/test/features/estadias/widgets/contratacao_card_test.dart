import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/estadias/presentation/entrada_hospede.dart';

import '../estadia_repository_test.dart' show hospede;

void main() {
  Widget card({int diarias = 1, String? bloqueio}) => MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: EstadiaContratacaoCard(
              tarifa: hospede,
              diarias: diarias,
              onDiarias: (_) {},
              formas: const ['dinheiro', 'pix'],
              forma: null,
              onForma: (_) {},
              bloqueio: bloqueio,
            ),
          ),
        ),
      );

  testWidgets('3 diárias de R\$ 30: total R\$ 90,00 e nenhuma forma marcada', (tester) async {
    await tester.pumpWidget(card(diarias: 3));
    expect(find.text('R\$ 90,00'), findsOneWidget);
    expect(find.text('3 × R\$ 30,00'), findsOneWidget);
    expect(find.byIcon(Icons.check), findsNothing);
  });

  testWidgets('"+" trava em 30 diárias', (tester) async {
    await tester.pumpWidget(card(diarias: 30));
    final mais = tester.widget<IconButton>(find.widgetWithIcon(IconButton, Icons.add));
    expect(mais.onPressed, isNull);
  });

  testWidgets('mensalista: só o aviso, sem formas', (tester) async {
    await tester.pumpWidget(card(bloqueio: 'Esta placa já tem livre passagem'));
    expect(find.text('Esta placa já tem livre passagem'), findsOneWidget);
    expect(find.text('Dinheiro'), findsNothing);
  });
}
