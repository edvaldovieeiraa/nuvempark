import 'dart:async';
import 'dart:io';
import 'dart:ui' show Size;

import 'package:flutter/painting.dart' show BoxFit;
import 'package:image/image.dart' as img;
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

import '../domain/roi_mapper.dart';
import 'foto_entrada_service.dart';
import 'placa_ocr_service.dart';

/// Resultado do processamento de uma captura: caminho da foto INTEIRA salva
/// (para upload/pátio) e a placa reconhecida (ou null).
class CapturaProcessada {
  const CapturaProcessada({required this.fotoPath, this.placa});
  final String fotoPath;
  final String? placa;
}

/// Pipeline de uma foto de placa capturada pela câmera própria:
///  1. Decodifica e normaliza a orientação (EXIF) uma única vez.
///  2. Salva a foto INTEIRA (redimensionada p/ 1600px, q85 — mesma política de
///     hoje) para upload e miniatura do pátio.
///  3. Recorta a ROI da moldura (com margem) e roda o OCR só nela — mais sinal,
///     menos ruído. O recorte é temporário e apagado logo após o OCR.
///  4. Fallback: se decodificar/recortar falhar, OU o OCR da ROI não achar
///     placa, roda o OCR na imagem inteira (o comportamento anterior).
///
/// NÃO altera o motor de OCR: alimenta o [PlacaOcrService] existente com um
/// arquivo (a ROI num arquivo temporário), exatamente como ele já espera.
class PlacaCapturaProcessor {
  PlacaCapturaProcessor(this._fotoService, this._ocrService);

  final FotoEntradaService _fotoService;
  final PlacaOcrService _ocrService;

  // Largura máxima da foto salva — igual ao perfil de entrada atual (1600px).
  static const int _larguraSalva = 1600;
  // Folga ao redor da moldura para não cortar a borda da placa (15%).
  static const double _margemRoi = 0.15;

  Future<CapturaProcessada> processar({
    required String arquivoBruto,
    required Size previewSize,
  }) async {
    img.Image? decodificada;
    try {
      final bytes = await File(arquivoBruto).readAsBytes();
      decodificada = img.decodeImage(bytes);
    } catch (_) {
      decodificada = null;
    }

    // Não deu para decodificar em Dart: salva o bruto e OCR na imagem inteira.
    if (decodificada == null) {
      final fotoPath = await _fotoService.persistirCaptura(arquivoBruto);
      final placa = await _ocrOuNull(fotoPath);
      return CapturaProcessada(fotoPath: fotoPath, placa: placa);
    }

    final baked = img.bakeOrientation(decodificada);

    // Foto salva (upload/pátio): imagem INTEIRA, redimensionada e reencodada.
    final paraSalvar = baked.width > _larguraSalva
        ? img.copyResize(baked, width: _larguraSalva)
        : baked;
    final fotoPath =
        await _fotoService.salvarBytes(img.encodeJpg(paraSalvar, quality: 85));

    // OCR: tenta na ROI (full-res, mais pixels na placa); senão, imagem inteira.
    var placa = await _ocrNaRoi(baked, previewSize);
    placa ??= await _ocrOuNull(fotoPath);

    return CapturaProcessada(fotoPath: fotoPath, placa: placa);
  }

  /// Recorta a ROI da moldura na imagem [baked] e roda o OCR só nela. Retorna
  /// null se não foi possível recortar (fica para o fallback de imagem inteira).
  Future<String?> _ocrNaRoi(img.Image baked, Size previewSize) async {
    final crop = _recortarRoi(baked, previewSize);
    if (crop == null) return null;

    String? tmp;
    try {
      tmp = await _escreverTemp(img.encodeJpg(crop, quality: 90));
      return await _ocrService.lerPlaca(File(tmp));
    } catch (_) {
      return null;
    } finally {
      if (tmp != null) {
        unawaited(File(tmp).delete().catchError((_) => File(tmp!)));
      }
    }
  }

  img.Image? _recortarRoi(img.Image baked, Size previewSize) {
    try {
      final bounds =
          Size(baked.width.toDouble(), baked.height.toDouble());
      final guia = plateGuideRect(previewSize);
      final roi = rectComMargem(
        mapPreviewRectToImage(guia, previewSize, bounds, BoxFit.cover),
        _margemRoi,
        bounds,
      );
      final w = roi.width.round();
      final h = roi.height.round();
      if (w < 16 || h < 16) return null; // ROI degenerada
      return img.copyCrop(
        baked,
        x: roi.left.round(),
        y: roi.top.round(),
        width: w,
        height: h,
      );
    } catch (_) {
      return null;
    }
  }

  Future<String?> _ocrOuNull(String path) async {
    try {
      return await _ocrService.lerPlaca(File(path));
    } catch (_) {
      return null;
    }
  }

  Future<String> _escreverTemp(List<int> bytes) async {
    final dir = await getTemporaryDirectory();
    final path = p.join(dir.path, 'ocr_${const Uuid().v4()}.jpg');
    await File(path).writeAsBytes(bytes);
    return path;
  }
}
