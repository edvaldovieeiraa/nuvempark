import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:nuvempark_app/core/router/app_router.dart';
import 'package:nuvempark_app/features/tickets/presentation/navegacao_saida.dart';

/// Rotas no mesmo nível, como no app: é o que faz um `go` para a saída
/// deixá-la sozinha na pilha.
GoRouter _router(String inicial, {required VoidCallback homeDescartada}) =>
    GoRouter(
      initialLocation: inicial,
      routes: [
        GoRoute(
          path: Routes.home,
          builder: (_, _) => _Home(aoDescartar: homeDescartada),
        ),
        GoRoute(
          path: Routes.entrada,
          pageBuilder: (_, state) => _pagina(
            state,
            Builder(
              builder: (context) => Scaffold(
                body: TextButton(
                  onPressed: () => abrirSaidaNoLugarDaEntrada(context, 't1'),
                  child: const Text('ir para saída'),
                ),
              ),
            ),
          ),
        ),
        GoRoute(
          path: '/saida/:id',
          pageBuilder: (_, state) => _pagina(
            state,
            Builder(
              builder: (context) => Scaffold(
                body: Column(children: [
                  Text('saída ${state.pathParameters['id']}'),
                  TextButton(
                    onPressed: () => fecharSaida(context),
                    child: const Text('fechar'),
                  ),
                ]),
              ),
            ),
          ),
        ),
      ],
    );

/// Entrada e saída usam página com transição própria no app (`_brisa`), não
/// o `builder` padrão: o `pushReplacement` tem de funcionar sobre ela.
CustomTransitionPage<void> _pagina(GoRouterState state, Widget child) =>
    CustomTransitionPage<void>(
      key: state.pageKey,
      child: child,
      transitionsBuilder: (_, animacao, _, filho) =>
          FadeTransition(opacity: animacao, child: filho),
    );

/// A home do app é a MainShell: descartá-la para a sincronização e o
/// heartbeat. O teste conta quando isso acontece.
class _Home extends StatefulWidget {
  const _Home({required this.aoDescartar});
  final VoidCallback aoDescartar;

  @override
  State<_Home> createState() => _HomeState();
}

class _HomeState extends State<_Home> {
  @override
  void dispose() {
    widget.aoDescartar();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => const Scaffold(body: Text('home'));
}

void main() {
  testWidgets(
      'da entrada, a saída abre no lugar dela e, ao fechar, volta para a home '
      'sem descartá-la', (tester) async {
    var homeDescartada = 0;
    final router = _router(Routes.home, homeDescartada: () => homeDescartada++);
    addTearDown(router.dispose);
    await tester.pumpWidget(MaterialApp.router(routerConfig: router));

    router.push(Routes.entrada);
    await tester.pumpAndSettle();
    await tester.tap(find.text('ir para saída'));
    await tester.pumpAndSettle();
    expect(find.text('saída t1'), findsOneWidget);
    expect(homeDescartada, 0, reason: 'a home segura a sincronização');

    await tester.tap(find.text('fechar'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('home'), findsOneWidget);
    expect(find.text('ir para saída'), findsNothing,
        reason: 'a entrada não volta: a saída tomou o lugar dela');
    expect(homeDescartada, 0);
  });

  testWidgets('saída sem tela embaixo vai para a home em vez de lançar',
      (tester) async {
    final router = _router('/saida/t1', homeDescartada: () {});
    addTearDown(router.dispose);
    await tester.pumpWidget(MaterialApp.router(routerConfig: router));

    await tester.tap(find.text('fechar'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('home'), findsOneWidget);
  });
}
