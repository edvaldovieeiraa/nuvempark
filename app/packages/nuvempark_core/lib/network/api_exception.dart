import 'package:dio/dio.dart';

/// Erro padronizado para falhas de API.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  factory ApiException.fromDio(DioException e) {
    final status = e.response?.statusCode;
    final data = e.response?.data;

    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout) {
      return ApiException('Tempo de conexão esgotado.', statusCode: status);
    }

    if (e.type == DioExceptionType.connectionError) {
      return ApiException('Sem conexão com o servidor.', statusCode: status);
    }

    String msg = 'Erro inesperado.';
    if (data is Map) {
      msg = data['message']?.toString() ??
          data['error']?.toString() ??
          data['mensagem']?.toString() ??
          msg;
    }

    return ApiException(msg, statusCode: status);
  }

  @override
  String toString() => 'ApiException($statusCode): $message';
}
