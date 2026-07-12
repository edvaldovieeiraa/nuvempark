import 'package:dio/dio.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/config/env.dart';
import '../../patio/domain/patio_resumo.dart';
import '../domain/nuvempark_user.dart';
import 'token_storage.dart';

class LoginResult {
  const LoginResult({
    required this.user,
    required this.patios,
    required this.assinaturaEstado,
  });
  final NuvemparkUser user;
  final List<PatioResumo> patios;
  final String assinaturaEstado; // 'ativa' | 'atrasada' | 'suspensa'
}

class BindingInfo {
  const BindingInfo({
    required this.patioId,
    required this.nomePatio,
    required this.codigoPatio,
  });
  final String patioId;
  final String nomePatio;
  final String codigoPatio;
}

class AuthRepository {
  AuthRepository({required this.dio, required this.storage});

  final Dio dio;
  final TokenStorage storage;

  /// Login por CÓDIGO DO TENANT (4 díg) + usuário + senha.
  /// A API resolve o tenant e retorna user + patios + estado da assinatura.
  Future<LoginResult> login({
    required String codigoTenant,
    required String usuario,
    required String senha,
  }) async {
    try {
      final deviceUuid = await storage.getOrCreateDeviceUuid();
      final resp = await dio.post(
        '${Env.authBase}/login',
        data: {
          'codigo_tenant': codigoTenant.trim(),
          'usuario': usuario.trim().toUpperCase(),
          'senha': senha,
          'device_uuid': deviceUuid,
        },
        options: Options(headers: {'Authorization': null}),
      );

      final data = resp.data as Map<String, dynamic>;
      final user = NuvemparkUser.fromJson(data['user'] as Map<String, dynamic>);
      final patios = (data['patios'] as List)
          .map((p) => PatioResumo.fromJson(p as Map<String, dynamic>))
          .toList();
      final tenant = data['tenant'] as Map<String, dynamic>;
      final assinaturaEstado = data['assinatura_estado'] as String? ?? 'ativa';

      await storage.saveTokens(
        accessToken: data['access_token'] as String,
        refreshToken: data['refresh_token'] as String,
      );
      await storage.saveUser(user);
      await storage.saveTenant(
        id: tenant['id'] as String,
        codigo: tenant['codigo'] as String,
      );

      return LoginResult(
        user: user,
        patios: patios,
        assinaturaEstado: assinaturaEstado,
      );
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Verifica se o dispositivo está vinculado a um pátio.
  /// 200 → BindingInfo; 404/403 → null; erro de rede → rethrow.
  Future<BindingInfo?> checkDeviceBinding(String deviceUuid) async {
    try {
      final resp = await dio.get(
        Env.dispositivoUrl,
        options: Options(
          headers: {'X-Device-Id': deviceUuid},
          validateStatus: (s) => s != null && s < 500,
        ),
      );
      if (resp.statusCode == 200) {
        final data = resp.data as Map<String, dynamic>;
        return BindingInfo(
          patioId: data['patio_id'] as String,
          nomePatio: data['nome_patio'] as String? ?? '',
          codigoPatio: data['codigo_patio'] as String? ?? '',
        );
      }
      return null;
    } on DioException {
      rethrow;
    }
  }

  /// Logout: revoga tokens no servidor e limpa storage local.
  Future<void> logout() async {
    try {
      final refresh = await storage.readRefreshToken();
      final deviceId = await storage.readDeviceUuid();
      if (refresh != null && deviceId != null) {
        await dio.post(
          '${Env.authBase}/logout',
          data: {'refresh_token': refresh, 'device_uuid': deviceId},
          options: Options(validateStatus: (s) => s != null && s < 500),
        );
      }
    } catch (_) {
      // Falha remota não impede logout local.
    } finally {
      await storage.clearAll();
    }
  }
}
