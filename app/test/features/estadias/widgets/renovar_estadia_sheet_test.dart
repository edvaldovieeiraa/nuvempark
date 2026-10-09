import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/estadias/presentation/renovar_estadia_sheet.dart';

import 'fakes_ui.dart';

void main() {
  testWidgets('vencida com carro dentro há 30 h: começa no mínimo 2, mostra o motivo, "−" travado',
      (tester) async {
    final vence = DateTime.now().subtract(const Duration(hours: 30));
    await tester.pumpWidget(montar(SingleChildScrollView(
      child: RenovarEstadiaSheet(
        estadia: estadiaTeste(validaAte: vence),
        origem: OrigemRenovacao.saida,
        carroDentro: true,
        ticketId: 't1',
      ),
    )));
    await tester.pumpAndSettle();

    expect(find.text('2'), findsOneWidget);
    expect(find.textContaining('Mínimo 2'), findsOneWidget);
    final menos = tester.widget<IconButton>(find.widgetWithIcon(IconButton, Icons.remove));
    expect(menos.onPressed, isNull);
  });

  testWidgets('sem caixa aberto: faixa de abrir caixa no lugar do botão', (tester) async {
    await tester.pumpWidget(montar(SingleChildScrollView(
      child: RenovarEstadiaSheet(
        estadia: estadiaTeste(validaAte: DateTime.now().add(const Duration(hours: 5))),
        origem: OrigemRenovacao.ficha,
        carroDentro: false,
      ),
    )));
    await tester.pumpAndSettle();

    expect(find.text('Abra o caixa para cobrar a estadia.'), findsOneWidget);
    expect(find.text('Renovar'), findsNothing);
    expect(find.textContaining('Mínimo'), findsNothing, reason: 'mínimo 1 não aparece');
  });
}
