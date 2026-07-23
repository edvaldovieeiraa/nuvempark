import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/dispositivo/presentation/providers/dispositivo_provider.dart';

/// Detecta o 403 `dispositivo_nao_autorizado` em QUALQUER resposta e move o app
/// para o gate de dispositivo — sem limpar sessão nem outbox (TRAVA 2).
///
/// Cobre o corte durante a operação (heartbeat 403, ou uma rota qualquer que
/// responda 403 em modo drenagem) e o 403 do login. É ADITIVO: apenas seta o
/// estado e repassa o erro (`handler.next(err)`) — não interfere no 401 do
/// [RefreshInterceptor] nem em qualquer outra classificação de erro.
///
/// Só reage ao corpo `{ "erro": "dispositivo_nao_autorizado", ... }`. Outros
/// 403 (ex.: "sem acesso a este pátio") passam intactos.
class DispositivoInterceptor extends Interceptor {
  DispositivoInterceptor(this._ref);

  final Ref _ref;

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final resp = err.response;
    final data = resp?.data;
    if (resp?.statusCode == 403 &&
        data is Map &&
        data['erro'] == 'dispositivo_nao_autorizado') {
      _ref.read(dispositivoControllerProvider.notifier).bloquear(
            motivo: data['motivo']?.toString() ?? 'bloqueado',
            codigoPareamento: data['codigo_pareamento']?.toString(),
          );
    }
    handler.next(err);
  }
}
