import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/confirmar_cobranca_dialog.dart';
import '../../../core/widgets/forma_pagamento_grid.dart';
import '../../../database/app_database.dart';
import '../../caixa/presentation/providers/caixa_provider.dart';
import '../../patio/presentation/providers/patio_provider.dart';
import '../../printing/data/print_templates.dart';
import '../domain/estadia_engine.dart';
import '../data/estadia_repository.dart';
import 'estadia_acoes.dart';
import 'estadia_formatos.dart';
import 'estadia_widgets.dart';
import 'providers/estadias_provider.dart';

/// De onde a renovação foi pedida — muda o botão e o que acontece junto.
enum OrigemRenovacao {
  /// Ficha da estadia: só renova.
  ficha,

  /// Volta de hóspede com a estadia vencida: renova e registra a entrada.
  entrada,

  /// Saída de estadia vencida, "vai continuar": renova e confirma a saída.
  saida,
}

/// Abre a folha. Devolve true se renovou.
Future<bool> mostrarRenovarEstadia(
  BuildContext context, {
  required Estadia estadia,
  required OrigemRenovacao origem,
  required bool carroDentro,
  String? ticketId,
  String? fotoEntradaPath,
}) async {
  final ok = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => RenovarEstadiaSheet(
      estadia: estadia,
      origem: origem,
      carroDentro: carroDentro,
      ticketId: ticketId,
      fotoEntradaPath: fotoEntradaPath,
    ),
  );
  return ok == true;
}

class RenovarEstadiaSheet extends ConsumerStatefulWidget {
  const RenovarEstadiaSheet({
    super.key,
    required this.estadia,
    required this.origem,
    required this.carroDentro,
    this.ticketId,
    this.fotoEntradaPath,
  });

  final Estadia estadia;
  final OrigemRenovacao origem;
  final bool carroDentro;
  final String? ticketId;
  final String? fotoEntradaPath;

  @override
  ConsumerState<RenovarEstadiaSheet> createState() => _RenovarEstadiaSheetState();
}

class _RenovarEstadiaSheetState extends ConsumerState<RenovarEstadiaSheet> {
  late int _diarias;
  String? _forma; // nenhuma pré-marcada (design, obs. 1)
  bool _gravando = false;

  Estadia get e => widget.estadia;
  DateTime get _validaAte => DateTime.fromMillisecondsSinceEpoch(e.validaAteEpoch);

  RenovacaoResult _calcular(DateTime agora) => EstadiaEngine.renovacao(
        validaAte: _validaAte,
        diariaHoras: e.diariaHoras,
        diariaValor: e.diariaValor,
        diarias: _diarias,
        agora: agora,
        carroDentro: widget.carroDentro,
      );

  @override
  void initState() {
    super.initState();
    _diarias = 1;
    _diarias = _calcular(DateTime.now()).minimoDiarias;
  }

  String _textoBase(DateTime agora) {
    if (!agora.isAfter(_validaAte)) {
      return 'Conta a partir do vencimento atual, ${fmtValidade(_validaAte, agora)}.';
    }
    if (widget.carroDentro) {
      return 'Conta a partir do vencimento, ${fmtValidade(_validaAte, agora)}: o carro ficou no '
          'pátio, então as diárias novas cobrem o atraso.';
    }
    return 'Conta a partir de agora: a estadia venceu com o carro fora do pátio.';
  }

  String get _rotuloBotao => switch (widget.origem) {
        OrigemRenovacao.ficha => 'Renovar',
        OrigemRenovacao.entrada => 'Renovar e registrar entrada',
        OrigemRenovacao.saida => 'Renovar e confirmar saída',
      };

  Future<void> _confirmar() async {
    final agora = DateTime.now();
    final r = _calcular(agora);
    final forma = _forma!;
    final confirmou = await confirmarCobranca(
      context,
      titulo: 'Confirmar renovação',
      linhas: [
        ('Placa', e.placa),
        ('Diárias', '$_diarias × ${fmtReais(e.diariaValor)}'),
        ('Nova validade', fmtValidade(r.novaValidaAte, agora)),
        ('Forma', FormaPagamentoGrid.rotulo(forma)),
      ],
      total: fmtReais(r.valor),
      aviso: 'Depois de confirmar não há estorno pelo app.',
    );
    if (!confirmou || !mounted) return;

    setState(() => _gravando = true);
    final repo = ref.read(estadiaRepositoryProvider);
    final patio = ref.read(patioNotifierProvider).value;
    RenovacaoFeita? feita;
    final ok = await executarCobrancaEstadia(context, ref, (ctx) async {
      switch (widget.origem) {
        case OrigemRenovacao.ficha:
          feita = await repo.renovar(
            estadiaId: e.id,
            diarias: _diarias,
            formaPagamento: forma,
            caixaSessaoId: ctx.caixaSessaoId,
            operadorId: ctx.operadorId,
            carroDentro: widget.carroDentro,
          );
        case OrigemRenovacao.entrada:
          feita = await repo.renovarEEntrar(
            estadiaId: e.id,
            diarias: _diarias,
            formaPagamento: forma,
            caixaSessaoId: ctx.caixaSessaoId,
            operadorId: ctx.operadorId,
            fotoEntradaPath: widget.fotoEntradaPath,
          );
        case OrigemRenovacao.saida:
          feita = await repo.renovarESair(
            estadiaId: e.id,
            ticketId: widget.ticketId!,
            diarias: _diarias,
            formaPagamento: forma,
            caixaSessaoId: ctx.caixaSessaoId,
            operadorId: ctx.operadorId,
          );
      }
    });
    if (!mounted) return;
    setState(() => _gravando = false);
    if (!ok) return;

    if (patio != null && feita != null) {
      final gravada = feita!;
      final ticketNovo = gravada.ticketId;
      final bloco = BlocoEstadia(
        titulo: 'HOSPEDE - RENOVACAO',
        validaAte: gravada.validaAte,
        diarias: _diarias,
        diariaValor: e.diariaValor,
        total: gravada.valor,
        formaPagamento: forma,
      );
      // Renovou e entrou: um papel só, cupom com QR + bloco (design, obs. 3).
      imprimirEmSegundoPlano(
        ref,
        (p) => ticketNovo != null
            ? PrintTemplates.ticketEntrada(
                ticketId: ticketNovo,
                placa: e.placa,
                tipoVeiculo: e.tipoVeiculo,
                entrada: agora,
                operacaoNome: patio.nome,
                cols: p.cols,
                avancoFinal: p.avancoFinal,
                cabecalho: patio.ticketCabecalho,
                rodape: patio.ticketRodape,
                estadia: bloco,
              )
            : PrintTemplates.comprovanteEstadia(
                placa: e.placa,
                operacaoNome: patio.nome,
                estadia: bloco,
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
    final r = _calcular(agora);
    final patio = ref.watch(patioNotifierProvider).value;
    final caixaAberto = ref.watch(caixaSessaoNotifierProvider).value != null;
    final formas = patio?.formasPagamento ?? const <String>[];

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
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
                      Text('Renovar estadia · ${e.placa}',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      Text('${fmtReais(e.diariaValor)} por diária de ${e.diariaHoras} h',
                          style: const TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant)),
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
            const SizedBox(height: 14),
            AvisoBase(_textoBase(agora)),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Diárias', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                      if (r.minimoDiarias > 1)
                        Text(
                          'Mínimo ${r.minimoDiarias}: o atraso passou de '
                          '${(r.minimoDiarias - 1) * e.diariaHoras} h',
                          style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant),
                        ),
                    ],
                  ),
                ),
                DiariasStepper(
                  valor: _diarias,
                  minimo: r.minimoDiarias,
                  onChanged: (v) => setState(() => _diarias = v),
                ),
              ],
            ),
            const Divider(height: 28),
            TotalEValidade(
              total: fmtReais(r.valor),
              validadeRotulo: 'NOVA VALIDADE',
              validade: fmtValidade(r.novaValidaAte, agora),
            ),
            const SizedBox(height: 16),
            FormaPagamentoGrid(
              formas: formas,
              selecionada: _forma,
              onSelecionar: (f) => setState(() => _forma = f),
            ),
            const SizedBox(height: 16),
            if (!caixaAberto)
              const FaixaCaixaFechado()
            else
              SizedBox(
                height: 58,
                child: FilledButton(
                  onPressed: (_forma == null || _gravando || !r.cobreAgora) ? null : _confirmar,
                  child: _gravando
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                      : Text(_forma == null ? 'Escolha a forma de pagamento' : _rotuloBotao),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
