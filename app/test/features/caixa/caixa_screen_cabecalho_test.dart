import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/core/theme/brisa.dart';
import 'package:nuvempark_app/features/caixa/domain/caixa_model.dart';
import 'package:nuvempark_app/features/caixa/presentation/caixa_screen.dart';
import 'package:nuvempark_app/features/caixa/presentation/providers/caixa_provider.dart';

/// Sessão que nunca resolve: a tela fica em `loading` e renderiza só o
/// cabeçalho e o spinner — que é exatamente o que estes testes olham, sem
/// arrastar repositório, banco nem impressora para dentro do teste.
class _CaixaCarregando extends CaixaSessaoNotifier {
  @override
  Future<CaixaModel?> build() => Completer<CaixaModel?>().future;
}

Widget _montar({required bool embutida}) => ProviderScope(
      overrides: [
        caixaSessaoNotifierProvider.overrideWith(_CaixaCarregando.new),
      ],
      child: MaterialApp(home: CaixaScreen(embutida: embutida)),
    );

EdgeInsets _paddingDaLista(WidgetTester tester) =>
    tester.widget<ListView>(find.byType(ListView)).padding as EdgeInsets;

void main() {
  group('CaixaScreen — cabeçalho conforme onde ela vive', () {
    // Regressão: a tela é corpo da aba Caixa do MainShell E rota empilhável
    // (`/caixa`). Empilhada a partir de uma saída com o caixa fechado, ela
    // aparecia sem barra do shell e sem voltar próprio — beco sem saída — e
    // ainda reservava embaixo o espaço de uma nav que não estava lá.
    testWidgets('empilhada: tem voltar e NÃO reserva espaço da nav',
        (tester) async {
      await tester.pumpWidget(_montar(embutida: false));

      expect(find.byIcon(Icons.arrow_back), findsOneWidget,
          reason: 'sem isto o operador fica preso na tela');
      expect(_paddingDaLista(tester).bottom, 24,
          reason: 'não há nav embaixo para desviar');
      expect(find.text('Caixa'), findsOneWidget,
          reason: 'só o título do cabeçalho — o da página sai para não duplicar');
    });

    testWidgets('como aba: sem voltar próprio e com a folga da nav',
        (tester) async {
      await tester.pumpWidget(_montar(embutida: true));

      expect(find.byIcon(Icons.arrow_back), findsNothing,
          reason: 'quem navega é a barra do shell');
      expect(_paddingDaLista(tester).bottom, 24 + alturaNavBrisa,
          reason: 'último item não pode parar atrás do vidro da nav');
      expect(find.text('Caixa'), findsOneWidget,
          reason: 'o título grande da página');
    });
  });
}
