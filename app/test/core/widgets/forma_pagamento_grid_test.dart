import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/core/widgets/forma_pagamento_grid.dart';

Widget _app(Widget w) => MaterialApp(home: Scaffold(body: SizedBox(width: 360, child: w)));

void main() {
  testWidgets('mostra as formas do pátio com os rótulos de sempre e nenhuma marcada',
      (tester) async {
    await tester.pumpWidget(_app(FormaPagamentoGrid(
      formas: const ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito'],
      selecionada: null,
      onSelecionar: (_) {},
    )));
    expect(find.text('Dinheiro'), findsOneWidget);
    expect(find.text('Pix (manual)'), findsOneWidget);
    expect(find.text('Cartão de débito'), findsOneWidget);
    expect(find.byIcon(Icons.check), findsNothing);
  });

  testWidgets('tocar escolhe; a escolhida tem check e é anunciada como selecionada',
      (tester) async {
    String? escolhida;
    await tester.pumpWidget(_app(StatefulBuilder(
      builder: (ctx, set) => FormaPagamentoGrid(
        formas: const ['dinheiro', 'pix'],
        selecionada: escolhida,
        onSelecionar: (f) => set(() => escolhida = f),
      ),
    )));

    await tester.tap(find.text('Pix (manual)'));
    await tester.pump();

    expect(escolhida, 'pix');
    expect(find.byIcon(Icons.check), findsOneWidget);
    expect(tester.getSemantics(find.bySemanticsLabel('Pix (manual)')),
        isSemantics(isSelected: true, isButton: true));
    expect(tester.getSemantics(find.bySemanticsLabel('Dinheiro')),
        isSemantics(isSelected: false));
  });

  test('rótulo de forma desconhecida passa como veio', () {
    expect(FormaPagamentoGrid.rotulo('vale'), 'vale');
  });
}
