import 'dart:async';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import '../data/foto_entrada_service.dart';
import '../data/placa_captura_processor.dart';
import '../data/placa_ocr_service.dart';
import 'widgets/plate_frame_overlay.dart';

/// Resultado da tela de captura de placa. Selado para o chamador tratar cada
/// desfecho: sucesso, cancelamento, ou câmera indisponível (→ fallback pro
/// image_picker da câmera do sistema).
sealed class CapturaSaida {
  const CapturaSaida();
}

/// Foto capturada e persistida ([fotoPath]); [placa] pode ser null se o OCR
/// não reconheceu — o operador digita.
class CapturaOk extends CapturaSaida {
  const CapturaOk({required this.fotoPath, this.placa});
  final String fotoPath;
  final String? placa;
}

/// Operador saiu sem capturar (botão voltar).
class CapturaCancelada extends CapturaSaida {
  const CapturaCancelada();
}

/// Câmera própria não pôde ser usada (sem permissão, sem hardware, falha de
/// init). O chamador deve cair no fluxo antigo (image_picker).
class CapturaIndisponivel extends CapturaSaida {
  const CapturaIndisponivel();
}

/// Câmera própria com preview + moldura-guia para captura de placa.
///
/// Recebe os serviços já vivos da tela de entrada (um só recognizer de OCR, uma
/// só instância de persistência) para não duplicar recursos nem o ciclo de vida.
class CameraPlacaScreen extends StatefulWidget {
  const CameraPlacaScreen({
    super.key,
    required this.ocrService,
    required this.fotoService,
  });

  final PlacaOcrService ocrService;
  final FotoEntradaService fotoService;

  @override
  State<CameraPlacaScreen> createState() => _CameraPlacaScreenState();
}

class _CameraPlacaScreenState extends State<CameraPlacaScreen>
    with WidgetsBindingObserver {
  CameraController? _controller;
  bool _iniciando = true;
  bool _capturando = false;
  // Tamanho da área de preview no momento do build — o crop de ROI mapeia a
  // moldura desta mesma área para a imagem capturada.
  Size _previewSize = Size.zero;

  // Zoom (pinça + botões) e foco por toque.
  double _zoom = 1;
  double _zoomMin = 1;
  double _zoomMax = 1;
  double _zoomBase = 1;
  Offset? _focoPonto;
  Timer? _focoTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _iniciar();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _focoTimer?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final c = _controller;
    if (c == null || !c.value.isInitialized) return;
    // Solta a câmera ao ir pro background e recria ao voltar — evita travar o
    // recurso e o "camera in use" ao retomar.
    if (state == AppLifecycleState.inactive) {
      c.dispose();
      _controller = null;
    } else if (state == AppLifecycleState.resumed) {
      _iniciar();
    }
  }

  Future<void> _iniciar() async {
    setState(() => _iniciando = true);
    try {
      final permissao = await Permission.camera.request();
      if (!permissao.isGranted) return _sair(const CapturaIndisponivel());

      final cams = await availableCameras();
      if (cams.isEmpty) return _sair(const CapturaIndisponivel());
      final cam = cams.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cams.first,
      );

      // veryHigh (~1920px) preserva/ultrapassa os 1600px da foto atual — não
      // regride qualidade da foto nem do OCR.
      final controller = CameraController(
        cam,
        ResolutionPreset.veryHigh,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      // Limites de zoom do device (pinça e botões respeitam este intervalo).
      _zoomMin = await controller.getMinZoomLevel();
      _zoomMax = await controller.getMaxZoomLevel();
      _zoom = _zoomBase = _zoomMin;
      setState(() {
        _controller = controller;
        _iniciando = false;
      });
    } catch (_) {
      // Sem hardware, permissão revogada em runtime, device ocupado, etc.:
      // não trava o operador — cai no fluxo antigo.
      _sair(const CapturaIndisponivel());
    }
  }

  void _sair(CapturaSaida saida) {
    if (mounted) Navigator.of(context).pop(saida);
  }

  Future<void> _capturar() async {
    final c = _controller;
    if (c == null || !c.value.isInitialized || _capturando) return;
    setState(() => _capturando = true);
    try {
      final shot = await c.takePicture();
      final processado = await PlacaCapturaProcessor(
        widget.fotoService,
        widget.ocrService,
      ).processar(arquivoBruto: shot.path, previewSize: _previewSize);
      _sair(CapturaOk(
        fotoPath: processado.fotoPath,
        placa: processado.placa,
      ));
    } catch (_) {
      if (mounted) {
        setState(() => _capturando = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível capturar. Tente de novo.')),
        );
      }
    }
  }

  // ── Foco por toque ──────────────────────────────────────────────────────
  Future<void> _focar(Offset local) async {
    final c = _controller;
    if (c == null || !c.value.isInitialized || _previewSize.isEmpty) return;
    final ponto = Offset(
      (local.dx / _previewSize.width).clamp(0.0, 1.0),
      (local.dy / _previewSize.height).clamp(0.0, 1.0),
    );
    try {
      await c.setFocusPoint(ponto);
      await c.setExposurePoint(ponto);
    } catch (_) {
      // Nem todo device suporta ponto de foco/exposição — ignora em silêncio.
    }
    if (!mounted) return;
    setState(() => _focoPonto = local);
    _focoTimer?.cancel();
    _focoTimer = Timer(const Duration(milliseconds: 1200), () {
      if (mounted) setState(() => _focoPonto = null);
    });
  }

  // ── Zoom (pinça + botões) ───────────────────────────────────────────────
  void _zoomInicio(ScaleStartDetails _) => _zoomBase = _zoom;

  Future<void> _zoomAtualiza(ScaleUpdateDetails d) async {
    if (d.pointerCount < 2) return; // pinça de 2 dedos; toque de 1 dedo = foco
    await _aplicarZoom(_zoomBase * d.scale);
  }

  Future<void> _aplicarZoom(double z) async {
    final c = _controller;
    if (c == null || !c.value.isInitialized) return;
    final alvo = z.clamp(_zoomMin, _zoomMax);
    if (alvo == _zoom) return;
    try {
      await c.setZoomLevel(alvo);
    } catch (_) {
      return;
    }
    if (mounted) setState(() => _zoom = alvo);
  }

  @override
  Widget build(BuildContext context) {
    final c = _controller;
    final pronto = c != null && c.value.isInitialized && !_iniciando;

    return Scaffold(
      backgroundColor: Colors.black,
      body: LayoutBuilder(
        builder: (context, constraints) {
          // Fonte do previewSize usado no crop: a moldura mede a MESMA área.
          _previewSize = Size(constraints.maxWidth, constraints.maxHeight);
          return Stack(
            fit: StackFit.expand,
            children: [
              if (pronto) _preview(c) else const _CameraCarregando(),
              // Camada de gestos (abaixo dos botões): 1 dedo = foco, 2 = zoom.
              if (pronto)
                Positioned.fill(
                  child: GestureDetector(
                    behavior: HitTestBehavior.translucent,
                    onTapUp: (d) => _focar(d.localPosition),
                    onScaleStart: _zoomInicio,
                    onScaleUpdate: _zoomAtualiza,
                  ),
                ),
              if (pronto)
                const PlateFrameOverlay(legenda: 'Enquadre a placa na moldura'),
              if (_focoPonto != null) _reticuloFoco(_focoPonto!),
              _barraSuperior(),
              if (pronto && _zoomMax > _zoomMin) _controlesZoom(),
              if (pronto) _barraInferior(),
              if (_capturando)
                Container(
                  color: Colors.black38,
                  child: const Center(
                    child: CircularProgressIndicator(color: Colors.white),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  /// Preview cobrindo a tela (BoxFit.cover). O recorte de ROI (Bloco 2) mapeia a
  /// moldura para a imagem assumindo esta mesma geometria de cover.
  Widget _preview(CameraController c) {
    return ClipRect(
      child: OverflowBox(
        maxWidth: double.infinity,
        maxHeight: double.infinity,
        child: FittedBox(
          fit: BoxFit.cover,
          child: SizedBox(
            width: 100,
            height: 100 * c.value.aspectRatio,
            child: CameraPreview(c),
          ),
        ),
      ),
    );
  }

  /// Retículo mostrado onde o operador tocou para focar (some após 1,2s).
  Widget _reticuloFoco(Offset pos) {
    return Positioned(
      left: pos.dx - 34,
      top: pos.dy - 34,
      child: IgnorePointer(
        child: Container(
          width: 68,
          height: 68,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: const Color(0xFF34D399), width: 2),
          ),
        ),
      ),
    );
  }

  /// Botões de zoom (+/−) e nível atual. A pinça mexe no mesmo estado.
  Widget _controlesZoom() {
    return SafeArea(
      child: Align(
        alignment: Alignment.centerRight,
        child: Padding(
          padding: const EdgeInsets.only(right: 12),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.black45,
              borderRadius: BorderRadius.circular(24),
            ),
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.add, color: Colors.white),
                  onPressed: () => _aplicarZoom(_zoom + _passoZoom),
                ),
                Text(
                  '${_zoom.toStringAsFixed(1)}x',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.remove, color: Colors.white),
                  onPressed: () => _aplicarZoom(_zoom - _passoZoom),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Passo do botão: 1/4 do intervalo de zoom do device (mín. 0,5x).
  double get _passoZoom {
    final passo = (_zoomMax - _zoomMin) / 4;
    return passo < 0.5 ? 0.5 : passo;
  }

  Widget _barraSuperior() {
    return SafeArea(
      child: Align(
        alignment: Alignment.topLeft,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: IconButton(
            icon: const Icon(Icons.close, color: Colors.white, size: 28),
            onPressed: () => _sair(const CapturaCancelada()),
          ),
        ),
      ),
    );
  }

  Widget _barraInferior() {
    return SafeArea(
      child: Align(
        alignment: Alignment.bottomCenter,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 32),
          child: GestureDetector(
            onTap: _capturando ? null : _capturar,
            child: Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
                border: Border.all(color: const Color(0xFF34D399), width: 4),
              ),
              child: const Icon(Icons.photo_camera,
                  color: Color(0xFF059669), size: 34),
            ),
          ),
        ),
      ),
    );
  }
}

class _CameraCarregando extends StatelessWidget {
  const _CameraCarregando();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: Colors.black,
      child: Center(child: CircularProgressIndicator(color: Colors.white)),
    );
  }
}
