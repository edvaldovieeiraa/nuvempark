import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/di/providers.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/brisa.dart';
import '../../auth/data/token_storage.dart';
import '../../estadias/presentation/providers/estadias_provider.dart';
import '../../estadias/presentation/renovar_estadia_sheet.dart';
import '../../patio/domain/patio_model.dart';
import '../../patio/presentation/providers/patio_provider.dart';
import '../../printing/data/fila_impressao.dart';
import '../../printing/data/print_templates.dart';
import '../../printing/presentation/providers/printer_provider.dart';
import '../../sync/data/sync_engine.dart';
import '../data/entrada_service.dart';
import '../data/foto_entrada_service.dart';
import '../data/placa_ocr_service.dart';
import '../domain/leitura_rapida.dart';
import 'camera_placa_screen.dart';
import 'cupom_entrada.dart';
import 'providers/ticket_provider.dart';
import 'widgets/entrada_rapida_widgets.dart';

/// Modo rápido de entrada: a câmera fica aberta e a placa travada entra
/// sozinha depois de [_contagem], sem o operador tocar em nada.
///
/// Tempo de cada carro: ao travar, a foto e a checagem de "já no pátio"
/// começam JUNTAS com a contagem. Quando os 2 s acabam, quase sempre só resta
/// gravar (local, milissegundos) e religar a leitura. A checagem no servidor
/// tem prazo de [_prazoServidor] e cai no resultado do aparelho — sem isso,
/// cada carro novo esperaria o timeout de conexão com sinal ruim.
///
/// As decisões (contagem cancelada, pausa, contador) são da [LeituraRapida];
/// esta tela faz os efeitos. A câmera é a de sempre, com os ganchos do
/// [ModoRapidoCamera].
class EntradaRapidaScreen extends ConsumerStatefulWidget {
  const EntradaRapidaScreen({super.key});

  @override
  ConsumerState<EntradaRapidaScreen> createState() =>
      _EntradaRapidaScreenState();
}

class _EntradaRapidaScreenState extends ConsumerState<EntradaRapidaScreen> {
  static const _contagem = Duration(seconds: 2);
  static const _prazoServidor = Duration(milliseconds: 1500);

  final _fotoService = FotoEntradaService();
  final _ocrService = PlacaOcrService();
  final _camera = CameraPlacaController();
  late final _leitura = LeituraRapida(ignorar: _camera.ignorar);

  // Lidos com o widget vivo: a gravação pode terminar depois de a tela sair.
  late final EntradaService _servico;
  late final TokenStorage _storage;
  late final SyncEngine _sync;
  late final FilaImpressao _fila;
  late final PrinterNotifier _printer;

  PatioModel? _patio;
  Timer? _timer;
  Future<String?>? _foto;
  Future<AnaliseEntrada>? _analise;

  @override
  void initState() {
    super.initState();
    _servico = ref.read(entradaServiceProvider);
    _storage = ref.read(tokenStorageProvider);
    _sync = ref.read(syncEngineProvider);
    _fila = ref.read(filaImpressaoProvider);
    _printer = ref.read(printerNotifierProvider.notifier);
  }

  @override
  void dispose() {
    _timer?.cancel();
    if (_leitura.fase == FaseRapida.contagem) _descartarFoto();
    _ocrService.dispose();
    super.dispose();
  }

  // ── Ciclo de uma placa ──────────────────────────────────────────────────

  void _aoTravar(String placa) {
    final patio = _patio;
    if (patio == null || !_leitura.travou(placa)) return;
    setState(() {});

    _foto = _camera.capturarFoto();
    final analise = _servico.analisar(
      patioId: patio.id,
      placa: placa,
      prazoServidor: _prazoServidor,
    );
    _analise = analise;
    // Placa que pede decisão não precisa esperar a contagem acabar.
    unawaited(analise.then((a) {
      if (mounted && _leitura.placa == placa) _pausarSePrecisa(a, patio);
    }, onError: (_) {}));
    _timer = Timer(_contagem, () => _fimDaContagem(patio));
  }

  Future<void> _fimDaContagem(PatioModel patio) async {
    if (!mounted || !_leitura.contagemTerminou()) return;
    setState(() {});
    final placa = _leitura.placa!;
    final printerFuture = ref.read(printerNotifierProvider.future);

    final AnaliseEntrada analise;
    try {
      analise = await _analise!;
    } catch (_) {
      _descartarFoto();
      return _falhou('Não consegui verificar a placa $placa.');
    }
    if (_pausarSePrecisa(analise, patio)) return;
    final liberada = analise as EntradaLiberada;

    final foto = await _foto;
    try {
      final user = await _storage.readUser();
      if (user == null) {
        _descartarFoto();
        return _falhou('Sessão inválida. Entre novamente.');
      }
      final tipo = patio.tipoPadrao!;
      final r = await _servico.registrar(
        liberada,
        patioId: patio.id,
        tipoVeiculo: tipo,
        tarifaId: patio.tabelaAvulsaPadrao(tipo)?.id,
        operadorId: user.id,
        fotoEntradaPath: foto,
      );

      if (mounted) {
        ref.invalidate(ticketsAbertosProvider);
        ref.invalidate(hospedesProvider);
      }
      unawaited(_sync.drain());

      final hospede = liberada.hospede;
      if (patio.modoRapidoImprime) {
        unawaited(_fila.enfileirar(() => imprimirCupomEntrada(
              printerFuture: printerFuture,
              printerNotifier: _printer,
              ticketId: r.ticketId,
              placa: placa,
              tipoVeiculo: hospede?.tipoVeiculo ?? tipo,
              entrada: DateTime.now(),
              patio: patio,
              fotoPath: foto,
              estadia: hospede == null
                  ? null
                  : BlocoEstadia(
                      titulo: 'HOSPEDE',
                      validaAte: DateTime.fromMillisecondsSinceEpoch(
                          hospede.validaAteEpoch),
                    ),
            )));
      }

      unawaited(HapticFeedback.mediumImpact());
      _leitura.registrou(
          aviso: r.aviso ??
              (foto == null ? 'Entrou sem foto: a câmera falhou' : null));
      if (mounted) setState(() {});
      unawaited(_camera.retomarLeitura());
    } catch (_) {
      _apagar(foto);
      _falhou('Erro ao registrar a entrada de $placa.');
    }
  }

  /// Análise pediu decisão: pausa e abre a folha. Devolve se pausou.
  bool _pausarSePrecisa(AnaliseEntrada a, PatioModel patio) {
    final motivo = switch (a) {
      EntradaJaNoPatio() => MotivoPausa.jaNoPatio,
      EntradaHospedeVencido() => MotivoPausa.hospedeVencido,
      EntradaLiberada() => null,
    };
    if (motivo == null) return false;
    if (_leitura.fase == FaseRapida.pausado) return true; // já tratada
    _timer?.cancel();
    _leitura.pausou(motivo);
    setState(() {});
    unawaited(_resolverPausa(a));
    return true;
  }

  Future<void> _resolverPausa(AnaliseEntrada a) async {
    final placa = a.placa;
    final motivo = _leitura.motivo!;
    final acao = await mostrarPausaRapida(context, placa: placa, motivo: motivo);
    if (!mounted) return;

    var registrou = false;
    switch ((acao, a)) {
      case (AcaoPausa.irParaSaida, EntradaJaNoPatio(:final ticket)):
        _descartarFoto();
        await context.push(Routes.saidaDetalhe(ticket.id));
      case (AcaoPausa.renovar, EntradaHospedeVencido(:final hospede)):
        // A renovação registra a entrada junto, com a foto já tirada.
        final foto = await _foto;
        if (!mounted) return;
        registrou = await mostrarRenovarEstadia(
          context,
          estadia: hospede.estadia,
          origem: OrigemRenovacao.entrada,
          carroDentro: false,
          fotoEntradaPath: foto,
        );
        if (registrou) {
          ref.invalidate(ticketsAbertosProvider);
          ref.invalidate(hospedesProvider);
        } else {
          _descartarFoto();
        }
      default:
        _descartarFoto();
    }
    if (!mounted) return;
    _leitura.sairDaPausa(registrou: registrou);
    setState(() {});
    unawaited(_camera.retomarLeitura());
  }

  void _corrigir() {
    _timer?.cancel();
    _leitura.corrigir();
    _descartarFoto();
    setState(() {});
    unawaited(_camera.retomarLeitura());
  }

  void _aoSegundoPlano() {
    if (_leitura.fase != FaseRapida.contagem) return;
    _timer?.cancel();
    _descartarFoto();
    _leitura.segundoPlano();
    if (mounted) setState(() {});
  }

  void _falhou(String mensagem) {
    _leitura.falhou();
    if (!mounted) return;
    AppToast.error(context, mensagem);
    setState(() {});
    unawaited(_camera.retomarLeitura());
  }

  /// A foto da contagem não vai virar entrada: apaga o arquivo quando ele
  /// existir (a captura pode ainda estar em curso).
  void _descartarFoto() {
    final f = _foto;
    _foto = null;
    _analise = null;
    if (f != null) unawaited(f.then(_apagar, onError: (_) {}));
  }

  void _apagar(String? caminho) {
    if (caminho == null) return;
    File(caminho).delete().then((_) {}, onError: (_) {});
  }

  // ── Navegação ───────────────────────────────────────────────────────────

  void _aoSair(CapturaSaida saida) {
    if (saida is CapturaIndisponivel) {
      AppToast.error(context, 'Câmera indisponível. Use a entrada normal.');
      context.pushReplacement(Routes.entrada);
      return;
    }
    context.canPop() ? context.pop() : context.go(Routes.home);
  }

  void _entradaNormal() => context.pushReplacement(Routes.entrada);

  Future<void> _desligar() async {
    await _storage.saveModoRapido(false);
    ref.invalidate(modoRapidoLigadoProvider);
    if (mounted) context.pushReplacement(Routes.entrada);
  }

  // ── Tela ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final patio = ref.watch(patioNotifierProvider).value;
    _patio = patio;
    final motivo = patio == null
        ? 'Carregando o pátio…'
        : patio.motivoModoRapidoIndisponivel;
    if (motivo != null) return _indisponivel(motivo);

    return CameraPlacaScreen(
      ocrService: _ocrService,
      fotoService: _fotoService,
      rapido: ModoRapidoCamera(
        controller: _camera,
        aoTravar: _aoTravar,
        aoSair: _aoSair,
        aoSegundoPlano: _aoSegundoPlano,
        sobreposicao: (_) => _sobreposicao(),
        acoes: [
          _acaoBarra('Entrada normal', Icons.edit_note, _entradaNormal),
          const SizedBox(width: 6),
          _acaoBarra('Desligar', Icons.flash_off, _desligar),
        ],
      ),
    );
  }

  Widget _sobreposicao() {
    final ultima = _leitura.ultima;
    final placa = _leitura.placa;
    return Stack(
      children: [
        Positioned(
          top: 0,
          left: 16,
          right: 16,
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.only(top: 60),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ContadorRapido(
                    registradas: _leitura.registradas,
                    corrigidas: _leitura.corrigidas,
                  ),
                  if (ultima != null) ...[
                    const SizedBox(height: 8),
                    FaixaUltimaEntrada(placa: ultima.placa, aviso: ultima.aviso),
                  ],
                ],
              ),
            ),
          ),
        ),
        if (placa != null)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 24),
                child: Center(
                  child: switch (_leitura.fase) {
                    FaseRapida.contagem => PainelContagemRapida(
                        placa: placa,
                        duracao: _contagem,
                        onCorrigir: _corrigir,
                      ),
                    FaseRapida.registrando =>
                      PainelRegistrandoRapida(placa: placa),
                    _ => const SizedBox.shrink(),
                  },
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _acaoBarra(String rotulo, IconData icone, VoidCallback aoTocar) =>
      TextButton.icon(
        onPressed: aoTocar,
        icon: Icon(icone, size: 20),
        label: Text(rotulo,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        style: TextButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: Colors.black54,
          minimumSize: const Size(48, 44),
          padding: const EdgeInsets.symmetric(horizontal: 12),
        ),
      );

  Widget _indisponivel(String motivo) => Scaffold(
        appBar: appBarBrisa(context, 'Modo rápido'),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.flash_off, size: 48),
              const SizedBox(height: 12),
              Text(motivo,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16)),
              const SizedBox(height: 20),
              SizedBox(
                height: 52,
                child: FilledButton(
                  onPressed: _entradaNormal,
                  child: const Text('Entrada normal'),
                ),
              ),
            ],
          ),
        ),
      );
}
