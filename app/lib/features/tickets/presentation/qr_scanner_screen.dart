import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../core/theme/app_colors.dart';

/// Scanner de QR em tela cheia. Fecha (pop) com o valor lido (String).
class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  // autoStart DESLIGADO: com ele ligado, o MobileScanner também chama start()
  // e os dois disparos correm — o segundo lança controllerInitializing.
  final _ctrl = MobileScannerController(autoStart: false);
  bool _hasScanned = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(_ctrl.start());
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_hasScanned) return;
    final raw = capture.barcodes.firstOrNull?.rawValue;
    if (raw != null && raw.isNotEmpty) {
      _hasScanned = true;
      HapticFeedback.mediumImpact();
      Navigator.of(context).pop(raw);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.black,
          foregroundColor: Colors.white,
          title: const Text('Ler QR Code do Ticket'),
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.of(context).pop(),
          ),
          actions: [
            ValueListenableBuilder<MobileScannerState>(
              valueListenable: _ctrl,
              builder: (context, state, _) {
                final ligada = state.torchState == TorchState.on;
                return IconButton(
                  icon: Icon(
                    ligada ? Icons.flash_on_rounded : Icons.flash_off_rounded,
                    color: ligada ? AppColors.secondary : Colors.white,
                  ),
                  tooltip: 'Lanterna',
                  onPressed: () => _ctrl.toggleTorch(),
                );
              },
            ),
          ],
        ),
        body: Stack(
          children: [
            MobileScanner(
              controller: _ctrl,
              onDetect: _onDetect,
              errorBuilder: (context, error) => _ScannerError(
                error: error,
                onRetry: () async {
                  await _ctrl.stop();
                  await _ctrl.start();
                },
              ),
            ),
            CustomPaint(
              painter: _ScanOverlayPainter(),
              child: const SizedBox.expand(),
            ),
            Positioned(
              bottom: 48,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: const Text(
                    'Aponte para o QR Code do ticket',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
}

class _ScannerError extends StatelessWidget {
  const _ScannerError({required this.error, required this.onRetry});

  final MobileScannerException error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final semPermissao =
        error.errorCode == MobileScannerErrorCode.permissionDenied;

    return Container(
      color: Colors.black,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            semPermissao
                ? Icons.no_photography_rounded
                : Icons.videocam_off_rounded,
            size: 56,
            color: Colors.white54,
          ),
          const SizedBox(height: 16),
          Text(
            semPermissao
                ? 'Permita o acesso à câmera para ler o QR Code do ticket.'
                : 'Não foi possível abrir a câmera.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w600,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${error.errorCode.name}'
            '${error.errorDetails?.message != null ? ' · ${error.errorDetails!.message}' : ''}',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white38, fontSize: 11),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 48,
            child: FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
              onPressed: semPermissao ? openAppSettings : onRetry,
              icon: Icon(semPermissao
                  ? Icons.settings_rounded
                  : Icons.refresh_rounded),
              label: Text(
                  semPermissao ? 'Abrir configurações' : 'Tentar novamente'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScanOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final side = size.width * 0.65;
    final left = (size.width - side) / 2;
    final top = (size.height - side) / 2 - 40;
    final window = Rect.fromLTWH(left, top, side, side);

    final paint = Paint()..color = Colors.black54;

    canvas
      ..drawRect(Rect.fromLTWH(0, 0, size.width, window.top), paint)
      ..drawRect(
        Rect.fromLTWH(0, window.bottom, size.width, size.height - window.bottom),
        paint,
      )
      ..drawRect(Rect.fromLTWH(0, window.top, window.left, side), paint)
      ..drawRect(
        Rect.fromLTWH(window.right, window.top, size.width - window.right, side),
        paint,
      );

    final corner = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    const len = 24.0;
    final r = window;

    canvas
      ..drawLine(r.topLeft, r.topLeft.translate(len, 0), corner)
      ..drawLine(r.topLeft, r.topLeft.translate(0, len), corner)
      ..drawLine(r.topRight, r.topRight.translate(-len, 0), corner)
      ..drawLine(r.topRight, r.topRight.translate(0, len), corner)
      ..drawLine(r.bottomLeft, r.bottomLeft.translate(len, 0), corner)
      ..drawLine(r.bottomLeft, r.bottomLeft.translate(0, -len), corner)
      ..drawLine(r.bottomRight, r.bottomRight.translate(-len, 0), corner)
      ..drawLine(r.bottomRight, r.bottomRight.translate(0, -len), corner);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
