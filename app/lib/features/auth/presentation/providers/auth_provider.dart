import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/platform/lock_task.dart';
import '../../../../core/di/providers.dart';
import '../../data/auth_repository.dart';
import '../../data/token_storage.dart';
import '../../domain/nuvempark_user.dart';
import '../../../patio/domain/patio_resumo.dart';
import '../../../assinatura/presentation/providers/assinatura_provider.dart';

// ── Estado ──────────────────────────────────────────────────────────────────

sealed class AuthState {
  const AuthState();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class AuthLoggedOut extends AuthState {
  const AuthLoggedOut();
}

class AuthRevogado extends AuthState {
  const AuthRevogado();
}

/// Login feito, mas precisa escolher entre múltiplos pátios (rede).
class AuthNeedPatio extends AuthState {
  const AuthNeedPatio({
    required this.user,
    required this.patios,
    this.isFirstLogin = false,
  });
  final NuvemparkUser user;
  final List<PatioResumo> patios;
  final bool isFirstLogin;
}

/// Dispositivo instalado mas ainda não vinculado a nenhum pátio.
class AuthDeviceNaoVinculado extends AuthState {
  const AuthDeviceNaoVinculado({
    required this.user,
    required this.deviceUuid,
    required this.patios,
  });
  final NuvemparkUser user;
  final String deviceUuid;
  final List<PatioResumo> patios;
}

class AuthLoggedIn extends AuthState {
  const AuthLoggedIn(this.user, {this.assinaturaEstado = 'ativa'});
  final NuvemparkUser user;
  final String assinaturaEstado;
}

class AuthNeedsUpdate extends AuthState {
  const AuthNeedsUpdate({
    required this.user,
    required this.minVersion,
    this.forceUpdate = true,
  });
  final NuvemparkUser user;
  final String minVersion;
  final bool forceUpdate;
}

// ── Controller ──────────────────────────────────────────────────────────────

class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthLoading();

  TokenStorage get _storage => ref.read(tokenStorageProvider);
  AuthRepository get _repo => ref.read(authRepositoryProvider);

  // Chamados pelo startup / version gate
  void onLoggedOut() => state = const AuthLoggedOut();
  void continuarOffline(NuvemparkUser user) => state = AuthLoggedIn(user);
  void onRevogado() => state = const AuthRevogado();

  void onNeedsUpdate(
    NuvemparkUser user,
    String minVersion, {
    bool forceUpdate = true,
  }) =>
      state = AuthNeedsUpdate(
        user: user,
        minVersion: minVersion,
        forceUpdate: forceUpdate,
      );

  // ── Login (código do tenant + usuário + senha) ────────────────────────────
  Future<void> login({
    required String codigoTenant,
    required String usuario,
    required String senha,
  }) async {
    try {
      final result = await _repo.login(
        codigoTenant: codigoTenant,
        usuario: usuario,
        senha: senha,
      );
      await _storage.saveUser(result.user);
      // Semeia o gate já na entrada (o app precisa entrar mesmo bloqueado, para
      // mostrar a tela de bloqueio — o corte de login é só do trial expirado).
      ref.read(assinaturaControllerProvider.notifier).definir(result.assinatura);
      await _resolverAposLogin(
        result.user,
        result.patios,
        assinaturaEstado: result.assinaturaEstado,
      );
    } catch (e) {
      state = const AuthLoggedOut();
      rethrow;
    }
  }

  // ── Resolução de pátio pós-login ──────────────────────────────────────────
  Future<void> _resolverAposLogin(
    NuvemparkUser user,
    List<PatioResumo> patios, {
    required String assinaturaEstado,
  }) async {
    try {
      final deviceUuid = await _storage.getOrCreateDeviceUuid();
      final vinculo = await _repo.checkDeviceBinding(deviceUuid);

      if (vinculo != null) {
        await _storage.savePatioId(vinculo.patioId);
        await _storage.savePatioVinculado(
          nome: vinculo.nomePatio,
          codigo: vinculo.codigoPatio,
        );
        state = AuthLoggedIn(user, assinaturaEstado: assinaturaEstado);
        return;
      }
    } catch (_) {
      // Falha de rede → não bloquear; cair no fluxo normal
    }

    // Se um único pátio, auto-seleciona. Senão, precisa escolher.
    if (patios.length == 1) {
      await _storage.savePatioId(patios.first.id);
      state = AuthLoggedIn(user, assinaturaEstado: assinaturaEstado);
    } else {
      state = AuthNeedPatio(user: user, patios: patios, isFirstLogin: true);
    }
  }

  // ── Seleção de pátio (rede com múltiplos) ─────────────────────────────────
  Future<void> selecionarPatio(NuvemparkUser user, String patioId) async {
    await _storage.savePatioId(patioId);
    state = AuthLoggedIn(user);
  }

  // ── Logout ──────────────────────────────────────────────────────────────
  Future<void> logout() async {
    await LockTask.parar(); // libera o app antes de sair
    await _repo.logout();
    ref.read(assinaturaControllerProvider.notifier).limpar();
    state = const AuthLoggedOut();
  }
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);
