import 'package:flutter/material.dart';

import '../../domain/roi_mapper.dart';

/// Overlay da câmera de placa: escurece tudo fora da moldura-guia e desenha
/// cantos estilo leitor de QR. Puramente visual — não intercepta toques (o
/// foco/zoom do Bloco 3 vivem na tela, abaixo deste overlay).
class PlateFrameOverlay extends StatelessWidget {
  const PlateFrameOverlay({super.key, this.legenda});

  /// Texto de instrução mostrado abaixo da moldura (ex.: "Enquadre a placa").
  final String? legenda;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final size = Size(constraints.maxWidth, constraints.maxHeight);
          final rect = plateGuideRect(size);
          return Stack(
            children: [
              Positioned.fill(
                child: CustomPaint(painter: _MolduraPainter(rect)),
              ),
              if (legenda != null)
                Positioned(
                  left: 0,
                  right: 0,
                  top: rect.bottom + 20,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        legenda!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _MolduraPainter extends CustomPainter {
  _MolduraPainter(this.rect);

  final Rect rect;

  static const _corCanto = Color(0xFF34D399); // verde NuvemPark
  static const double _raio = 16;
  static const double _cantoLen = 30;
  static const double _cantoEsp = 4;

  @override
  void paint(Canvas canvas, Size size) {
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(_raio));

    // Escurece tudo FORA da moldura (evenOdd: retângulo cheio menos o furo).
    final scrim = Path()
      ..addRect(Offset.zero & size)
      ..addRRect(rrect)
      ..fillType = PathFillType.evenOdd;
    canvas.drawPath(scrim, Paint()..color = Colors.black.withValues(alpha: 0.55));

    // Contorno sutil da moldura.
    canvas.drawRRect(
      rrect,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..color = Colors.white.withValues(alpha: 0.5),
    );

    // Cantos estilo scanner.
    final canto = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = _cantoEsp
      ..strokeCap = StrokeCap.round
      ..color = _corCanto;
    _desenharCantos(canvas, rect, canto);
  }

  void _desenharCantos(Canvas canvas, Rect r, Paint paint) {
    const l = _cantoLen;
    const rr = _raio;
    // Superior esquerdo
    canvas.drawPath(
      Path()
        ..moveTo(r.left, r.top + rr + l)
        ..lineTo(r.left, r.top + rr)
        ..arcToPoint(Offset(r.left + rr, r.top),
            radius: const Radius.circular(rr))
        ..lineTo(r.left + rr + l, r.top),
      paint,
    );
    // Superior direito
    canvas.drawPath(
      Path()
        ..moveTo(r.right - rr - l, r.top)
        ..lineTo(r.right - rr, r.top)
        ..arcToPoint(Offset(r.right, r.top + rr),
            radius: const Radius.circular(rr))
        ..lineTo(r.right, r.top + rr + l),
      paint,
    );
    // Inferior direito
    canvas.drawPath(
      Path()
        ..moveTo(r.right, r.bottom - rr - l)
        ..lineTo(r.right, r.bottom - rr)
        ..arcToPoint(Offset(r.right - rr, r.bottom),
            radius: const Radius.circular(rr))
        ..lineTo(r.right - rr - l, r.bottom),
      paint,
    );
    // Inferior esquerdo
    canvas.drawPath(
      Path()
        ..moveTo(r.left + rr + l, r.bottom)
        ..lineTo(r.left + rr, r.bottom)
        ..arcToPoint(Offset(r.left, r.bottom - rr),
            radius: const Radius.circular(rr))
        ..lineTo(r.left, r.bottom - rr - l),
      paint,
    );
  }

  @override
  bool shouldRepaint(_MolduraPainter old) => old.rect != rect;
}
