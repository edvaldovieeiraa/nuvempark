import 'dart:io' show Platform;

import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';

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

  /// Android 13+: pede a permissão de notificação. Sem ela o foreground
  /// service RODA, mas o sistema esconde a notificação "NuvemPark em operação"
  /// — e é essa notificação que a declaração de FGS da Play promete ao usuário.
  ///
  /// Abre diálogo do sistema: chamar ANTES do quiosque (o LockTask barra telas
  /// do sistema). Não insiste se o operador negou de vez; abaixo do Android 13
  /// o plugin já responde "concedida" sem mostrar nada.
  static Future<void> pedirPermissaoNotificacao() async {
    // Só Android: o serviço de operação não existe no iOS, e pedir permissão
    // de notificação sem notificação nenhuma é motivo de questionamento na
    // revisão da Apple.
    if (!Platform.isAndroid) return;
    try {
      final status = await Permission.notification.status;
      if (status.isGranted || status.isPermanentlyDenied) return;
      await Permission.notification.request();
    } catch (_) {
      // plataforma sem suporte / plugin indisponível: segue sem notificação
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
