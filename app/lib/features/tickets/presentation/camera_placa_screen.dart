import 'dart:async';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import '../data/foto_entrada_service.dart';
import '../data/placa_captura_processor.dart';
import '../data/placa_ocr_service.dart';
import '../data/quadro_ocr.dart';
import '../domain/roi_mapper.dart';
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

  // ── Leitura ao vivo ─────────────────────────────────────────────────────
  // O fluxo entrega quadros muito mais rápido do que o OCR consegue processar.
  // `_lendo` descarta os que chegam durante uma leitura, e o intervalo evita
  // ocupar a CPU sem parar — a resolução aqui é alta (escolha do produto), o
  // que torna cada leitura mais cara e o ritmo mais folgado, obrigatório.
  static const Duration _intervaloLeitura = Duration(milliseconds: 400);

  // Uma leitura só oscila entre quadros. Exigir a MESMA placa algumas vezes
  // dentro de uma janela curta é o que separa "achou algo" de "leu direito".
  static const int _repeticoesParaEstavel = 3;
  static const int _janelaHistorico = 5;

  // Folga ao redor da moldura ao filtrar candidatos (mesma da foto): a placa
  // pode encostar na borda do guia sem estar fora dele.
  static const double _margemRoi = 0.15;

  CameraDescription? _camera;
  bool _lendo = false;
  DateTime _ultimaLeitura = DateTime.fromMillisecondsSinceEpoch(0);
  final List<String> _historico = [];
  /// Última placa reconhecida — mostrada ao vivo, ainda sem confiança.
  String? _placaAoVivo;
  /// Placa travada: repetiu o bastante e a leitura PAUSOU, aguardando o
  /// operador confirmar ou corrigir. Sem disparo automático — o valor não pode
  /// mudar debaixo do dedo dele enquanto decide.
  String? _placaTravada;

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
    // `dispose` do controller já encerra o fluxo de quadros.
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
      //
      // O formato NÃO é mais JPEG: a leitura ao vivo consome os bytes crus do
      // fluxo, e o ML Kit só aceita NV21 (Android) ou BGRA8888 (iOS). Isso não
      // afeta a foto — `takePicture` continua devolvendo JPEG.
      final controller = CameraController(
        cam,
        ResolutionPreset.veryHigh,
        enableAudio: false,
        imageFormatGroup: formatoDeLeituraAoVivo,
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
        _camera = cam;
        _iniciando = false;
      });

      // Leitura ao vivo. Falhar aqui não pode derrubar a tela: sem o fluxo, a
      // captura manual continua funcionando exatamente como antes.
      try {
        await controller.startImageStream(_processarQuadro);
      } catch (_) {/* segue no modo manual */}
    } catch (_) {
      // Sem hardware, permissão revogada em runtime, device ocupado, etc.:
      // não trava o operador — cai no fluxo antigo.
      _sair(const CapturaIndisponivel());
    }
  }

  void _sair(CapturaSaida saida) {
    if (mounted) Navigator.of(context).pop(saida);
  }

  // ── Leitura ao vivo ─────────────────────────────────────────────────────

  /// Chamado a cada quadro do fluxo — muitos por segundo. Tudo aqui é
  /// deliberadamente barato até passar pelos dois filtros (ocupado / intervalo),
  /// porque o custo real é o OCR.
  Future<void> _processarQuadro(CameraImage quadro) async {
    if (_lendo || _capturando || _placaTravada != null) return;
    final agora = DateTime.now();
    if (agora.difference(_ultimaLeitura) < _intervaloLeitura) return;

    final c = _controller;
    final cam = _camera;
    if (c == null || cam == null || _previewSize.isEmpty) return;

    _lendo = true;
    _ultimaLeitura = agora;
    try {
      // A MESMA moldura que o operador vê, levada para os pixels da imagem. O
      // quadro é RECORTADO nela antes do OCR — não basta filtrar candidatos por
      // posição: sem o recorte, o ML Kit analisa a cena inteira reduzida e erra
      // caracteres (acerta o formato, troca letras), que foi o que apareceu no
      // teste em campo.
      final preparado = prepararQuadro(
        quadro: quadro,
        camera: cam,
        orientacao: c.value.deviceOrientation,
        roi: (tamanho) => rectComMargem(
          mapPreviewRectToImage(
            plateGuideRect(_previewSize),
            _previewSize,
            tamanho,
            BoxFit.cover,
          ),
          _margemRoi,
          tamanho,
        ),
      );
      if (preparado == null) return; // formato inesperado: descarta o quadro

      // Sem `roi` aqui: a imagem JÁ é a moldura.
      final placa = await widget.ocrService.lerPlacaDeQuadro(preparado.entrada);
      if (placa != null && mounted) _registrarLeitura(placa);
    } catch (_) {
      // Um quadro ruim não pode matar a leitura contínua.
    } finally {
      _lendo = false;
    }
  }

  /// Guarda a leitura e trava quando ela se repete. A janela é curta de
  /// propósito: ao mover a câmera para outro carro, as leituras antigas saem
  /// rápido e não contaminam a placa nova.
  void _registrarLeitura(String placa) {
    _historico.add(placa);
    if (_historico.length > _janelaHistorico) _historico.removeAt(0);

    final repeticoes = _historico.where((p) => p == placa).length;
    setState(() {
      _placaAoVivo = placa;
      if (repeticoes >= _repeticoesParaEstavel) _placaTravada = placa;
    });
  }

  /// Operador recusou a placa travada: descarta o histórico para ela não travar
  /// de novo no quadro seguinte e volta a ler.
  void _corrigir() {
    setState(() {
      _placaTravada = null;
      _placaAoVivo = null;
      _historico.clear();
    });
  }

  Future<void> _pararFluxo(CameraController c) async {
    if (!c.value.isStreamingImages) return;
    try {
      await c.stopImageStream();
    } catch (_) {/* já parado ou controller morrendo */}
  }

  Future<void> _capturar({String? placaJaLida}) async {
    final c = _controller;
    if (c == null || !c.value.isInitialized || _capturando) return;
    setState(() => _capturando = true);
    try {
      // O fluxo precisa parar ANTES da foto: as duas coisas disputam a câmera,
      // e em alguns aparelhos `takePicture` falha com o stream ativo.
      await _pararFluxo(c);
      final shot = await c.takePicture();
      final processado = await PlacaCapturaProcessor(
        widget.fotoService,
        widget.ocrService,
      ).processar(
        arquivoBruto: shot.path,
        previewSize: _previewSize,
        placaJaLida: placaJaLida,
      );
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
                PlateFrameOverlay(
                  legenda: _placaTravada != null
                      ? 'Placa reconhecida — confirme a foto'
                      : 'Enquadre a placa na moldura',
                ),
              if (pronto) _leituraAoVivo(),
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

  /// Painel da leitura contínua, logo abaixo da moldura.
  ///
  /// Enquanto lê, mostra a placa em cinza — é o retorno que permite ao operador
  /// se aproximar quando está saindo errada. Ao travar, fica verde e conta os
  /// segundos até a captura, com "Corrigir" para abortar.
  Widget _leituraAoVivo() {
    final travada = _placaTravada;
    final texto = travada ?? _placaAoVivo;
    if (texto == null) return const SizedBox.shrink();

    final verde = travada != null;
    return Positioned(
      left: 0,
      right: 0,
      bottom: 148,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          IgnorePointer(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
              decoration: BoxDecoration(
                color: verde ? const Color(0xFF16A34A) : Colors.black54,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: verde ? Colors.white : Colors.white24,
                  width: verde ? 2 : 1,
                ),
              ),
              child: Text(
                texto,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 3,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          if (verde)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextButton.icon(
                  onPressed: _corrigir,
                  icon: const Icon(Icons.refresh, color: Colors.white, size: 19),
                  label: const Text('Corrigir',
                      style: TextStyle(color: Colors.white, fontSize: 15)),
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.black54,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 12),
                  ),
                ),
                const SizedBox(width: 12),
                FilledButton.icon(
                  onPressed: _capturando
                      ? null
                      : () => _capturar(placaJaLida: travada),
                  icon: const Icon(Icons.check, size: 20),
                  label: const Text('Confirmar',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF15803D),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 26, vertical: 12),
                  ),
                ),
              ],
            )
          else
            IgnorePointer(
              child: Text(
                'Lendo… aproxime a câmera',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.9),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
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
          // A captura é sempre do operador. Quando a leitura ao vivo já tem uma
          // placa estável, ela vai junto e o OCR da foto é dispensado; sem ela,
          // o fluxo é exatamente o de antes (foto → OCR).
          child: GestureDetector(
            onTap: _capturando
                ? null
                : () => _capturar(placaJaLida: _placaTravada),
            child: Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
                border: Border.all(
                  color: _placaTravada != null
                      ? const Color(0xFF16A34A)
                      : const Color(0xFF34D399),
                  width: _placaTravada != null ? 6 : 4,
                ),
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
