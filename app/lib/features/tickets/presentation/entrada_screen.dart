import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../patio/domain/patio_model.dart';
import '../../patio/presentation/providers/patio_provider.dart';
import '../../printing/data/print_templates.dart';
import '../../printing/presentation/providers/printer_provider.dart';
import '../data/foto_entrada_service.dart';
import '../data/placa_ocr_service.dart';
import '../domain/reconhecimento_cliente.dart';
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
  final _fotoService = FotoEntradaService();
  final _ocrService = PlacaOcrService();
  bool _tipoDefaultAplicado = false;

  // Avaria (opcional): descrição + fotos capturadas localmente.
  final _avariaCtrl = TextEditingController();
  final List<String> _avariaFotos = [];
  bool _avariaAberta = false;

  @override
  void dispose() {
    _placaCtrl.dispose();
    _avariaCtrl.dispose();
    _ocrService.dispose();
    super.dispose();
  }

  Future<void> _capturarFotoAvaria() async {
    try {
      final path = await _fotoService.capturar();
      if (path != null && mounted) setState(() => _avariaFotos.add(path));
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não foi possível capturar a foto.');
    }
  }

  Future<void> _capturarFoto() async {
    if (_capturandoFoto) return;
    setState(() => _capturandoFoto = true);
    try {
      final path = await _fotoService.capturar();
      if (path == null) return;
      setState(() => _fotoEntradaPath = path);
      final placa = await _ocrService.lerPlaca(File(path));
      if (placa != null && mounted) {
        _placaCtrl.text = placa;
        await _checarPlaca(placa);
        if (mounted) AppToast.info(context, 'Placa reconhecida: $placa');
      }
    } on FotoPermissaoNegadaException {
      if (mounted) AppToast.error(context, 'Permissão de câmera negada.');
    } catch (_) {
      if (mounted) AppToast.error(context, 'Não foi possível capturar a foto.');
    } finally {
      if (mounted) setState(() => _capturandoFoto = false);
    }
  }

  Future<void> _checarPlaca(String placa) async {
    final norm = placa.trim().toUpperCase();
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

      final livre = _reconhecimento?.liberaPassagem ?? false;
      final agora = DateTime.now();
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

      // Registra avaria (se preenchida) — sobe fotos e enfileira no sync.
      if (_avariaCtrl.text.trim().isNotEmpty || _avariaFotos.isNotEmpty) {
        await ref.read(avariaServiceProvider).registrar(
              ticketId: ticketId,
              patioId: patioId,
              placa: placa,
              descricao: _avariaCtrl.text.trim().isEmpty
                  ? 'Avaria registrada (ver fotos)'
                  : _avariaCtrl.text.trim(),
              operadorId: user.id,
              fotosPaths: _avariaFotos,
            );
      }

      ref.invalidate(ticketsAbertosProvider);
      Future.microtask(() => ref.read(syncEngineProvider).drain());

      // Auto-print do cupom de entrada, se houver impressora.
      final printer = await ref
          .read(printerNotifierProvider.future)
          .catchError((_) => const PrinterState());
      if (printer.temImpressora) {
        final bytes = PrintTemplates.ticketEntrada(
          ticketId: ticketId,
          placa: placa,
          tipoVeiculo: _tipoVeiculo!,
          entrada: agora,
          operacaoNome: patio.nome,
          cols: printer.cols,
          avancoFinal: printer.avancoFinal,
          cabecalho: patio.ticketCabecalho,
          rodape: patio.ticketRodape,
        );
        final ok = await ref.read(printerNotifierProvider.notifier).print(bytes);
        if (mounted && !ok) {
          AppToast.error(context, 'Falha ao imprimir o ticket.');
        }
      }

      if (mounted) {
        AppToast.success(context, 'Entrada registrada!');
        context.pop();
      }
    } catch (e) {
      if (mounted) AppToast.error(context, 'Erro ao registrar entrada.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final patioAsync = ref.watch(patioNotifierProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Nova entrada')),
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
                  // Foto + OCR — a ação principal da tela
                  InkWell(
                    onTap: _capturandoFoto ? null : _capturarFoto,
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      height: 84,
                      decoration: BoxDecoration(
                        gradient: _fotoEntradaPath == null
                            ? const LinearGradient(colors: AppColors.gradient)
                            : null,
                        color: _fotoEntradaPath == null
                            ? null
                            : AppColors.entradaBg,
                        borderRadius: BorderRadius.circular(16),
                        border: _fotoEntradaPath == null
                            ? null
                            : Border.all(
                                color: AppColors.entrada.withValues(alpha: 0.35)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (_capturandoFoto)
                            const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2.5, color: Colors.white),
                            )
                          else
                            Icon(
                              _fotoEntradaPath == null
                                  ? Icons.photo_camera_outlined
                                  : Icons.check_circle_outline,
                              size: 26,
                              color: _fotoEntradaPath == null
                                  ? Colors.white
                                  : AppColors.entrada,
                            ),
                          const SizedBox(width: 12),
                          Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _fotoEntradaPath == null
                                    ? 'Fotografar placa'
                                    : 'Foto capturada',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: _fotoEntradaPath == null
                                      ? Colors.white
                                      : AppColors.entrada,
                                ),
                              ),
                              Text(
                                _fotoEntradaPath == null
                                    ? 'a câmera lê a placa pra você'
                                    : 'toque para refazer',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: _fotoEntradaPath == null
                                      ? Colors.white70
                                      : AppColors.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Row(
                    children: [
                      Expanded(child: Divider()),
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 12),
                        child: Text('ou digite',
                            style: TextStyle(
                                fontSize: 12,
                                color: AppColors.onSurfaceVariant)),
                      ),
                      Expanded(child: Divider()),
                    ],
                  ),
                  const SizedBox(height: 12),

                  const Text('Placa', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant)),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _placaCtrl,
                    textCapitalization: TextCapitalization.characters,
                    keyboardType: TextInputType.visiblePassword,
                    inputFormatters: [
                      LengthLimitingTextInputFormatter(7),
                      _PlacaFormatter(),
                    ],
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: 3),
                    textAlign: TextAlign.center,
                    decoration: const InputDecoration(hintText: 'ABC1D23'),
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

                  const SizedBox(height: 20),
                  // ── Avaria (opcional) ──
                  _secaoAvaria(),

                  const SizedBox(height: 28),
                  FilledButton(
                    onPressed: _loading ? null : () => _registrar(patio),
                    child: _loading
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                        : const Text('Registrar entrada'),
                  ),
                ],
              ),
            ),
          );
        },
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

/// Formatter de placa: força maiúsculas e valida char por posição
/// (Mercosul LLLNLNN + antiga LLLNNNN convivem: pos5 aceita letra ou dígito).
class _PlacaFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final t = newValue.text.toUpperCase();
    final buf = StringBuffer();
    for (var i = 0; i < t.length && i < 7; i++) {
      final c = t[i];
      final ok = switch (i) {
        0 || 1 || 2 => RegExp(r'[A-Z]').hasMatch(c),
        3 => RegExp(r'[0-9]').hasMatch(c),
        4 => RegExp(r'[A-Z0-9]').hasMatch(c),
        _ => RegExp(r'[0-9]').hasMatch(c),
      };
      if (ok) buf.write(c);
    }
    final s = buf.toString();
    return TextEditingValue(text: s, selection: TextSelection.collapsed(offset: s.length));
  }
}
