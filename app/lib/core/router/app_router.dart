import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/revogado_screen.dart';
import '../../features/auth/presentation/screens/nao_vinculado_screen.dart';
import '../../features/patio/presentation/patio_select_screen.dart';
import '../../features/shell/main_shell.dart';
import '../../features/tickets/presentation/entrada_screen.dart';
import '../../features/tickets/presentation/saida_screen.dart';
import '../../features/tickets/presentation/movimentos_screen.dart';
import '../../features/caixa/presentation/caixa_screen.dart';
import '../../features/caixa/presentation/caixa_movimentos_screen.dart';
import '../../features/printing/presentation/printer_settings_screen.dart';

abstract final class Routes {
  static const splash = '/splash';
  static const login = '/login';
  static const patioSelect = '/patio-select';
  static const revogado = '/revogado';
  static const naoVinculado = '/nao-vinculado';
  static const home = '/home';
  static const entrada = '/entrada';
  static const saida = '/saida';
  static const movimentos = '/movimentos';
  static const caixa = '/caixa';
  static const caixaMovimentos = '/caixa/movimentos';
  static const impressora = '/impressora';
  static String saidaDetalhe(String id) => '/saida/$id';
}

final _rootKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = _RouterNotifier(ref);
  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: Routes.splash,
    refreshListenable: notifier,
    redirect: notifier.redirect,
    routes: [
      GoRoute(path: Routes.splash, builder: (context, state) => const SplashScreen()),
      GoRoute(path: Routes.login, builder: (context, state) => const LoginScreen()),
      GoRoute(path: Routes.revogado, builder: (context, state) => const RevogadoScreen()),
      GoRoute(
        path: Routes.patioSelect,
        builder: (context, state) => const PatioSelectScreen(),
      ),
      GoRoute(
        path: Routes.naoVinculado,
        builder: (context, state) => const NaoVinculadoScreen(),
      ),
      GoRoute(path: Routes.home, builder: (context, state) => const MainShell()),
      GoRoute(path: Routes.entrada, builder: (context, state) => const EntradaScreen()),
      GoRoute(path: Routes.movimentos, builder: (context, state) => const MovimentosTicketsScreen()),
      GoRoute(
        path: '/saida/:id',
        builder: (context, state) => SaidaScreen(ticketId: state.pathParameters['id']!),
      ),
      GoRoute(path: Routes.caixa, builder: (context, state) => const CaixaScreen()),
      GoRoute(
        path: Routes.caixaMovimentos,
        builder: (context, state) => const CaixaMovimentosScreen(),
      ),
      GoRoute(path: Routes.impressora, builder: (context, state) => const PrinterSettingsScreen()),
    ],
  );
});

class _RouterNotifier extends ChangeNotifier {
  _RouterNotifier(this._ref) {
    _ref.listen(authControllerProvider, (prev, next) => notifyListeners());
  }
  final Ref _ref;

  String? redirect(BuildContext context, GoRouterState state) {
    final auth = _ref.read(authControllerProvider);
    final loc = state.matchedLocation;

    switch (auth) {
      case AuthLoading():
        return loc == Routes.splash ? null : Routes.splash;
      case AuthLoggedOut():
        return Routes.login;
      case AuthRevogado():
        return Routes.revogado;
      case AuthNeedPatio():
        return Routes.patioSelect;
      case AuthDeviceNaoVinculado():
        return Routes.naoVinculado;
      case AuthNeedsUpdate():
        return Routes.login; // placeholder até a tela de update ser portada
      case AuthLoggedIn():
        const entryScreens = {
          Routes.login,
          Routes.splash,
          Routes.revogado,
          Routes.naoVinculado,
          Routes.patioSelect,
        };
        return entryScreens.contains(loc) ? Routes.home : null;
    }
  }
}
