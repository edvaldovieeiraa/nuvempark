import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/env.dart';
import '../../features/auth/data/token_storage.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';

/// Intercepta 401, tenta renovar o access token via refresh token e repete
/// os requests originais. Se o refresh for negado (token revogado), limpa
/// a sessão e seta o estado de auth como revogado.
///
/// PORTADO VERBATIM do leve-patio — a lógica sutil (single-flight, guard
/// anti-deadlock, "erro de rede nunca revoga") NÃO deve ser alterada.
class RefreshInterceptor extends Interceptor {
  RefreshInterceptor({
    required this.dio,
    required this.storage,
    required this.ref,
  });

  final Dio dio;
  final TokenStorage storage;
  final Ref ref;

  /// Marca uma requisição que JÁ foi repetida com um token novo — para nunca
  /// tentar refresh/retry duas vezes na mesma requisição lógica.
  static const _kJaRetentada = 'nuvempark_refresh_ja_retentada';

  bool _refreshing = false;
  final List<({RequestOptions options, ErrorInterceptorHandler handler})>
      _queue = [];

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode != 401) {
      handler.next(err);
      return;
    }

    // Evita loops: se o 401 veio da rota de refresh, é token revogado.
    if (err.requestOptions.path.contains('/auth/refresh')) {
      await storage.clearAll();
      ref.read(authControllerProvider.notifier).onRevogado();
      handler.next(err);
      return;
    }

    // Requisição que JÁ foi repetida com token renovado e recebeu 401 de novo
    // (ex.: 401 de permissão) — NUNCA tenta outro refresh. Sem este corte, o
    // dio.fetch abaixo dispara este MESMO onError recursivamente enquanto
    // _refreshing ainda é true, a chamada aninhada enfileira e nunca chama
    // handler, o Future externo trava, finally nunca roda, _refreshing fica
    // true pra sempre e a rede inteira congela.
    if (err.requestOptions.extra[_kJaRetentada] == true) {
      handler.next(err);
      return;
    }

    // Enquanto já há um refresh em andamento, enfileira.
    if (_refreshing) {
      _queue.add((options: err.requestOptions, handler: handler));
      return;
    }

    _refreshing = true;
    try {
      final refreshToken = await storage.readRefreshToken();
      final deviceUuid = await storage.readDeviceUuid();
      if (refreshToken == null || deviceUuid == null) {
        await storage.clearAll();
        ref.read(authControllerProvider.notifier).onRevogado();
        for (final item in _queue) {
          item.handler.next(err);
        }
        handler.next(err);
        return;
      }

      final resp = await dio.post(
        Env.refreshUrl,
        data: {'refresh_token': refreshToken, 'device_uuid': deviceUuid},
        options: Options(headers: {'Authorization': null}),
      );

      final newAccess = resp.data['access_token'] as String;
      final newRefresh = resp.data['refresh_token'] as String;
      await storage.saveTokens(accessToken: newAccess, refreshToken: newRefresh);

      // Marca ANTES do fetch — sem isto o guard _kJaRetentada nunca ativa.
      err.requestOptions.extra[_kJaRetentada] = true;
      err.requestOptions.headers['Authorization'] = 'Bearer $newAccess';
      final retry = await dio.fetch(err.requestOptions);
      handler.resolve(retry);

      // Repete a fila. Itera sobre uma cópia: um 401 concorrente pode chamar
      // _queue.add(...) durante a iteração (ConcurrentModificationError).
      for (final item in List.of(_queue)) {
        item.options.extra[_kJaRetentada] = true;
        item.options.headers['Authorization'] = 'Bearer $newAccess';
        try {
          final r = await dio.fetch(item.options);
          item.handler.resolve(r);
        } catch (e) {
          item.handler.next(err);
        }
      }
    } on DioException catch (refreshErr) {
      // Só REVOGA quando o servidor negou o refresh (401/403). Timeout, sem
      // conexão, DNS, 5xx são falhas de REDE — não apagam a sessão local.
      final statusCode = refreshErr.response?.statusCode;
      if (statusCode == 401 || statusCode == 403) {
        await storage.clearAll();
        ref.read(authControllerProvider.notifier).onRevogado();
      }
      for (final item in _queue) {
        item.handler.next(err);
      }
      handler.next(err);
    } catch (_) {
      for (final item in _queue) {
        item.handler.next(err);
      }
      handler.next(err);
    } finally {
      _queue.clear();
      _refreshing = false;
    }
  }
}
