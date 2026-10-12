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
import 'ciclo_entrada_rapida.dart';
import 'cupom_entrada.dart';
import 'providers/ticket_provider.dart';
import 'widgets/entrada_rapida_widgets.dart';

/// Modo rápido de entrada: a câmera fica aberta e a placa travada entra
/// sozinha depois de [_contagem], sem o operador tocar em nada.
///
/// O ciclo de cada placa (contagem, foto e checagem em paralelo, gravação,
/// pausa) e as corridas entre eles são do [CicloEntradaRapida], testado sem
/// tela. Esta tela só fornece os efeitos: câmera, serviço de entrada, folha de
/// decisão, cupom e avisos. A câmera é a de sempre, com os ganchos do
/// [ModoRapidoCamera].
///
/// A checagem de "já no pátio" no servidor tem prazo de [_prazoServidor] e
/// cai no resultado do aparelho — sem isso, cada carro novo esperaria o
/// timeout de conexão com sinal ruim.
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
  late final CicloEntradaRapida _ciclo;

  // Lidos com o widget vivo: a gravação pode terminar depois de a tela sair.
  late final EntradaService _servico;
  late final TokenStorage _storage;
  late final SyncEngine _sync;
  late final FilaImpressao _fila;
  late final PrinterNotifier _printer;

  /// Último pátio carregado. Uma recarga (bootstrap) passa por "sem valor" —
  /// não pode derrubar a câmera no meio de uma contagem.
  PatioModel? _patio;

  @override
  void initState() {
    super.initState();
    _servico = ref.read(entradaServiceProvider);
    _storage = ref.read(tokenStorageProvider);
    _sync = ref.read(syncEngineProvider);
    _fila = ref.read(filaImpressaoProvider);
    _printer = ref.read(printerNotifierProvider.notifier);
    _ciclo = CicloEntradaRapida(
      leitura: _leitura,
      contagem: _contagem,
      capturarFoto: _camera.capturarFoto,
      analisar: (placa) => _servico.analisar(
        patioId: _patio!.id,
        placa: placa,
        prazoServidor: _prazoServidor,
      ),
      registrar: _registrar,
      aposRegistrar: _aposRegistrar,
      resolverPausa: _resolverPausa,
      retomarLeitura: () => unawaited(_camera.retomarLeitura()),
      apagarFoto: (caminho) =>
          File(caminho).delete().then((_) {}, onError: (_) {}),
      avisarFalha: (mensagem) {
        if (mounted) AppToast.error(context, mensagem);
      },
      mudou: () {
        if (mounted) setState(() {});
      },
    );
  }

  @override
  void dispose() {
    _ciclo.encerrar();
    _ocrService.dispose();
    super.dispose();
  }

  // ── Efeitos do ciclo ────────────────────────────────────────────────────

  Future<EntradaRegistrada> _registrar(EntradaLiberada a, String? foto) async {
    final patio = _patio!;
    final user = await _storage.readUser();
    if (user == null) throw StateError('sessão inválida');
    final tipo = patio.tipoPadrao!;
    return _servico.registrar(
      a,
      patioId: patio.id,
      tipoVeiculo: tipo,
      tarifaId: patio.tabelaAvulsaPadrao(tipo)?.id,
      operadorId: user.id,
      fotoEntradaPath: foto,
    );
  }

  void _aposRegistrar(EntradaRegistrada r, EntradaLiberada a, String? foto) {
    final patio = _patio!;
    unawaited(_sync.drain());
    unawaited(HapticFeedback.mediumImpact());
    if (!mounted) return;
    ref.invalidate(ticketsAbertosProvider);
    ref.invalidate(hospedesProvider);

    // Escolha do aparelho (Menu → Configurações); carregando, imprime — o
    // padrão de sempre.
    if (!(ref.read(modoRapidoImprimeProvider).value ?? true)) return;
    final hospede = a.hospede;
    final tipo = hospede?.tipoVeiculo ?? patio.tipoPadrao!;
    final printerFuture = ref.read(printerNotifierProvider.future);
    unawaited(_fila.enfileirar(() => imprimirCupomEntrada(
          printerFuture: printerFuture,
          printerNotifier: _printer,
          ticketId: r.ticketId,
          placa: a.placa,
          tipoVeiculo: tipo,
          entrada: DateTime.now(),
          patio: patio,
          // Sem toque no modo rápido: com a foto "o operador decide", ela não
          // sai no cupom (sai com "sempre").
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

  /// Folha de decisão e a escolha. Devolve se a entrada foi registrada.
  Future<bool> _resolverPausa(
      AnaliseEntrada a, Future<String?> fotoFutura) async {
    if (!mounted) return false;
    final motivo = _leitura.motivo!;
    final acao =
        await mostrarPausaRapida(context, placa: a.placa, motivo: motivo);
    if (!mounted) return false;

    switch ((acao, a)) {
      case (AcaoPausa.irParaSaida, EntradaJaNoPatio(:final ticket)):
        await context.push(Routes.saidaDetalhe(ticket.id));
        return false;
      case (AcaoPausa.renovar, EntradaHospedeVencido(:final hospede)):
        // A renovação registra a entrada junto, com a foto já tirada.
        final foto = await fotoFutura;
        if (!mounted) return false;
        final renovou = await mostrarRenovarEstadia(
          context,
          estadia: hospede.estadia,
          origem: OrigemRenovacao.entrada,
          carroDentro: false,
          fotoEntradaPath: foto,
        );
        if (renovou && mounted) {
          ref.invalidate(ticketsAbertosProvider);
          ref.invalidate(hospedesProvider);
        }
        return renovou;
      default:
        return false;
    }
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

  // ── Tela ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    // Já carrega a escolha de imprimir: o cupom do 1º carro lê daqui.
    ref.watch(modoRapidoImprimeProvider);
    final patio = ref.watch(patioNotifierProvider).value ?? _patio;
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
        aoTravar: _ciclo.travou,
        aoSair: _aoSair,
        aoSegundoPlano: _ciclo.segundoPlano,
        sobreposicao: (_) => _sobreposicao(),
        // Ligar e desligar o modo é no Menu → Configurações; aqui só a saída
        // para um carro que precisa da entrada normal.
        acoes: [
          _acaoBarra('Entrada normal', Icons.edit_note, _entradaNormal),
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
                        onCorrigir: _ciclo.corrigir,
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
