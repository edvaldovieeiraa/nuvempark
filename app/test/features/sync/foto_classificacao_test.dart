import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/sync/data/foto_uploader.dart';

DioException _http(int status) {
  final req = RequestOptions(path: '/foto');
  return DioException.badResponse(
    statusCode: status,
    requestOptions: req,
    response: Response(requestOptions: req, statusCode: status),
  );
}

void main() {
  final req = RequestOptions(path: '/foto');

  test('sem rede, timeout de conexão e cancelamento: offline (não gasta tentativa)',
      () {
    expect(
        classificarFalhaFoto(
            DioException.connectionError(requestOptions: req, reason: 'x')),
        FalhaFoto.offline);
    expect(
        classificarFalhaFoto(DioException.connectionTimeout(
            requestOptions: req, timeout: const Duration(seconds: 20))),
        FalhaFoto.offline);
    expect(
        classificarFalhaFoto(DioException.requestCancelled(
            requestOptions: req, reason: 'parar')),
        FalhaFoto.offline);
  });

  test('recusa definitiva do servidor: permanente', () {
    for (final s in [400, 403, 404, 413, 422]) {
      expect(classificarFalhaFoto(_http(s)), FalhaFoto.permanente,
          reason: 'HTTP $s');
    }
  });

  test('falha passageira: 401, 408, 425, 429 e 5xx', () {
    for (final s in [401, 408, 425, 429, 500, 502, 503]) {
      expect(classificarFalhaFoto(_http(s)), FalhaFoto.passageira,
          reason: 'HTTP $s');
    }
  });

  test('timeout de envio/resposta e erro desconhecido: passageira', () {
    expect(
        classificarFalhaFoto(DioException.sendTimeout(
            requestOptions: req, timeout: const Duration(seconds: 90))),
        FalhaFoto.passageira);
    expect(
        classificarFalhaFoto(DioException.receiveTimeout(
            requestOptions: req, timeout: const Duration(seconds: 30))),
        FalhaFoto.passageira);
    expect(classificarFalhaFoto(StateError('qualquer coisa')),
        FalhaFoto.passageira);
  });
}
