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
import '../../features/caixa/domain/caixa_model.dart';
import '../../features/caixa/presentation/caixa_screen.dart';
import '../../features/caixa/presentation/caixa_movimentos_screen.dart';
import '../../features/caixa/presentation/caixa_detalhe_screen.dart';
import '../../features/mensalistas/presentation/mensalistas_screen.dart';
import '../../features/printing/presentation/printer_settings_screen.dart';
import '../../features/menu/presentation/sobre_screen.dart';

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
  static const caixaDetalhe = '/caixa/detalhe';
  static const mensalistas = '/mensalistas';
  static const impressora = '/impressora';
  // Destino do Menu. A antiga tela de Configurações foi dissolvida (sync vive
  // no Menu, "Conexão" virou seção do Sobre, Sair subiu pro Menu) e os dois
  // "Sobre" viraram uma tela só.
  static const sobre = '/sobre';
  static String saidaDetalhe(String id) => '/saida/$id';
}

/// Navigator raiz. Público para que tarefas que continuam DEPOIS de a tela que
/// as disparou já ter saído (ex.: impressão do cupom em background) ainda
/// consigam um context vivo para avisar o operador.
final rootNavigatorKey = GlobalKey<NavigatorState>();

// Transição do Brisa entre telas empilhadas. Deslocamento curto (10% da tela) e
// não a varrida inteira do iOS: o Brisa é discreto, e o operador abre estas
// telas dezenas de vezes por turno — animação longa aqui vira imposto.
//
// `chain(CurveTween(...))` em vez de `CurvedAnimation`: o transitionsBuilder roda
// a cada quadro, e um CurvedAnimation por quadro seria um objeto com listener
// para o coletor limpar sempre. Estes Animatable são criados uma vez só.
final _chegada = Tween<Offset>(begin: const Offset(0.10, 0), end: Offset.zero)
    .chain(CurveTween(curve: Curves.easeOutCubic));
final _recuo = Tween<Offset>(begin: Offset.zero, end: const Offset(-0.07, 0))
    .chain(CurveTween(curve: Curves.easeOutCubic));
final _revela = CurveTween(curve: Curves.easeOut);

/// Página com a transição do Brisa. Só para telas EMPILHADAS — as do fluxo de
/// autenticação (splash/login/pátio) são trocas de raiz, e deslizá-las lateral-
/// mente sugeriria um "voltar" que não existe.
CustomTransitionPage<void> _brisa(GoRouterState state, Widget child) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    transitionDuration: const Duration(milliseconds: 320),
    reverseTransitionDuration: const Duration(milliseconds: 260),
    // A tela de baixo recua enquanto a nova chega: as duas se movem juntas, e é
    // esse encaixe (não o deslocamento em si) que dá a leitura de profundidade.
    transitionsBuilder: (context, anim, sec, filho) => SlideTransition(
      position: _recuo.animate(sec),
      child: SlideTransition(
        position: _chegada.animate(anim),
        child: FadeTransition(opacity: _revela.animate(anim), child: filho),
      ),
    ),
    child: child,
  );
}

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = _RouterNotifier(ref);
  return GoRouter(
    navigatorKey: rootNavigatorKey,
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
      GoRoute(
        path: Routes.entrada,
        pageBuilder: (context, state) => _brisa(state, const EntradaScreen()),
      ),
      GoRoute(
        path: Routes.movimentos,
        pageBuilder: (context, state) =>
            _brisa(state, const MovimentosTicketsScreen()),
      ),
      GoRoute(
        path: '/saida/:id',
        pageBuilder: (context, state) =>
            _brisa(state, SaidaScreen(ticketId: state.pathParameters['id']!)),
      ),
      GoRoute(
        path: Routes.caixa,
        pageBuilder: (context, state) => _brisa(state, const CaixaScreen()),
      ),
      GoRoute(
        path: Routes.caixaMovimentos,
        pageBuilder: (context, state) =>
            _brisa(state, const CaixaMovimentosScreen()),
      ),
      GoRoute(
        path: Routes.caixaDetalhe,
        pageBuilder: (context, state) {
          // A sessão vem via `extra` (caixa aberto atual ou último fechamento).
          final sessao = state.extra as CaixaModel?;
          if (sessao == null) {
            return _brisa(
              state,
              const Scaffold(
                body: Center(child: Text('Sessão de caixa não informada.')),
              ),
            );
          }
          return _brisa(state, CaixaDetalheScreen(sessao: sessao));
        },
      ),
      GoRoute(
        path: Routes.mensalistas,
        pageBuilder: (context, state) => _brisa(state, const MensalistasScreen()),
      ),
      GoRoute(
        path: Routes.impressora,
        pageBuilder: (context, state) =>
            _brisa(state, const PrinterSettingsScreen()),
      ),
      GoRoute(
        path: Routes.sobre,
        pageBuilder: (context, state) => _brisa(state, const SobreScreen()),
      ),
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
