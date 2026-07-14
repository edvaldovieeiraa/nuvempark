import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/tickets/domain/roi_mapper.dart';

void main() {
  group('plateGuideRect', () {
    test('respeita a proporção da placa (largura/altura ≈ 3,1)', () {
      final r = plateGuideRect(const Size(400, 800));
      expect(r.width / r.height, closeTo(kPlacaAspecto, 0.001));
    });

    test('centraliza horizontalmente na área de preview', () {
      const preview = Size(400, 800);
      final r = plateGuideRect(preview);
      expect(r.center.dx, closeTo(preview.width / 2, 0.001));
      expect(r.width, closeTo(preview.width * 0.82, 0.001));
    });

    test('fica dentro dos limites do preview', () {
      final r = plateGuideRect(const Size(360, 640));
      expect(r.left, greaterThanOrEqualTo(0));
      expect(r.top, greaterThanOrEqualTo(0));
      expect(r.right, lessThanOrEqualTo(360));
      expect(r.bottom, lessThanOrEqualTo(640));
    });
  });

  group('mapPreviewRectToImage — cover', () {
    test('aspectos idênticos → mapeamento 1:1 (escala da imagem)', () {
      // preview 100×300, imagem 200×600 (mesmo aspecto). Escala cover = 2.
      const preview = Size(100, 300);
      const image = Size(200, 600);
      final r = mapPreviewRectToImage(
        const Rect.fromLTRB(10, 30, 90, 270),
        preview,
        image,
        BoxFit.cover,
      );
      expect(r.left, closeTo(20, 0.001));
      expect(r.top, closeTo(60, 0.001));
      expect(r.right, closeTo(180, 0.001));
      expect(r.bottom, closeTo(540, 0.001));
    });

    test('imagem mais larga que o preview → corta as laterais', () {
      // preview 100×100 (quadrado), imagem 200×100 (2:1). cover escala = 1.
      // A imagem exibida transborda 100px na largura (50 de cada lado).
      const preview = Size(100, 100);
      const image = Size(200, 100);
      final r = mapPreviewRectToImage(
        const Rect.fromLTRB(0, 0, 100, 100),
        preview,
        image,
        BoxFit.cover,
      );
      // A faixa visível é o miolo horizontal [50, 150] da imagem de 200px.
      expect(r.left, closeTo(50, 0.001));
      expect(r.right, closeTo(150, 0.001));
      expect(r.top, closeTo(0, 0.001));
      expect(r.bottom, closeTo(100, 0.001));
    });

    test('imagem mais alta que o preview → corta topo e base', () {
      // preview 100×100, imagem 100×200. cover escala = 1; transborda 100 na
      // altura (50 em cima, 50 embaixo).
      const preview = Size(100, 100);
      const image = Size(100, 200);
      final r = mapPreviewRectToImage(
        const Rect.fromLTRB(0, 0, 100, 100),
        preview,
        image,
        BoxFit.cover,
      );
      expect(r.top, closeTo(50, 0.001));
      expect(r.bottom, closeTo(150, 0.001));
      expect(r.left, closeTo(0, 0.001));
      expect(r.right, closeTo(100, 0.001));
    });
  });

  group('mapPreviewRectToImage — contain', () {
    test('letterbox: a faixa exibida mapeia para a imagem inteira', () {
      // preview 100×100, imagem 200×100. contain escala = 0.5; imagem exibida
      // 100×50, centralizada com barras de 25px em cima/embaixo.
      const preview = Size(100, 100);
      const image = Size(200, 100);
      final r = mapPreviewRectToImage(
        const Rect.fromLTRB(0, 25, 100, 75),
        preview,
        image,
        BoxFit.contain,
      );
      expect(r.left, closeTo(0, 0.001));
      expect(r.top, closeTo(0, 0.001));
      expect(r.right, closeTo(200, 0.001));
      expect(r.bottom, closeTo(100, 0.001));
    });
  });

  group('rectComMargem', () {
    test('expande por fração de cada lado', () {
      final r = rectComMargem(
        const Rect.fromLTRB(100, 100, 200, 140),
        0.15,
        const Size(1000, 1000),
      );
      // margem x = 100*0.15 = 15; margem y = 40*0.15 = 6.
      expect(r.left, closeTo(85, 0.001));
      expect(r.right, closeTo(215, 0.001));
      expect(r.top, closeTo(94, 0.001));
      expect(r.bottom, closeTo(146, 0.001));
    });

    test('prende aos limites da imagem (não sai da área)', () {
      final r = rectComMargem(
        const Rect.fromLTRB(5, 5, 95, 45),
        0.5,
        const Size(100, 60),
      );
      expect(r.left, greaterThanOrEqualTo(0));
      expect(r.top, greaterThanOrEqualTo(0));
      expect(r.right, lessThanOrEqualTo(100));
      expect(r.bottom, lessThanOrEqualTo(60));
    });
  });
}
