import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/auth/presentation/screens/login_screen.dart';
import 'package:nuvempark_app/features/auth/presentation/widgets/sem_acesso_card.dart';

Widget _app(Widget w) =>
    MaterialApp(home: Scaffold(body: SingleChildScrollView(child: w)));

void main() {
  testWidgets('orienta o operador a pedir o acesso ao gerente', (tester) async {
    await tester.pumpWidget(_app(const SemAcessoCard()));

    expect(find.text('Ainda não tem acesso?'), findsOneWidget);
    expect(find.text('Sou operador'), findsOneWidget);
    expect(find.textContaining('Peça ao gerente'), findsOneWidget);
    expect(find.text('Tenho um estacionamento'), findsOneWidget);
  });

  testWidgets('no Android mostra o botão de criar conta no site', (tester) async {
    await tester.pumpWidget(_app(const SemAcessoCard()));

    expect(find.text('Criar conta grátis'), findsOneWidget);
    expect(find.textContaining('15 dias grátis'), findsOneWidget);
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('no iOS só informa o site, sem botão e sem falar em teste grátis '
      '(diretriz 3.1.1 da Apple)', (tester) async {
    await tester.pumpWidget(_app(const SemAcessoCard()));

    expect(find.text('Criar conta grátis'), findsNothing);
    expect(find.byType(OutlinedButton), findsNothing);
    expect(find.textContaining('grátis'), findsNothing);
    expect(find.textContaining('nuvempark.com'), findsOneWidget);
  }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));

  testWidgets('se o navegador não abrir, avisa com o endereço por escrito',
      (tester) async {
    // O canal do url_launcher responde "não abriu", como num aparelho sem
    // navegador.
    const canal = MethodChannel('plugins.flutter.io/url_launcher');
    tester.binding.defaultBinaryMessenger
        .setMockMethodCallHandler(canal, (_) async => false);
    addTearDown(() =>
        tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(canal, null));

    await tester.pumpWidget(_app(const SemAcessoCard()));
    await tester.tap(find.text('Criar conta grátis'));
    await tester.pumpAndSettle();

    expect(find.textContaining('nuvempark.com/cadastro'), findsOneWidget);
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('a tela de login traz o cartão', (tester) async {
    await tester.pumpWidget(
        const ProviderScope(child: MaterialApp(home: LoginScreen())));

    expect(find.byType(SemAcessoCard), findsOneWidget);
  });

  test('o link do cadastro identifica que veio do app Android', () {
    expect(SemAcessoCard.urlCadastro.toString(),
        'https://nuvempark.com/cadastro?utm_source=app_android');
  });
}
