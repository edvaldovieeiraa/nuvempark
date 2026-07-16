import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image/image.dart' as img;
import 'package:go_router/go_router.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/di/providers.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/brisa.dart';
import '../../patio/domain/patio_model.dart';
import '../../patio/presentation/providers/patio_provider.dart';
import '../../printing/data/print_templates.dart';
import '../../printing/presentation/providers/printer_provider.dart';
import '../data/foto_entrada_service.dart';
import '../data/placa_ocr_service.dart';
import '../domain/reconhecimento_cliente.dart';
import 'camera_placa_screen.dart';
import 'placa_formatter.dart';
import 'providers/ticket_provider.dart';

/// Registro de entrada de veículo: captura de placa (câmera+OCR) ou digitação,
/// tipo de veículo, tarifa opcional, e criação do ticket (enfileira sync).
class EntradaScreen extends ConsumerStatefulWidget {
  const EntradaScreen({super.key});

  @override
  ConsumerState<EntradaScreen> createState() => _EntradaScreenState();
}

class _EntradaScreenState extends ConsumerState<EntradaScreen> {
  final _formKey = GlobalKey<FormState>();
  final _placaCtrl = TextEditingController();
  String? _tipoVeiculo;
  String? _tarifaId;
  bool _loading = false;
  bool _capturandoFoto = false;
  String? _fotoEntradaPath;
  ReconhecimentoCliente? _reconhecimento;
  /// Checkbox "Imprimir foto no recibo" (só aparece no modo 'operador').
  /// Default ligado: quem não mexer, imprime.
  bool _imprimirFotoRecibo = true;
  final _fotoService = FotoEntradaService();
  final _ocrService = PlacaOcrService();
  bool _tipoDefaultAplicado = false;

  // Avaria (opcional): descrição + fotos capturadas localmente.
  final _avariaCtrl = TextEditingController();
  final List<String> _avariaFotos = [];
  bool _avariaAberta = false;

  @override
  void initState() {
    super.initState();
    // Puxa a config mais recente (tarifas/tipos) ANTES de o operador registrar —
    // o momento que mais importa: registrar sempre com a tabela atual da nuvem.
    // Silencioso: se offline, o cache atual segue valendo (offline-first).
    Future.microtask(
      () => ref.read(patioNotifierProvider.notifier).bootstrap(silencioso: true),
    );
  }

  @override
  void dispose() {
    _placaCtrl.dispose();
    _avariaCtrl.dispose();
    _ocrService.dispose();
    super.dispose();
  }

  Future<void> _capturarFotoAvaria() async {
    try {
      // Perfil de avaria: mais resolução que a foto de placa — o gestor vai dar
      // zoom no dano. Não passa por OCR, então a nitidez é o que importa.
      final path = await _fotoService.capturar(perfil: PerfilFoto.avaria);
      if (path != null && mounted) setState(() => _avariaFotos.add(path));
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não foi possível capturar a foto.');
    }
  }

  Future<void> _capturarFoto() async {
    if (_capturandoFoto) return;
    setState(() => _capturandoFoto = true);
    try {
      // Câmera própria: preview com moldura-guia + OCR na área da placa.
      final saida = await Navigator.of(context).push<CapturaSaida>(
        MaterialPageRoute(
          fullscreenDialog: true,
          builder: (_) => CameraPlacaScreen(
            ocrService: _ocrService,
            fotoService: _fotoService,
          ),
        ),
      );
      if (!mounted) return;
      switch (saida) {
        case CapturaOk(:final fotoPath, :final placa):
          setState(() => _fotoEntradaPath = fotoPath);
          await _aplicarPlaca(placa);
        case CapturaIndisponivel():
          // Sem câmera própria (permissão/hardware/erro): fluxo antigo.
          await _capturarFotoFallback();
        case CapturaCancelada() || null:
          break;
      }
    } finally {
      if (mounted) setState(() => _capturandoFoto = false);
    }
  }

  /// Fluxo antigo (câmera do sistema via image_picker) — rede de segurança
  /// quando a câmera própria não está disponível. OCR na imagem inteira.
  Future<void> _capturarFotoFallback() async {
    try {
      final path = await _fotoService.capturar();
      if (path == null || !mounted) return;
      setState(() => _fotoEntradaPath = path);
      final placa = await _ocrService.lerPlaca(File(path));
      await _aplicarPlaca(placa);
    } on FotoPermissaoNegadaException {
      if (mounted) AppToast.error(context, 'Permissão de câmera negada.');
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não foi possível capturar a foto.');
    }
  }

  /// Pré-preenche o campo com a placa reconhecida (se houver) e checa cliente.
  Future<void> _aplicarPlaca(String? placa) async {
    if (placa == null || !mounted) return;
    _placaCtrl.text = placa;
    await _checarPlaca(placa);
    if (mounted) AppToast.info(context, 'Placa reconhecida: $placa');
  }

  Future<void> _checarPlaca(String placa) async {
    final norm = placa.trim().toUpperCase();
    // Rebuild a cada tecla: a borda do campo acende conforme a placa completa.
    // Sem isto, apagar de 7 p/ 6 caracteres sem reconhecimento ativo não
    // dispararia setState em caminho nenhum e a borda ficaria verde mentindo.
    setState(() {});
    if (norm.length < 7) {
      if (_reconhecimento != null) setState(() => _reconhecimento = null);
      return;
    }
    final patioId = await ref.read(tokenStorageProvider).readPatioId();
    if (patioId == null) return;
    final rec =
        await ref.read(ticketRepositoryProvider).reconhecerPlaca(patioId, norm);
    // Descarta resposta obsoleta (placa mudou enquanto consultava).
    if (!mounted || _placaCtrl.text.trim().toUpperCase() != norm) return;
    setState(() => _reconhecimento = rec);
  }

  Future<void> _registrar(PatioModel patio) async {
    if (_loading) return;
    if (!_formKey.currentState!.validate()) return;
    if (_tipoVeiculo == null) {
      AppToast.error(context, 'Selecione o tipo de veículo.');
      return;
    }
    setState(() => _loading = true);
    try {
      final storage = ref.read(tokenStorageProvider);
      final patioId = await storage.readPatioId();
      final user = await storage.readUser();
      if (patioId == null || user == null) {
        if (mounted) AppToast.error(context, 'Sessão inválida. Entre novamente.');
        return;
      }
      final placa = _placaCtrl.text.trim().toUpperCase();

      // Bloqueio de entrada duplicada.
      final existente = await ref
          .read(ticketRepositoryProvider)
          .ticketAbertoPorPlaca(patioId, placa);
      if (existente != null && mounted) {
        final irParaSaida = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Veículo já no pátio'),
            content: Text('A placa $placa já tem entrada aberta. Deseja registrar a saída?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
              FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Ir para saída')),
            ],
          ),
        );
        if (irParaSaida == true && mounted) {
          context.go('/saida/${existente.id}');
        }
        return;
      }

      // Providers lidos AGORA, enquanto o widget está vivo: o que roda depois
      // do pop (impressão, upload de foto, sync) não pode mais tocar em `ref`.
      final avariaService = ref.read(avariaServiceProvider);
      final syncEngine = ref.read(syncEngineProvider);
      final printerFuture = ref.read(printerNotifierProvider.future);
      final printerNotifier = ref.read(printerNotifierProvider.notifier);

      final livre = _reconhecimento?.liberaPassagem ?? false;
      final agora = DateTime.now();

      // ── ÚNICO await do caminho crítico: a transação Drift (ticket + outbox).
      // Nada de rede aqui — em modo avião isto termina em milissegundos.
      final ticketId = await ref.read(ticketRepositoryProvider).registrarEntrada(
            placa: placa,
            tipoVeiculo: _tipoVeiculo!,
            patioId: patioId,
            operadorId: user.id,
            tarifaId: _tarifaId,
            clienteId: livre ? _reconhecimento?.clienteId : null,
            planoId: livre ? _reconhecimento?.planoId : null,
            origem: livre ? 'plano' : 'avulso',
            fotoEntradaPath: _fotoEntradaPath,
          );

      // Avaria (se preenchida): o REGISTRO entra na outbox agora (Drift); as
      // FOTOS sobem em background — antes, o upload segurava a confirmação e,
      // offline, ainda perdia as fotos.
      final descricaoAvaria = _avariaCtrl.text.trim();
      final fotosAvaria = List<String>.of(_avariaFotos);
      if (descricaoAvaria.isNotEmpty || fotosAvaria.isNotEmpty) {
        final avariaId = await avariaService.enfileirar(
          ticketId: ticketId,
          placa: placa,
          descricao: descricaoAvaria.isEmpty
              ? 'Avaria registrada (ver fotos)'
              : descricaoAvaria,
          operadorId: user.id,
          totalFotos: fotosAvaria.length,
        );
        if (fotosAvaria.isNotEmpty) {
          unawaited(avariaService.subirFotos(
            avariaId: avariaId,
            patioId: patioId,
            fotosPaths: fotosAvaria,
          ));
        }
      }

      ref.invalidate(ticketsAbertosProvider);

      // ── Confirmação IMEDIATA. Tudo daqui pra baixo é background.
      if (mounted) {
        AppToast.success(context, 'Entrada registrada!');
        context.pop();
      }

      // Fire-and-forget: a fila sobe sozinha (e, offline, na próxima drenagem).
      unawaited(syncEngine.drain());

      // Cupom de entrada: impressão Bluetooth pode reconectar e demorar
      // segundos — não é motivo para o operador esperar.
      unawaited(_imprimirCupom(
        printerFuture: printerFuture,
        printerNotifier: printerNotifier,
        ticketId: ticketId,
        placa: placa,
        tipoVeiculo: _tipoVeiculo!,
        entrada: agora,
        patio: patio,
        fotoPath: _fotoEntradaPath,
        operadorMarcouFoto: _imprimirFotoRecibo,
      ));
    } catch (e) {
      if (mounted) AppToast.error(context, 'Erro ao registrar entrada.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Imprime o cupom fora do caminho crítico. Não usa `ref` nem o `context` da
  /// tela (ela já saiu): o aviso de falha vai pelo navigator raiz.
  Future<void> _imprimirCupom({
    required Future<PrinterState> printerFuture,
    required PrinterNotifier printerNotifier,
    required String ticketId,
    required String placa,
    required String tipoVeiculo,
    required DateTime entrada,
    required PatioModel patio,
    String? fotoPath,
    bool operadorMarcouFoto = false,
  }) async {
    final printer =
        await printerFuture.catchError((_) => const PrinterState());
    if (!printer.temImpressora) return;

    // Modo da parametrização: sempre, o operador decidiu, ou nunca.
    final deveImprimirFoto = patio.fotoReciboSempre ||
        (patio.fotoReciboOperadorDecide && operadorMarcouFoto);
    img.Image? fotoVeiculo;
    if (deveImprimirFoto && fotoPath != null) {
      try {
        final decodificada = img.decodeImage(await File(fotoPath).readAsBytes());
        if (decodificada != null) {
          fotoVeiculo = img.bakeOrientation(decodificada);
        }
      } catch (_) {
        // Foto ilegível não pode derrubar o cupom — imprime sem ela.
      }
    }

    final bytes = PrintTemplates.ticketEntrada(
      ticketId: ticketId,
      placa: placa,
      tipoVeiculo: tipoVeiculo,
      entrada: entrada,
      operacaoNome: patio.nome,
      cols: printer.cols,
      avancoFinal: printer.avancoFinal,
      cabecalho: patio.ticketCabecalho,
      rodape: patio.ticketRodape,
      fotoVeiculo: fotoVeiculo,
    );
    final ok = await printerNotifier.print(bytes);
    if (ok) return;

    final ctx = rootNavigatorKey.currentContext;
    if (ctx != null && ctx.mounted) {
      AppToast.error(ctx, 'Falha ao imprimir o ticket.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final patioAsync = ref.watch(patioNotifierProvider);

    return Scaffold(
      appBar: appBarBrisa(context, 'Nova entrada'),
      body: patioAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorState(
          mensagem: 'Não foi possível carregar a config do pátio.',
          onRetry: () => ref.read(patioNotifierProvider.notifier).bootstrap(),
        ),
        data: (patio) {
          if (patio == null) {
            return ErrorState(
              mensagem: 'Sincronize a config do pátio para começar.',
              onRetry: () => ref.read(patioNotifierProvider.notifier).bootstrap(),
            );
          }
          // Pré-seleciona o PRIMEIRO tipo da ordem definida no painel
          // (Cadastros → Tipos de veículo). A ordem é a regra do gestor.
          if (!_tipoDefaultAplicado) {
            _tipoDefaultAplicado = true;
            final def =
                patio.tiposVeiculo.isNotEmpty ? patio.tiposVeiculo.first : null;
            if (def != null) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted) setState(() => _tipoVeiculo = def);
              });
            }
          }

          final tabelas = _tipoVeiculo != null
              ? patio.tabelasVisiveis(_tipoVeiculo!)
              : const [];

          // Pré-seleciona a PRIMEIRA tarifa da ordem (igual ao tipo de veículo).
          // Se a atual não vale pro tipo escolhido, cai na primeira disponível.
          if (tabelas.isNotEmpty &&
              (_tarifaId == null ||
                  !tabelas.any((t) => t.id == _tarifaId))) {
            final primeira = tabelas.first.id;
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted && _tarifaId != primeira) {
                setState(() => _tarifaId = primeira);
              }
            });
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Foto + OCR — a ação principal da tela. Card verde cheio do
                  // Brisa: é o único elemento com sombra colorida aqui, e é o
                  // que o operador toca 9 em cada 10 vezes.
                  _cardFoto(),
                  const SizedBox(height: 14),
                  const Row(
                    children: [
                      Expanded(
                          child: Divider(
                              color: AppColors.surfaceContainerHighest,
                              thickness: 1)),
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 12),
                        child: Text('ou digite',
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.onSurfaceVariant)),
                      ),
                      Expanded(
                          child: Divider(
                              color: AppColors.surfaceContainerHighest,
                              thickness: 1)),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Campo de placa: superfície branca de borda grossa, não um
                  // input com moldura. A borda acende em verde quando a placa
                  // fica completa — feedback antes de o operador procurar erro.
                  TextFormField(
                    controller: _placaCtrl,
                    textCapitalization: TextCapitalization.characters,
                    keyboardType: TextInputType.visiblePassword,
                    inputFormatters: [
                      LengthLimitingTextInputFormatter(7),
                      const PlacaFormatter(),
                    ],
                    style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 3,
                        color: AppColors.onSurface),
                    textAlign: TextAlign.center,
                    decoration: InputDecoration(
                      hintText: 'ABC1D23',
                      hintStyle: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 3,
                          color: AppColors.outline),
                      filled: true,
                      fillColor: AppColors.surface,
                      contentPadding:
                          const EdgeInsets.symmetric(vertical: 14),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: BorderSide(
                          width: 2,
                          color: _placaCtrl.text.trim().length == 7
                              ? AppColors.primaryFill
                              : AppColors.outlineVariant,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: const BorderSide(
                            width: 2, color: AppColors.primaryFill),
                      ),
                      errorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide:
                            const BorderSide(width: 2, color: AppColors.error),
                      ),
                      focusedErrorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide:
                            const BorderSide(width: 2, color: AppColors.error),
                      ),
                    ),
                    onChanged: _checarPlaca,
                    validator: (v) => (v == null || v.trim().length != 7) ? 'Placa incompleta' : null,
                  ),

                  if (_reconhecimento != null) ...[
                    const SizedBox(height: 12),
                    _ReconhecimentoBanner(rec: _reconhecimento!),
                  ],

                  const SizedBox(height: 20),
                  const Text('Tipo de veículo', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: patio.tiposVeiculo.map((t) {
                      final sel = _tipoVeiculo == t;
                      return ChoiceChip(
                        label: Text(_nomeAmigavel(t)),
                        selected: sel,
                        onSelected: (_) => setState(() {
                          _tipoVeiculo = t;
                          _tarifaId = null;
                        }),
                      );
                    }).toList(),
                  ),

                  if (tabelas.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    const Text('Tabela de preço', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: tabelas.map((t) {
                        final sel = _tarifaId == t.id;
                        return ChoiceChip(
                          label: Text(t.nome),
                          selected: sel,
                          onSelected: (_) => setState(() => _tarifaId = t.id),
                        );
                      }).toList(),
                    ),
                  ],

                  // Foto no recibo — só quando o gestor deixou o operador decidir.
                  if (patio.fotoReciboOperadorDecide) ...[
                    const SizedBox(height: 16),
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: CheckboxListTile(
                        value: _imprimirFotoRecibo,
                        onChanged: (v) =>
                            setState(() => _imprimirFotoRecibo = v ?? false),
                        controlAffinity: ListTileControlAffinity.leading,
                        dense: true,
                        contentPadding:
                            const EdgeInsets.symmetric(horizontal: 8),
                        title: const Text('Imprimir foto no recibo',
                            style: TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 14)),
                        subtitle: const Text(
                            'A foto do veículo sai no cupom de entrada.',
                            style: TextStyle(fontSize: 12)),
                      ),
                    ),
                  ],

                  const SizedBox(height: 20),
                  // ── Avaria (opcional) ──
                  _secaoAvaria(),

                  const SizedBox(height: 20),
                  SizedBox(
                    height: 58,
                    child: FilledButton(
                      onPressed: _loading ? null : () => _registrar(patio),
                      child: _loading
                          ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                          : const Text('Registrar entrada'),
                    ),
                  ),
                  const SizedBox(height: 9),
                  // Diz o que vai acontecer depois do toque. O auto-print já
                  // era o comportamento; o operador é que não sabia.
                  const Text(
                    'o cupom imprime sozinho',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 12,
                        height: 1.4,
                        fontWeight: FontWeight.w500,
                        color: AppColors.outline),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  /// CTA da câmera. Verde cheio quando ainda não há foto; quando já capturou,
  /// vira card claro confirmando — o verde forte é para o que falta fazer.
  Widget _cardFoto() {
    final temFoto = _fotoEntradaPath != null;
    return InkWell(
      onTap: _capturandoFoto ? null : _capturarFoto,
      borderRadius: BorderRadius.circular(28),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: temFoto ? AppColors.primaryContainer : AppColors.primaryFill,
          borderRadius: BorderRadius.circular(28),
          boxShadow: temFoto
              ? null
              : [
                  BoxShadow(
                    color: AppColors.primaryFill.withValues(alpha: 0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: temFoto
                    ? Colors.white
                    : Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(18),
              ),
              child: _capturandoFoto
                  ? const Padding(
                      padding: EdgeInsets.all(15),
                      child: CircularProgressIndicator(
                          strokeWidth: 2.5, color: Colors.white),
                    )
                  : Icon(
                      temFoto ? Icons.check_circle : Icons.photo_camera,
                      size: 26,
                      color: temFoto ? AppColors.primary : Colors.white,
                    ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    temFoto ? 'Foto capturada' : 'Fotografar placa',
                    style: TextStyle(
                      fontSize: 17,
                      height: 1.25,
                      fontWeight: FontWeight.w800,
                      color: temFoto ? AppColors.onSurface : Colors.white,
                    ),
                  ),
                  Text(
                    temFoto
                        ? 'toque para refazer'
                        : 'a câmera lê e preenche pra você',
                    style: TextStyle(
                      fontSize: 12,
                      height: 1.35,
                      fontWeight: FontWeight.w500,
                      color: temFoto
                          ? AppColors.onSurfaceVariant
                          : Colors.white.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right,
                size: 24,
                color: temFoto
                    ? AppColors.outline
                    : Colors.white.withValues(alpha: 0.7)),
          ],
        ),
      ),
    );
  }

  /// Seção de avaria — checkbox que expande: descrição + fotos.
  Widget _secaoAvaria() {
    return Container(
      decoration: BoxDecoration(
        color: _avariaAberta ? AppColors.saidaBg : AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _avariaAberta
              ? AppColors.saida.withValues(alpha: 0.35)
              : AppColors.outlineVariant,
        ),
      ),
      child: Column(
        children: [
          InkWell(
            onTap: () => setState(() => _avariaAberta = !_avariaAberta),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Icon(Icons.report_gmailerrorred_outlined,
                      color: _avariaAberta
                          ? AppColors.saida
                          : AppColors.onSurfaceVariant),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Registrar avaria',
                            style: TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 14)),
                        Text('Danos no veículo na entrada — com fotos',
                            style: TextStyle(
                                fontSize: 12,
                                color: AppColors.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  Icon(_avariaAberta
                      ? Icons.keyboard_arrow_up
                      : Icons.keyboard_arrow_down),
                ],
              ),
            ),
          ),
          if (_avariaAberta)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _avariaCtrl,
                    textCapitalization: TextCapitalization.sentences,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      hintText: 'Ex.: risco na porta esquerda, retrovisor solto',
                      isDense: true,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ..._avariaFotos.asMap().entries.map((e) => Stack(
                            clipBehavior: Clip.none,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.file(
                                  File(e.value),
                                  width: 64,
                                  height: 64,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              Positioned(
                                right: -6,
                                top: -6,
                                child: GestureDetector(
                                  onTap: () => setState(
                                      () => _avariaFotos.removeAt(e.key)),
                                  child: Container(
                                    decoration: const BoxDecoration(
                                      color: AppColors.danger,
                                      shape: BoxShape.circle,
                                    ),
                                    padding: const EdgeInsets.all(2),
                                    child: const Icon(Icons.close,
                                        size: 14, color: Colors.white),
                                  ),
                                ),
                              ),
                            ],
                          )),
                      InkWell(
                        onTap: _capturarFotoAvaria,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.outlineVariant),
                          ),
                          child: const Icon(Icons.add_a_photo_outlined,
                              color: AppColors.onSurfaceVariant),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// "van grande" → "Van Grande" (o valor salvo continua minúsculo).
String _nomeAmigavel(String tipo) => tipo
    .split(' ')
    .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
    .join(' ');

class _ReconhecimentoBanner extends StatelessWidget {
  const _ReconhecimentoBanner({required this.rec});
  final ReconhecimentoCliente rec;

  @override
  Widget build(BuildContext context) {
    final livre = rec.liberaPassagem;
    final cor = livre ? AppColors.entrada : AppColors.saida;
    final bg = livre ? AppColors.entradaBg : AppColors.saidaBg;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cor.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(livre ? Icons.verified_user_outlined : Icons.info_outline, color: cor),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(rec.nome, style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(rec.mensagem, style: TextStyle(fontSize: 12, color: cor)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

