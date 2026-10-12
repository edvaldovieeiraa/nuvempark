import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/features/tickets/data/foto_entrada_service.dart';
import 'package:nuvempark_app/features/tickets/data/placa_ocr_service.dart';
import 'package:nuvempark_app/features/tickets/presentation/camera_placa_screen.dart';

/// A permissão de câmera vem NEGADA no teste: toda tentativa de abrir a câmera
/// termina em "indisponível" — e é isso que conta quantas vezes ela TENTOU.
void main() {
  testWidgets('volta do segundo plano recria a câmera', (tester) async {
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      const MethodChannel('flutter.baseflow.com/permissions/methods'),
      (chamada) async => {1: 0}, // câmera (1) → negada (0)
    );
    final saidas = <CapturaSaida>[];
    await tester.pumpWidget(MaterialApp(
      home: CameraPlacaScreen(
        ocrService: PlacaOcrService(),
        fotoService: FotoEntradaService(),
        rapido: ModoRapidoCamera(
          controller: CameraPlacaController(),
          aoTravar: (_) {},
          aoSair: saidas.add,
          sobreposicao: (_) => const SizedBox.shrink(),
        ),
      ),
    ));
    await tester.pump(const Duration(milliseconds: 50));
    expect(saidas, hasLength(1), reason: 'a abertura inicial tentou');

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    await tester.pump(const Duration(milliseconds: 50));
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump(const Duration(milliseconds: 50));

    expect(saidas, hasLength(2),
        reason: 'ao voltar, a câmera tem de tentar abrir de novo');
    expect(saidas.every((s) => s is CapturaIndisponivel), isTrue);
  });
}
