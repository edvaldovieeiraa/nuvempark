/// Configuração de ambiente do NuvemPark. Todos os valores são
/// `String.fromEnvironment` — sobrescreva com `--dart-define` no build.
abstract final class Env {
  // Backend: nuvempark-api (Node+Fastify). Em dev, aponte pro seu host.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8080', // 10.0.2.2 = localhost do host no emulador Android
  );

  static const String appId = String.fromEnvironment('APP_ID', defaultValue: 'nuvempark');

  static const bool enableHttpLogs =
      bool.fromEnvironment('HTTP_LOGS', defaultValue: true);

  static const String appVersion = String.fromEnvironment('APP_VERSION', defaultValue: '1.0.0');
  static const String buildNumber = String.fromEnvironment('BUILD_NUMBER', defaultValue: '0');
  static const String gitSha = String.fromEnvironment('GIT_SHA', defaultValue: 'dev');

  static const bool stoneHabilitado =
      bool.fromEnvironment('STONE_ENABLED', defaultValue: false);

  // Prefixo da API mobile (mantido compatível com o app atual).
  static const String _prefix = '/api/mobile/v1/patio';

  static String get authBase => '$_prefix/auth';
  static String get bootstrapUrl => '$_prefix/bootstrap';
  static String get syncUrl => '$_prefix/sync';
  static String get fotoUrl => '$_prefix/foto';
  static String get fotoAvariaUrl => '$_prefix/foto-avaria';
  static String get dispositivoUrl => '$_prefix/dispositivo';
  static String get refreshUrl => '$_prefix/auth/refresh';
  static String get appConfigUrl => '$_prefix/app-config';

  static const Duration connectTimeout = Duration(seconds: 20);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration syncInterval = Duration(minutes: 5);
  static const int syncMaxTentativas = 10;

  static String get versionDisplay {
    var v = 'v$appVersion';
    if (buildNumber != '0') v += '+$buildNumber';
    if (gitSha != 'dev') v += ' ($gitSha)';
    return v;
  }
}
