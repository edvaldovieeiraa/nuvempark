import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../../assinatura/presentation/providers/assinatura_provider.dart';
import 'auth_provider.dart';

/// Verifica o estado inicial do app sem chamadas de rede bloqueantes.
///
/// Fluxo: access token + user salvos → AuthLoggedIn (sessão restaurada)
///        caso contrário             → AuthLoggedOut
class StartupNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {
    final storage = ref.read(tokenStorageProvider);
    final auth = ref.read(authControllerProvider.notifier);

    try {
      final accessToken = await storage.readAccessToken();
      if (accessToken == null || accessToken.isEmpty) {
        auth.onLoggedOut();
        return;
      }

      final user = await storage.readUser();
      if (user == null) {
        await storage.clearAll();
        auth.onLoggedOut();
        return;
      }

      // Restaura o último gate conhecido ANTES de marcar logado — matar e
      // reabrir o app não pode furar o bloqueio (o guard já decide com ele).
      await ref.read(assinaturaControllerProvider.notifier).restaurar();
      auth.continuarOffline(user);
    } catch (_) {
      // flutter_secure_storage pode lançar (ex.: chave do Keystore invalidada
      // após restauração de backup). Sem este catch, o app ficava preso em
      // AuthLoading() → spinner infinito. Recuperação: tratar como deslogado.
      try {
        await storage.clearAll();
      } catch (_) {
        // best-effort.
      }
      auth.onLoggedOut();
    }
  }
}

final startupProvider =
    AsyncNotifierProvider<StartupNotifier, void>(StartupNotifier.new);
