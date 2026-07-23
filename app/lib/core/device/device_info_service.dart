import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';

import '../config/env.dart';

/// Identidade do aparelho para o binding no servidor.
///
/// Todos os campos são OPCIONAIS e podem ser null (plataforma não-Android ou
/// erro de leitura) — a API aceita ausência, e o login nunca é bloqueado por
/// falha aqui.
///
/// `androidId` = ANDROID_ID (via [AndroidDeviceInfo.id]). Vai em CLARO por HTTPS
/// no login; quem faz o sha256 é o servidor. NUNCA é persistido localmente.
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
          androidId: info.id, // ANDROID_ID (conforme contrato do bloco)
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
}
