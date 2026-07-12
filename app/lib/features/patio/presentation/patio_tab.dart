import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../printing/data/print_templates.dart';
import '../../printing/presentation/providers/printer_provider.dart';
import '../../tickets/domain/ticket_model.dart';
import '../../tickets/presentation/providers/ticket_provider.dart';
import 'providers/patio_provider.dart';

/// Aba Pátio: todos os veículos dentro do pátio agora, com busca por placa
/// e permanência. Tocar num veículo abre a saída dele.
class PatioTab extends ConsumerStatefulWidget {
  const PatioTab({super.key});

  @override
  ConsumerState<PatioTab> createState() => _PatioTabState();
}

class _PatioTabState extends ConsumerState<PatioTab> {
  static final _hora = DateFormat('HH:mm');

  final _buscaCtrl = TextEditingController();
  String _busca = '';

  @override
  void dispose() {
    _buscaCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final abertos =
        ref.watch(ticketsAbertosProvider).value ?? const <TicketModel>[];
    final patio = ref.watch(patioNotifierProvider).value;
    final filtrados = _busca.isEmpty
        ? abertos
        : abertos
            .where((t) => t.placa.contains(_busca.toUpperCase()))
            .toList();

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Pátio'),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.entradaBg,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '${abertos.length}${patio != null && patio.qtdVagas > 0 ? '/${patio.qtdVagas}' : ''}',
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: AppColors.entrada),
              ),
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: () => context.push(Routes.movimentos),
            icon: const Icon(Icons.history, size: 18),
            label: const Text('Movimentos'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(ticketsAbertosProvider),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            TextField(
              controller: _buscaCtrl,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                hintText: 'Buscar placa…',
                prefixIcon: const Icon(Icons.search, size: 20),
                isDense: true,
                suffixIcon: _busca.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close, size: 18),
                        onPressed: () {
                          _buscaCtrl.clear();
                          setState(() => _busca = '');
                        },
                      ),
              ),
              onChanged: (v) => setState(() => _busca = v),
            ),
            const SizedBox(height: 12),
            if (abertos.isEmpty)
              _vazio()
            else if (filtrados.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Text('Nenhuma placa encontrada.',
                      style: TextStyle(color: AppColors.onSurfaceVariant)),
                ),
              )
            else
              ...filtrados.map(_tileVeiculo),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _tileVeiculo(TicketModel t) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: InkWell(
        onTap: () => context.push(Routes.saidaDetalhe(t.id)),
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              Icon(
                t.tipoVeiculo == 'moto'
                    ? Icons.two_wheeler_outlined
                    : Icons.directions_car_outlined,
                size: 22,
                color: AppColors.onSurfaceVariant,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t.placa,
                        style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                            letterSpacing: 1.5)),
                    Text(
                      '${t.tipoVeiculo} · entrou ${_hora.format(t.entrada)}',
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_permanencia(t.entrada),
                    style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurface)),
              ),
              IconButton(
                tooltip: 'Reimprimir ticket',
                icon: const Icon(Icons.print_outlined,
                    size: 20, color: AppColors.onSurfaceVariant),
                onPressed: () => _reimprimir(t),
              ),
              const Icon(Icons.chevron_right,
                  color: AppColors.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }

  Widget _vazio() => Container(
        padding: const EdgeInsets.symmetric(vertical: 40),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: const BoxDecoration(
                color: AppColors.entradaBg,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.local_parking,
                  size: 28, color: AppColors.entrada),
            ),
            const SizedBox(height: 12),
            const Text('Pátio vazio',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 4),
            const Text('Os veículos aparecem aqui assim que entram.',
                style: TextStyle(
                    fontSize: 13, color: AppColors.onSurfaceVariant)),
          ],
        ),
      );

  /// Reimprime o cupom de entrada do veículo (2ª via — mesmo QR e dados).
  Future<void> _reimprimir(TicketModel t) async {
    final printer = await ref
        .read(printerNotifierProvider.future)
        .catchError((_) => const PrinterState());
    if (!printer.temImpressora) {
      if (mounted) {
        AppToast.error(
            context, 'Nenhuma impressora configurada. Veja em Config.');
      }
      return;
    }
    final patio = ref.read(patioNotifierProvider).value;
    final bytes = PrintTemplates.ticketEntrada(
      ticketId: t.id,
      placa: t.placa,
      tipoVeiculo: t.tipoVeiculo,
      entrada: t.entrada,
      operacaoNome: patio?.nome ?? 'NuvemPark',
      cols: printer.cols,
      avancoFinal: printer.avancoFinal,
      cabecalho: patio?.ticketCabecalho ?? const [],
      rodape: patio?.ticketRodape ?? const [],
    );
    final ok = await ref.read(printerNotifierProvider.notifier).print(bytes);
    if (!mounted) return;
    if (ok) {
      AppToast.success(context, 'Ticket de ${t.placa} reimpresso.');
    } else {
      AppToast.error(context, 'Falha ao imprimir. Verifique a impressora.');
    }
  }

  static String _permanencia(DateTime entrada) {
    final min = DateTime.now().difference(entrada).inMinutes;
    if (min < 60) return '${min}min';
    final h = min ~/ 60;
    if (h < 24) return '${h}h${(min % 60).toString().padLeft(2, '0')}';
    return '${h ~/ 24}d ${h % 24}h';
  }
}
