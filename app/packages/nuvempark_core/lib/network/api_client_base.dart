import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// Fábrica de Dio configurada com baseUrl, timeouts e log.
///
/// Não inclui lógica de auth — cada app adiciona seus próprios interceptors
/// antes de usar (Bearer, cookie, etc.).
class ApiClientBase {
  static Dio create({
    required String baseUrl,
    bool enableLogs = false,
    List<Interceptor> interceptors = const [],
    Duration connectTimeout = const Duration(seconds: 20),
    Duration receiveTimeout = const Duration(seconds: 30),
  }) {
    final dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: connectTimeout,
        receiveTimeout: receiveTimeout,
        headers: {'Accept': 'application/json'},
        extra: {'withCredentials': true},
      ),
    );

    for (final interceptor in interceptors) {
      dio.interceptors.add(interceptor);
    }

    if (enableLogs && kDebugMode) {
      dio.interceptors.add(
        LogInterceptor(
          requestBody: true,
          responseBody: true,
          requestHeader: false,
          responseHeader: false,
          logPrint: (o) => debugPrint(o.toString()),
        ),
      );
    }

    return dio;
  }
}
