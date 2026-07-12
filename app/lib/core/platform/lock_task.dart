import 'package:flutter/services.dart';

/// Controla o Lock Task Mode (screen pinning) do Android via platform channel.
/// Bloqueia barra de notificação, barra de status e botões home/recentes.
/// No-op silencioso fora do Android ou se a plataforma recusar.
class LockTask {
  static const _channel = MethodChannel('nuvempark/lock_task');

  /// Fixa o app na tela. Retorna true se entrou em lock task.
  static Future<bool> iniciar() async {
    try {
      return await _channel.invokeMethod<bool>('start') ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Libera o app (permitir sair — usado no logout / botão de saída).
  static Future<bool> parar() async {
    try {
      return await _channel.invokeMethod<bool>('stop') ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> estaBloqueado() async {
    try {
      return await _channel.invokeMethod<bool>('isLocked') ?? false;
    } catch (_) {
      return false;
    }
  }
}
