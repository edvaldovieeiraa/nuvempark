import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/forma_pagamento_grid.dart';
import '../../../database/app_database.dart';
import '../../patio/domain/tarifa_config.dart';
import '../domain/estadia_engine.dart';
import 'estadia_formatos.dart';
import 'estadia_widgets.dart';

/// Cartão de contratação na entrada (tabela de hóspede escolhida): diárias,
/// total, validade e formas. O botão fica onde sempre esteve, no fim da tela.
/// Controlado de fora: a entrada guarda diárias e forma.
class EstadiaContratacaoCard extends StatelessWidget {
  const EstadiaContratacaoCard({
    super.key,
    required this.tarifa,
    required this.diarias,
    required this.onDiarias,
    required this.formas,
    required this.forma,
    required this.onForma,
    this.bloqueio,
  });

  final TarifaConfig tarifa;
  final int diarias;
  final ValueChanged<int> onDiarias;
  final List<String> formas;
  final String? forma;
  final ValueChanged<String> onForma;

  /// Motivo para não contratar (ex.: placa de mensalista ativo).
  final String? bloqueio;

  @override
  Widget build(BuildContext context) {
    final agora = DateTime.now();
    final c = EstadiaEngine.contratacao(
      diarias: diarias,
      diariaValor: tarifa.diariaValor!,
      diariaHoras: tarifa.diariaHoras!,
      inicio: agora,
    );
    if (bloqueio != null) {
      return _Faixa(
        cor: AppColors.warning,
        fundo: AppColors.warningBg,
        icone: Icons.block,
        titulo: bloqueio!,
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.outlineVariant, width: 1.5),
            boxShadow: const [BoxShadow(color: AppColors.shadow, blurRadius: 10, offset: Offset(0, 2))],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Estadia de hóspede',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                        Text(
                          '${fmtReais(tarifa.diariaValor!)} por diária de ${tarifa.diariaHoras} h',
                          style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                  DiariasStepper(valor: diarias, onChanged: onDiarias),
                ],
              ),
              const Divider(height: 24),
              TotalEValidade(
                total: fmtReais(c.valor),
                detalhe: '$diarias × ${fmtReais(tarifa.diariaValor!)}',
                validadeRotulo: 'VÁLIDA ATÉ',
                validade: fmtValidade(c.validaAte, agora),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const Text('Forma de pagamento',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.onSurfaceVariant)),
        const SizedBox(height: 8),
        FormaPagamentoGrid(formas: formas, selecionada: forma, onSelecionar: onForma),
        const SizedBox(height: 6),
        const Text('Entra no caixa aberto deste turno.',
            style: TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
      ],
    );
  }
}

/// Placa de hóspede com estadia válida: entra sem cobrança.
class FaixaHospedeValido extends StatelessWidget {
  const FaixaHospedeValido({super.key, required this.estadia, required this.onRenovar});

  final Estadia estadia;
  final VoidCallback onRenovar;

  @override
  Widget build(BuildContext context) {
    final agora = DateTime.now();
    final vence = DateTime.fromMillisecondsSinceEpoch(estadia.validaAteEpoch);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Faixa(
          cor: AppColors.primary,
          fundo: AppColors.successBg,
          icone: iconeHospede,
          titulo: 'Hóspede · entrada sem cobrança',
          linhas: [
            'Válida até ${fmtValidade(vence, agora)}',
            'Faltam ${fmtDuracaoLonga(vence.difference(agora))} · ${estadia.tipoVeiculo}',
          ],
        ),
        TextButton.icon(
          onPressed: onRenovar,
          icon: const Icon(Icons.refresh),
          label: const Text('Renovar estadia'),
        ),
      ],
    );
  }
}

/// Estadia vencida há até 7 dias, carro voltando: renovar ou entrar avulso.
class FaixaEstadiaVencida extends StatelessWidget {
  const FaixaEstadiaVencida({
    super.key,
    required this.estadia,
    required this.onRenovar,
    required this.onAvulso,
  });

  final Estadia estadia;
  final VoidCallback onRenovar;
  final VoidCallback onAvulso;

  @override
  Widget build(BuildContext context) {
    final agora = DateTime.now();
    final venceu = DateTime.fromMillisecondsSinceEpoch(estadia.validaAteEpoch);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.warningBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.35), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _ConteudoFaixa(
            cor: const Color(0xFF92400E),
            icone: Icons.schedule,
            titulo: 'Estadia vencida há ${fmtDuracaoLonga(agora.difference(venceu))}',
            linhas: [
              'Venceu ${fmtValidade(venceu, agora)}',
              'O carro estava fora: esse tempo não é cobrado. Renovando, as diárias '
                  'contam a partir de agora.',
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: FilledButton(onPressed: onRenovar, child: const Text('Renovar…')),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(onPressed: onAvulso, child: const Text('Entrar como avulso')),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Faixa extends StatelessWidget {
  const _Faixa({
    required this.cor,
    required this.fundo,
    required this.icone,
    required this.titulo,
    this.linhas = const [],
  });

  final Color cor;
  final Color fundo;
  final IconData icone;
  final String titulo;
  final List<String> linhas;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: fundo,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: cor.withValues(alpha: 0.35), width: 1.5),
        ),
        child: _ConteudoFaixa(cor: cor, icone: icone, titulo: titulo, linhas: linhas),
      );
}

class _ConteudoFaixa extends StatelessWidget {
  const _ConteudoFaixa({
    required this.cor,
    required this.icone,
    required this.titulo,
    required this.linhas,
  });

  final Color cor;
  final IconData icone;
  final String titulo;
  final List<String> linhas;

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12)),
            child: Icon(icone, color: cor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(titulo, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: cor)),
                for (final l in linhas)
                  Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Text(l, style: TextStyle(fontSize: 13, height: 1.35, color: cor)),
                  ),
              ],
            ),
          ),
        ],
      );
}
