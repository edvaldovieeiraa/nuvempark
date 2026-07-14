import 'package:flutter/painting.dart' show BoxFit, Rect, Size;

/// Proporção de uma placa Mercosul (400mm × 130mm ≈ 3,08). Arredondado para
/// 3,1 — a moldura é um guia de enquadramento, não uma medida exata.
const double kPlacaAspecto = 3.1;

/// Retângulo da moldura-guia dentro de uma área de preview de tamanho [preview].
///
/// Fonte ÚNICA da geometria: o pintor da moldura desenha exatamente este
/// retângulo e o recorte de ROI mapeia exatamente este retângulo para a imagem.
/// Assim não há divergência entre o que o operador vê e o que o OCR lê.
///
/// Largura = 82% da tela; altura derivada do aspecto da placa; centralizado,
/// levemente acima do meio (ergonomia: a mão do operador não cobre a placa).
Rect plateGuideRect(Size preview) {
  final w = preview.width * 0.82;
  final h = w / kPlacaAspecto;
  final left = (preview.width - w) / 2;
  // 46% da altura (um pouco acima do centro), com piso para não colar no topo.
  final top = (preview.height * 0.46 - h / 2).clamp(0.0, preview.height - h);
  return Rect.fromLTWH(left, top, w, h);
}

/// Mapeia [previewRect] (coordenadas do widget de preview) para coordenadas de
/// PIXEL da imagem [imageSize], considerando o [fit] com que a imagem preenche
/// o preview. O preview da câmera usa [BoxFit.cover]; [BoxFit.contain] também é
/// suportado. Para outros valores, trata como cover.
///
/// Não presume que preview e imagem tenham o mesmo aspecto — é justamente por
/// diferirem que existe o mapeamento. O resultado pode extrapolar os limites da
/// imagem (bordas cortadas pelo cover); use [rectComMargem] para prender.
Rect mapPreviewRectToImage(
  Rect previewRect,
  Size previewSize,
  Size imageSize,
  BoxFit fit,
) {
  final s = fit == BoxFit.contain
      ? _minEscala(previewSize, imageSize)
      : _maxEscala(previewSize, imageSize);

  // Imagem exibida (escalada) centralizada no preview.
  final dx = (previewSize.width - imageSize.width * s) / 2;
  final dy = (previewSize.height - imageSize.height * s) / 2;

  // Ponto no preview → ponto na imagem: (p − deslocamento) / escala.
  return Rect.fromLTRB(
    (previewRect.left - dx) / s,
    (previewRect.top - dy) / s,
    (previewRect.right - dx) / s,
    (previewRect.bottom - dy) / s,
  );
}

/// Expande [r] por [frac] (fração da largura/altura) de cada lado, preso aos
/// limites `[0, bounds]`. Usado para dar folga à ROI antes do OCR.
Rect rectComMargem(Rect r, double frac, Size bounds) {
  final mx = r.width * frac;
  final my = r.height * frac;
  return Rect.fromLTRB(
    (r.left - mx).clamp(0.0, bounds.width),
    (r.top - my).clamp(0.0, bounds.height),
    (r.right + mx).clamp(0.0, bounds.width),
    (r.bottom + my).clamp(0.0, bounds.height),
  );
}

double _maxEscala(Size preview, Size image) {
  final sx = preview.width / image.width;
  final sy = preview.height / image.height;
  return sx > sy ? sx : sy;
}

double _minEscala(Size preview, Size image) {
  final sx = preview.width / image.width;
  final sy = preview.height / image.height;
  return sx < sy ? sx : sy;
}
