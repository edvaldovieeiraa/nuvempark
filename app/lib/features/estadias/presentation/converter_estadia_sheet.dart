import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/confirmar_cobranca_dialog.dart';
import '../../../core/widgets/forma_pagamento_grid.dart';
import '../../caixa/presentation/providers/caixa_provider.dart';
import '../../patio/domain/tarifa_config.dart';
import '../../patio/presentation/providers/patio_provider.dart';
import '../../printing/data/print_templates.dart';
import '../../tickets/domain/ticket_model.dart';
import '../../tickets/presentation/providers/ticket_provider.dart';
import '../domain/estadia_engine.dart';
import 'estadia_acoes.dart';
import 'estadia_formatos.dart';
import 'estadia_widgets.dart';
import 'providers/estadias_provider.dart';

/// "Contratar estadia" num ticket avulso aberto (Revisão 6): o hóspede fez o
/// check-in depois de o carro entrar. A estadia conta DESDE A ENTRADA.
Future<bool> mostrarConverterEstadia(
  BuildContext context, {
  required TicketModel ticket,
  required List<TarifaConfig> tabelasHospede,
}) async {
  final ok = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => ConverterEstadiaSheet(ticket: ticket, tabelasHospede: tabelasHospede),
  );
  return ok == true;
}

class ConverterEstadiaSheet extends ConsumerStatefulWidget {
  const ConverterEstadiaSheet({super.key, required this.ticket, required this.tabelasHospede});

  final TicketModel ticket;
  final List<TarifaConfig> tabelasHospede;

  @override
  ConsumerState<ConverterEstadiaSheet> createState() => _ConverterEstadiaSheetState();
}

class _ConverterEstadiaSheetState extends ConsumerState<ConverterEstadiaSheet> {
  late TarifaConfig _tarifa;
  late int _diarias;
  String? _forma;
  bool _gravando = false;

  /// null = consultando; true = já pago online (não converte: o dinheiro
  /// pago pelo QR ficaria órfão).
  bool? _pagoOnline;

  TicketModel get t => widget.ticket;

  @override
  void initState() {
    super.initState();
    _tarifa = widget.tabelasHospede.first;
    _diarias = _minimo(DateTime.now());
    _consultarPagamentoOnline();
  }

  int _minimo(DateTime agora) => EstadiaEngine.minimoDiarias(
      inicio: t.entrada, agora: agora, diariaHoras: _tarifa.diariaHoras!);

  Future<void> _consultarPagamentoOnline() async {
    final status = await ref.read(pagamentoOnlineServiceProvider).consultar(t.id).catchError((_) => null);
    if (mounted) setState(() => _pagoOnline = status?.pago ?? false);
  }

  Future<void> _confirmar() async {
    final agora = DateTime.now();
    final c = EstadiaEngine.contratacao(
      diarias: _diarias,
      diariaValor: _tarifa.diariaValor!,
      diariaHoras: _tarifa.diariaHoras!,
      inicio: t.entrada,
    );
    final forma = _forma!;
    final confirmou = await confirmarCobranca(
      context,
      titulo: 'Confirmar contratação',
      linhas: [
        ('Placa', t.placa),
        ('Desde a entrada', fmtValidade(t.entrada, agora)),
        ('Diárias', '$_diarias × ${fmtReais(_tarifa.diariaValor!)}'),
        ('Válida até', fmtValidade(c.validaAte, agora)),
        ('Forma', FormaPagamentoGrid.rotulo(forma)),
      ],
      total: fmtReais(c.valor),
      aviso: 'Depois de confirmar não há estorno pelo app.',
    );
    if (!confirmou || !mounted) return;

    setState(() => _gravando = true);
    final patio = ref.read(patioNotifierProvider).value;
    DateTime? validaGravada;
    final ok = await executarCobrancaEstadia(context, ref, (ctx) async {
      final r = await ref.read(estadiaRepositoryProvider).converterTicket(
            ticketId: t.id,
            tarifa: _tarifa,
            diarias: _diarias,
            formaPagamento: forma,
            caixaSessaoId: ctx.caixaSessaoId,
            operadorId: ctx.operadorId,
          );
      validaGravada = r.validaAte;
    });
    if (!mounted) return;
    setState(() => _gravando = false);
    if (!ok) return;
    if (patio != null) {
      imprimirEmSegundoPlano(
        ref,
        (p) => PrintTemplates.comprovanteEstadia(
          placa: t.placa,
          operacaoNome: patio.nome,
          estadia: BlocoEstadia(
            titulo: 'HOSPEDE - ESTADIA PAGA',
            validaAte: validaGravada ?? c.validaAte,
            diarias: _diarias,
            diariaValor: _tarifa.diariaValor,
            total: c.valor,
            formaPagamento: forma,
          ),
          cols: p.cols,
          avancoFinal: p.avancoFinal,
          cabecalho: patio.ticketCabecalho,
          rodape: patio.ticketRodape,
        ),
      );
    }
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final agora = DateTime.now();
    final minimo = _minimo(agora);
    if (_diarias < minimo) _diarias = minimo;
    final c = EstadiaEngine.contratacao(
      diarias: _diarias,
      diariaValor: _tarifa.diariaValor!,
      diariaHoras: _tarifa.diariaHoras!,
      inicio: t.entrada,
    );
    final patio = ref.watch(patioNotifierProvider).value;
    final caixaAberto = ref.watch(caixaSessaoNotifierProvider).value != null;
    final noPatio = agora.difference(t.entrada);

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Contratar estadia · ${t.placa}',
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                    Text(
                      '${_tarifa.nome} · ${fmtReais(_tarifa.diariaValor!)} por ${_tarifa.diariaHoras} h',
                      style: const TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Fechar',
                onPressed: () => Navigator.of(context).pop(false),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          if (widget.tabelasHospede.length > 1) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              children: [
                for (final tab in widget.tabelasHospede)
                  ChoiceChip(
                    label: Text(tab.nome),
                    selected: tab.id == _tarifa.id,
                    onSelected: (_) => setState(() => _tarifa = tab),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 14),
          AvisoBase(
            'Conta desde a entrada, ${fmtValidade(t.entrada, agora)}. As '
            '${fmtDuracaoLonga(noPatio)} que o carro já está no pátio entram na estadia — '
            'nada é cobrado como avulso.',
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Diárias', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                    if (minimo > 1)
                      Text('Mínimo $minimo: o carro entrou há ${fmtDuracaoLonga(noPatio)}',
                          style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
                  ],
                ),
              ),
              DiariasStepper(
                valor: _diarias,
                minimo: minimo,
                onChanged: (v) => setState(() => _diarias = v),
              ),
            ],
          ),
          const Divider(height: 28),
          TotalEValidade(
            total: fmtReais(c.valor),
            validadeRotulo: 'VÁLIDA ATÉ',
            validade: fmtValidade(c.validaAte, agora),
          ),
          const SizedBox(height: 16),
          FormaPagamentoGrid(
            formas: patio?.formasPagamento ?? const [],
            selecionada: _forma,
            onSelecionar: (f) => setState(() => _forma = f),
          ),
          const SizedBox(height: 16),
          if (_pagoOnline == true)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.warningBg,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Text(
                'Este ticket já foi pago online pelo QR. Dê a saída normalmente; '
                'a estadia pode ser contratada na próxima entrada.',
                style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF78350F)),
              ),
            )
          else if (!caixaAberto)
            const FaixaCaixaFechado()
          else
            SizedBox(
              height: 58,
              child: FilledButton(
                onPressed: (_forma == null || _gravando || _pagoOnline == null) ? null : _confirmar,
                child: Text(_forma == null ? 'Escolha a forma de pagamento' : 'Contratar estadia'),
              ),
            ),
        ],
      ),
    );
  }
}
