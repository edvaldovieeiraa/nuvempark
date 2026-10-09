import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/forma_pagamento_grid.dart';
import '../../../database/app_database.dart';
import 'estadia_formatos.dart';
import 'estadia_widgets.dart';
import 'providers/estadias_provider.dart';
import 'renovar_estadia_sheet.dart';

/// Ficha da estadia (aba Hóspedes). Mostra só o que vem do servidor para
/// qualquer aparelho (Revisão 7): validade, diárias, total e pagamentos.
Future<void> mostrarFichaEstadia(BuildContext context, ItemHospede item) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => EstadiaFichaSheet(item: item),
    );

class EstadiaFichaSheet extends ConsumerWidget {
  const EstadiaFichaSheet({super.key, required this.item});

  final ItemHospede item;

  static final _quando = DateFormat("dd/MM 'às' HH:mm");

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final e = item.estadia;
    final agora = DateTime.now();
    final vence = DateTime.fromMillisecondsSinceEpoch(e.validaAteEpoch);
    final vencida = item.vencida(agora);
    final pagamentos = ref.watch(_pagamentosProvider(e.id)).value ?? const <EstadiaPagamento>[];

    Future<void> renovar() async {
      final ok = await mostrarRenovarEstadia(
        context,
        estadia: e,
        origem: OrigemRenovacao.ficha,
        carroDentro: item.dentro,
      );
      if (ok && context.mounted) Navigator.of(context).pop();
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
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
                    Text(e.placa,
                        style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: 3)),
                    Text(
                      '${e.tipoVeiculo} · hóspede · ${item.dentro ? 'no pátio' : 'fora do pátio'}',
                      style: const TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Fechar',
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: vencida ? AppColors.warningBg : AppColors.successBg,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(vencida ? 'VENCEU' : 'VÁLIDA ATÉ',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.9,
                        color: vencida ? const Color(0xFF92400E) : AppColors.primary)),
                Text(fmtValidade(vence, agora),
                    style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: vencida ? const Color(0xFF78350F) : const Color(0xFF123B2A))),
                Text(
                  vencida
                      ? 'Há ${fmtDuracaoLonga(agora.difference(vence))}'
                      : 'Faltam ${fmtDuracaoLonga(vence.difference(agora))}',
                  style: TextStyle(
                      fontSize: 13, color: vencida ? const Color(0xFF92400E) : AppColors.primary),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _numero('Diárias pagas', '${e.diarias}')),
              const SizedBox(width: 10),
              Expanded(child: _numero('Total pago', fmtReais(e.valorTotal))),
            ],
          ),
          const SizedBox(height: 16),
          const Text('PAGAMENTOS',
              style: TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.9, color: AppColors.onSurfaceVariant)),
          for (final p in pagamentos)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${p.tipo == 'renovacao' ? 'Renovação' : 'Contratação'} · '
                          '${p.diarias} diária${p.diarias == 1 ? '' : 's'}',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                        ),
                        Text(
                          '${_quando.format(DateTime.fromMillisecondsSinceEpoch(p.pagoEmEpoch))} · '
                          '${FormaPagamentoGrid.rotulo(p.formaPagamento)}',
                          style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                  Text(fmtReais(p.valor), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                ],
              ),
            ),
          const SizedBox(height: 16),
          if (item.dentro)
            Row(
              children: [
                Expanded(
                  child: vencida
                      ? FilledButton(onPressed: renovar, child: const Text('Renovar'))
                      : OutlinedButton(onPressed: renovar, child: const Text('Renovar')),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: () {
                      Navigator.of(context).pop();
                      context.push(Routes.saidaDetalhe(item.ticketAberto!.id));
                    },
                    style: FilledButton.styleFrom(backgroundColor: AppColors.saida),
                    child: const Text('Registrar saída'),
                  ),
                ),
              ],
            )
          else
            SizedBox(
              height: 54,
              child: FilledButton.icon(
                onPressed: renovar,
                icon: const Icon(iconeHospede),
                label: const Text('Renovar'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _numero(String rotulo, String valor) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.outlineVariant, width: 1.5),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(rotulo, style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
            Text(valor, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          ],
        ),
      );
}

final _pagamentosProvider = FutureProvider.autoDispose.family<List<EstadiaPagamento>, String>(
  (ref, estadiaId) => ref.read(estadiaRepositoryProvider).pagamentos(estadiaId),
);
