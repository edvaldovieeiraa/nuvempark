import 'package:dio/dio.dart';

import '../../features/auth/data/token_storage.dart';

/// Injeta `Authorization: Bearer token`, `X-Device-Id` e `X-Tenant-Id`
/// em toda requisição autenticada.
class BearerInterceptor extends Interceptor {
  BearerInterceptor(this._storage);

  final TokenStorage _storage;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.readAccessToken();
    final deviceUuid = await _storage.readDeviceUuid();
    final tenantId = await _storage.readTenantId();

    // Respeita um `Authorization: null` explícito do caller (login e refresh)
    // para NÃO enviar um Bearer antigo/expirado nessas rotas. Sem este check,
    // um token expirado reenviado na própria chamada de refresh voltaria 401
    // e seria tratado como "sessão revogada", forçando novo login à toa.
    final jaDefinido = options.headers.containsKey('Authorization');
    if (!jaDefinido && token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    if (deviceUuid != null && deviceUuid.isNotEmpty) {
      options.headers['X-Device-Id'] = deviceUuid;
    }
    if (tenantId != null && tenantId.isNotEmpty) {
      options.headers['X-Tenant-Id'] = tenantId;
    }
    handler.next(options);
  }
}
