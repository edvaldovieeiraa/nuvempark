import 'package:flutter/services.dart';

/// Operação em segundo plano: mantém heartbeat e sync vivos com a tela apagada.
///
/// São DUAS camadas, porque os pátios usam hardware diferente:
///
///  1. [manterTelaLigada] — tablet fixo na tomada. Só funciona em aparelho
///     provisionado como Device Owner, e é a camada barata: com a tela acesa o
///     app nunca sai de foreground e nada mais é preciso.
///  2. [iniciar] — foreground service (ver OperacaoService.kt). Rede de
///     segurança para o aparelho que dorme: sem ele o Android 12+ congela o
///     processo e os `Timer.periodic` do app param de disparar.
///
/// No-op silencioso fora do Android ou se a plataforma recusar — o app segue
/// funcionando normalmente em foreground, que é o caso de uso principal.
class OperacaoBackground {
  static const _channel = MethodChannel('nuvempark/background');

  /// Sobe o foreground service. Idempotente (chamar 2x não duplica).
  static Future<bool> iniciar() async {
    try {
      return await _channel.invokeMethod<bool>('start') ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Derruba o serviço e a notificação (logout).
  static Future<bool> parar() async {
    try {
      return await _channel.invokeMethod<bool>('stop') ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Tela nunca dorme na tomada. `false` se o aparelho não é Device Owner.
  static Future<bool> manterTelaLigada(bool ligar) async {
    try {
      return await _channel.invokeMethod<bool>('manterTelaLigada', ligar) ?? false;
    } catch (_) {
      return false;
    }
  }

  /// O app escapa do Doze? (Device Owner é isento por padrão.)
  static Future<bool> isentoDeBateria() async {
    try {
      return await _channel.invokeMethod<bool>('isentoDeBateria') ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Abre o diálogo do sistema pedindo isenção de bateria. Só faz sentido em
  /// aparelho NÃO provisionado — ver OperacaoService.
  static Future<bool> pedirIsencaoBateria() async {
    try {
      return await _channel.invokeMethod<bool>('pedirIsencaoBateria') ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> ehDeviceOwner() async {
    try {
      return await _channel.invokeMethod<bool>('ehDeviceOwner') ?? false;
    } catch (_) {
      return false;
    }
  }
}
