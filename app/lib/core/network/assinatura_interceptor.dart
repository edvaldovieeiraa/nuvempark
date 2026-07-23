import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/assinatura/presentation/providers/assinatura_provider.dart';

/// Lê o estado da assinatura em TODA resposta autenticada e atualiza o gate.
///
/// É esta peça que faz o bloqueio comercial chegar ao app DURANTE o sync ou o
/// heartbeat, sem precisar deslogar: a API carimba `X-Assinatura-Estado` e
/// `X-Assinatura-Bloqueia` em cada resposta protegida, e aqui o provider é
/// atualizado — o guard do go_router reage e leva à tela de bloqueio.
///
/// Só REAGE a headers presentes. Rotas sem gate (login, refresh, app-config) não
/// os mandam, e aí nada muda — o app mantém o último estado conhecido (fail-open).
class AssinaturaInterceptor extends Interceptor {
  AssinaturaInterceptor(this._ref);

  final Ref _ref;

  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    final headers = response.headers;
    final estado = headers.value('x-assinatura-estado');
    final bloqueiaRaw = headers.value('x-assinatura-bloqueia');
    if (estado != null && estado.isNotEmpty && bloqueiaRaw != null) {
      _ref.read(assinaturaControllerProvider.notifier).aplicarHeaders(
            estado: estado,
            bloqueia: bloqueiaRaw.toLowerCase() == 'true',
          );
    }
    handler.next(response);
  }
}
