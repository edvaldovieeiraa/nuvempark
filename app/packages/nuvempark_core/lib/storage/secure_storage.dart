import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Wrapper sobre [FlutterSecureStorage] com API simplificada.
///
/// Centraliza as opções de Android (EncryptedSharedPreferences) e iOS
/// (Keychain first_unlock) em um único ponto.
class SecureStorage {
  SecureStorage()
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(),
          iOptions: IOSOptions(
            accessibility: KeychainAccessibility.first_unlock,
          ),
        );

  final FlutterSecureStorage _storage;

  Future<String?> read(String key) => _storage.read(key: key);

  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);

  Future<void> delete(String key) => _storage.delete(key: key);

  Future<void> deleteAll() => _storage.deleteAll();

  Future<bool> containsKey(String key) => _storage.containsKey(key: key);

  Future<Map<String, String>> readAll() => _storage.readAll();
}
