import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' show Rect, Size;

import 'package:camera/camera.dart';
import 'package:flutter/services.dart' show DeviceOrientation;
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

/// Formato de quadro que pedimos ao `CameraController` para a leitura ao vivo.
///
/// É por plataforma porque cada uma entrega o fluxo de um jeito, e o ML Kit só
/// aceita alguns: no Android, NV21; no iOS, BGRA8888. Ambos vêm em UM plano só,
/// que é o que [quadroParaInputImage] assume. Pedir o formato errado não dá
/// erro de compilação — o app simplesmente nunca reconhece nada, em silêncio.
ImageFormatGroup get formatoDeLeituraAoVivo =>
    Platform.isAndroid ? ImageFormatGroup.nv21 : ImageFormatGroup.bgra8888;

/// Quantos graus girar o quadro para o ML Kit ler o texto na horizontal.
const Map<DeviceOrientation, int> _compensacaoPorOrientacao = {
  DeviceOrientation.portraitUp: 0,
  DeviceOrientation.landscapeLeft: 90,
  DeviceOrientation.portraitDown: 180,
  DeviceOrientation.landscapeRight: 270,
};

/// Quadro pronto para o ML Kit.
class QuadroPreparado {
  const QuadroPreparado(this.entrada, this.tamanhoRotacionado);

  final InputImage entrada;

  /// Tamanho da imagem COMO O ML KIT A ENXERGA, ou seja, já girada.
  ///
  /// Importa porque as caixas de texto voltam neste espaço: com rotação de 90°
  /// ou 270°, largura e altura trocam em relação ao quadro cru. Mapear a
  /// moldura no espaço errado faria o filtro de posição recusar justamente a
  /// placa que está no centro.
  final Size tamanhoRotacionado;
}

/// Converte um quadro do fluxo da câmera no [InputImage] que o ML Kit espera.
///
/// Retorna `null` quando o quadro não serve (formato inesperado, rotação
/// desconhecida, múltiplos planos). O chamador deve simplesmente descartar o
/// quadro: com ~2,5 leituras por segundo, perder um é irrelevante, e é bem
/// melhor que arriscar interpretar bytes no layout errado.
/// [roi] recebe o tamanho JÁ ROTACIONADO e devolve a moldura naquele espaço.
/// É uma função, e não um retângulo pronto, porque o chamador só consegue
/// calcular a moldura depois de saber como o quadro será girado — e é aqui que
/// isso se descobre.
///
/// Quando informada, o quadro é RECORTADO nela. Isso não é cosmético: o ML Kit
/// reduz internamente a imagem antes de analisar, então mandar a cena inteira
/// deixa poucos pixels nos caracteres e ele acerta o formato mas erra letras.
/// Recortado, a placa ocupa o quadro todo — é o mesmo motivo pelo qual o fluxo
/// da foto recorta a ROI antes do OCR.
QuadroPreparado? prepararQuadro({
  required CameraImage quadro,
  required CameraDescription camera,
  required DeviceOrientation orientacao,
  Rect Function(Size tamanhoRotacionado)? roi,
}) {
  final rotacao = _rotacao(camera, orientacao);
  if (rotacao == null) return null;

  final formato = InputImageFormatValue.fromRawValue(quadro.format.raw);
  final esperado =
      Platform.isAndroid ? InputImageFormat.nv21 : InputImageFormat.bgra8888;
  if (formato == null || formato != esperado) return null;

  // Os dois formatos acima são de plano único. Se vier diferente, o cálculo de
  // bytesPerRow abaixo não valeria e a leitura sairia embaralhada.
  if (quadro.planes.length != 1) return null;
  final plano = quadro.planes.first;

  final girado = rotacao == InputImageRotation.rotation90deg ||
      rotacao == InputImageRotation.rotation270deg;
  final tamanhoRotacionado = girado
      ? Size(quadro.height.toDouble(), quadro.width.toDouble())
      : Size(quadro.width.toDouble(), quadro.height.toDouble());

  if (roi != null) {
    final recorte = _recortar(
      quadro: quadro,
      plano: plano,
      formato: formato,
      rotacao: rotacao,
      roiRotacionada: roi(tamanhoRotacionado),
    );
    if (recorte != null) return recorte;
    // Recorte impossível (moldura degenerada, aritmética fora dos limites):
    // segue com o quadro inteiro em vez de perder a leitura.
  }

  return QuadroPreparado(
    InputImage.fromBytes(
      bytes: plano.bytes,
      metadata: InputImageMetadata(
        size: Size(quadro.width.toDouble(), quadro.height.toDouble()),
        rotation: rotacao,
        format: formato,
        bytesPerRow: plano.bytesPerRow,
      ),
    ),
    tamanhoRotacionado,
  );
}

/// Recorta o quadro na moldura. Retorna `null` se o recorte não for viável.
///
/// A conversão de espaço é o ponto delicado: a moldura chega em coordenadas da
/// imagem JÁ GIRADA (é como o operador a vê), mas os bytes estão na orientação
/// crua do sensor. Recortar sem desfazer a rotação pegaria a região errada da
/// cena — e, pior, sem erro nenhum: só leituras ruins.
QuadroPreparado? _recortar({
  required CameraImage quadro,
  required Plane plano,
  required InputImageFormat formato,
  required InputImageRotation rotacao,
  required Rect roiRotacionada,
}) {
  final larguraCrua = quadro.width;
  final alturaCrua = quadro.height;
  final r = roiRotacionada;

  // Desfaz a rotação: moldura (espaço girado) → retângulo no sensor.
  final Rect cru = switch (rotacao) {
    InputImageRotation.rotation0deg => r,
    InputImageRotation.rotation90deg =>
      Rect.fromLTRB(r.top, alturaCrua - r.right, r.bottom, alturaCrua - r.left),
    InputImageRotation.rotation180deg => Rect.fromLTRB(larguraCrua - r.right,
        alturaCrua - r.bottom, larguraCrua - r.left, alturaCrua - r.top),
    InputImageRotation.rotation270deg =>
      Rect.fromLTRB(larguraCrua - r.bottom, r.left, larguraCrua - r.top, r.right),
  };

  // Pares em todas as bordas: o NV21 guarda cor em blocos 2×2, e um recorte
  // ímpar desalinharia croma e luminância (imagem com cores deslocadas).
  var x0 = cru.left.floor().clamp(0, larguraCrua - 2);
  var y0 = cru.top.floor().clamp(0, alturaCrua - 2);
  var x1 = cru.right.ceil().clamp(x0 + 2, larguraCrua);
  var y1 = cru.bottom.ceil().clamp(y0 + 2, alturaCrua);
  x0 -= x0.isOdd ? 1 : 0;
  y0 -= y0.isOdd ? 1 : 0;
  x1 -= x1.isOdd ? 1 : 0;
  y1 -= y1.isOdd ? 1 : 0;

  final w = x1 - x0;
  final h = y1 - y0;
  // Recorte minúsculo não ajuda o OCR e indica moldura/mapeamento degenerados.
  if (w < 32 || h < 32) return null;

  final linha = plano.bytesPerRow;
  final bytes = plano.bytes;
  final Uint8List saida;

  if (formato == InputImageFormat.bgra8888) {
    saida = Uint8List(w * h * 4);
    for (var y = 0; y < h; y++) {
      final origem = (y0 + y) * linha + x0 * 4;
      if (origem + w * 4 > bytes.length) return null;
      saida.setRange(y * w * 4, (y + 1) * w * 4, bytes, origem);
    }
  } else {
    // NV21: plano Y inteiro, seguido do plano VU intercalado em metade da
    // altura (cada par de bytes cobre um bloco 2×2).
    final tamanhoY = w * h;
    saida = Uint8List(tamanhoY + tamanhoY ~/ 2);
    for (var y = 0; y < h; y++) {
      final origem = (y0 + y) * linha + x0;
      if (origem + w > bytes.length) return null;
      saida.setRange(y * w, (y + 1) * w, bytes, origem);
    }
    final inicioVU = linha * alturaCrua;
    for (var y = 0; y < h ~/ 2; y++) {
      final origem = inicioVU + (y0 ~/ 2 + y) * linha + x0;
      if (origem + w > bytes.length) return null;
      saida.setRange(tamanhoY + y * w, tamanhoY + (y + 1) * w, bytes, origem);
    }
  }

  final girado = rotacao == InputImageRotation.rotation90deg ||
      rotacao == InputImageRotation.rotation270deg;
  return QuadroPreparado(
    InputImage.fromBytes(
      bytes: saida,
      metadata: InputImageMetadata(
        size: Size(w.toDouble(), h.toDouble()),
        rotation: rotacao,
        format: formato,
        bytesPerRow: formato == InputImageFormat.bgra8888 ? w * 4 : w,
      ),
    ),
    girado ? Size(h.toDouble(), w.toDouble()) : Size(w.toDouble(), h.toDouble()),
  );
}

/// No iOS a orientação do sensor já basta. No Android é preciso compensar a
/// orientação do aparelho — e o app está travado em retrato (ver `main.dart`),
/// então na prática a compensação é 0; o cálculo completo fica aqui para o dia
/// em que isso mudar.
InputImageRotation? _rotacao(
    CameraDescription camera, DeviceOrientation orientacao) {
  if (Platform.isIOS) {
    return InputImageRotationValue.fromRawValue(camera.sensorOrientation);
  }
  final compensacao = _compensacaoPorOrientacao[orientacao];
  if (compensacao == null) return null;
  final graus = camera.lensDirection == CameraLensDirection.front
      ? (camera.sensorOrientation + compensacao) % 360
      : (camera.sensorOrientation - compensacao + 360) % 360;
  return InputImageRotationValue.fromRawValue(graus);
}
