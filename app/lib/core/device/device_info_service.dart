import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/services.dart';

import '../config/env.dart';

/// Identidade do aparelho para o binding no servidor.
///
/// Todos os campos são OPCIONAIS e podem ser null (plataforma não-Android ou
/// erro de leitura) — a API aceita ausência, e o login nunca é bloqueado por
/// falha aqui.
///
/// `androidId` = Settings.Secure.ANDROID_ID (via MethodChannel nativo) — único
/// por aparelho + chave de assinatura e ESTÁVEL entre reinstalações, que é o que
/// permite o servidor reconhecer o mesmo aparelho após reinstalar. NÃO usamos o
/// `AndroidDeviceInfo.id` do device_info_plus: nas versões atuais ele é o
/// `Build.ID` (id de build do firmware), que NÃO é único por aparelho.
/// Vai em CLARO por HTTPS no login; o sha256 é feito no servidor. Nunca é
/// persistido localmente. Não exige permissão Android.
class DadosDispositivo {
  const DadosDispositivo({
    this.androidId,
    this.fabricante,
    this.modelo,
    this.soVersao,
    this.appVersao,
  });

  final String? androidId;
  final String? fabricante;
  final String? modelo;
  final String? soVersao;
  final String? appVersao;
}

class DeviceInfoService {
  static const _canal = MethodChannel('nuvempark/device');

  DadosDispositivo? _cache;

  /// Lê os dados uma vez e memoiza. Erro/plataforma não-Android → campos null,
  /// sem crash (só o appVersao, que é uma constante de build, sempre vem).
  Future<DadosDispositivo> carregar() async {
    final cache = _cache;
    if (cache != null) return cache;

    DadosDispositivo dados;
    try {
      if (Platform.isAndroid) {
        final info = await DeviceInfoPlugin().androidInfo;
        dados = DadosDispositivo(
          androidId: await _lerAndroidId(),
          fabricante: info.manufacturer,
          modelo: info.model,
          soVersao: 'Android ${info.version.release}',
          appVersao: Env.appVersion,
        );
      } else {
        dados = DadosDispositivo(appVersao: Env.appVersion);
      }
    } catch (_) {
      dados = DadosDispositivo(appVersao: Env.appVersion);
    }
    _cache = dados;
    return dados;
  }

  /// Settings.Secure.ANDROID_ID via canal nativo. Qualquer falha → null (o
  /// campo é opcional; só desabilita o merge por reinstalação naquele login).
  Future<String?> _lerAndroidId() async {
    try {
      final id = await _canal.invokeMethod<String>('getAndroidId');
      return (id != null && id.isNotEmpty) ? id : null;
    } catch (_) {
      return null;
    }
  }
}
