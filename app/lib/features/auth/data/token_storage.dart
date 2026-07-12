import 'dart:convert';

import 'package:nuvempark_core/nuvempark_core.dart';
import 'package:uuid/uuid.dart';

import '../domain/nuvempark_user.dart';

/// Chaves no flutter_secure_storage.
abstract final class _K {
  static const accessToken = 'nuvempark_access_token';
  static const refreshToken = 'nuvempark_refresh_token';
  static const userJson = 'nuvempark_user_json';
  static const deviceUuid = 'nuvempark_device_uuid';
  static const tenantId = 'nuvempark_tenant_id';
  static const tenantCodigo = 'nuvempark_tenant_codigo';
  static const patioId = 'nuvempark_patio_id';
  static const patioNome = 'nuvempark_patio_nome';
  static const patioCodigo = 'nuvempark_patio_codigo';
  static const ultimoSync = 'nuvempark_ultimo_sync';
}

/// Persiste tokens e identidade do dispositivo em SecureStorage.
/// NUNCA armazena a senha do usuário.
class TokenStorage {
  TokenStorage(this._storage);

  final SecureStorage _storage;

  // ── Access / Refresh tokens ──────────────────────────────────────────────
  Future<String?> readAccessToken() => _storage.read(_K.accessToken);
  Future<String?> readRefreshToken() => _storage.read(_K.refreshToken);

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(_K.accessToken, accessToken);
    await _storage.write(_K.refreshToken, refreshToken);
  }

  // ── Usuário ──────────────────────────────────────────────────────────────
  Future<NuvemparkUser?> readUser() async {
    final json = await _storage.read(_K.userJson);
    if (json == null) return null;
    return NuvemparkUser.fromJson(jsonDecode(json) as Map<String, dynamic>);
  }

  Future<void> saveUser(NuvemparkUser user) =>
      _storage.write(_K.userJson, jsonEncode(user.toJson()));

  // ── Device UUID ──────────────────────────────────────────────────────────
  /// Retorna o UUID do dispositivo, criando-o na primeira chamada.
  Future<String> getOrCreateDeviceUuid() async {
    var id = await _storage.read(_K.deviceUuid);
    if (id == null || id.isEmpty) {
      id = const Uuid().v4();
      await _storage.write(_K.deviceUuid, id);
    }
    return id;
  }

  Future<String?> readDeviceUuid() => _storage.read(_K.deviceUuid);

  // ── Tenant ───────────────────────────────────────────────────────────────
  Future<String?> readTenantId() => _storage.read(_K.tenantId);
  Future<String?> readTenantCodigo() => _storage.read(_K.tenantCodigo);

  Future<void> saveTenant({required String id, required String codigo}) async {
    await _storage.write(_K.tenantId, id);
    await _storage.write(_K.tenantCodigo, codigo);
  }

  // ── Pátio selecionado ─────────────────────────────────────────────────────
  Future<String?> readPatioId() => _storage.read(_K.patioId);
  Future<void> savePatioId(String id) => _storage.write(_K.patioId, id);

  /// Última sincronização bem-sucedida com a nuvem (ISO-8601).
  Future<String?> readUltimoSync() => _storage.read(_K.ultimoSync);
  Future<void> saveUltimoSync(DateTime quando) =>
      _storage.write(_K.ultimoSync, quando.toIso8601String());

  Future<String?> readPatioNome() => _storage.read(_K.patioNome);
  Future<String?> readPatioCodigo() => _storage.read(_K.patioCodigo);

  Future<void> savePatioVinculado({
    required String nome,
    required String codigo,
  }) async {
    await _storage.write(_K.patioNome, nome);
    await _storage.write(_K.patioCodigo, codigo);
  }

  // ── Limpeza ────────────────────────────────────────────────────────────────
  Future<void> clearSession() async {
    await _storage.delete(_K.accessToken);
    await _storage.delete(_K.refreshToken);
    await _storage.delete(_K.userJson);
  }

  /// Remove tudo — logout completo ou revogação de dispositivo.
  /// device_uuid é preservado (identidade do hardware).
  Future<void> clearAll() async {
    await _storage.delete(_K.accessToken);
    await _storage.delete(_K.refreshToken);
    await _storage.delete(_K.userJson);
    await _storage.delete(_K.tenantId);
    await _storage.delete(_K.tenantCodigo);
    await _storage.delete(_K.patioId);
    await _storage.delete(_K.patioNome);
    await _storage.delete(_K.patioCodigo);
  }
}
