import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../patio/presentation/providers/patio_provider.dart';
import '../../printing/data/print_templates.dart';
import '../../printing/presentation/providers/printer_provider.dart';
import '../domain/caixa_model.dart';
import 'providers/caixa_provider.dart';

/// Caixa: abre sessão (fundo), mostra saldo e permite fechar (conferência).
class CaixaScreen extends ConsumerWidget {
  const CaixaScreen({super.key});

  static final _moeda = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessaoAsync = ref.watch(caixaSessaoNotifierProvider);

    final temCaixaAberto = sessaoAsync.value != null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Caixa'),
        actions: [
          if (temCaixaAberto)
            IconButton(
              tooltip: 'Movimentos',
              icon: const Icon(Icons.receipt_long_outlined),
              onPressed: () => context.push(Routes.caixaMovimentos),
            ),
        ],
      ),
      body: sessaoAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => const ErrorState(mensagem: 'Erro ao carregar o caixa.'),
        data: (sessao) => sessao == null
            ? _semCaixa(context, ref)
            : _comCaixa(context, ref, sessao),
      ),
    );
  }

  Widget _semCaixa(BuildContext context, WidgetRef ref) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.point_of_sale_outlined, size: 56, color: AppColors.outline),
              const SizedBox(height: 16),
              const Text('Nenhum caixa aberto',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              const Text('Abra o caixa informando o fundo inicial.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.onSurfaceVariant)),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: () => _dialogAbrir(context, ref),
                icon: const Icon(Icons.lock_open_outlined),
                label: const Text('Abrir caixa'),
              ),
            ],
          ),
        ),
      );

  Widget _comCaixa(BuildContext context, WidgetRef ref, CaixaModel s) =>
      ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: AppColors.gradient),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Saldo esperado',
                    style: TextStyle(color: Colors.white70, fontSize: 12, letterSpacing: 1)),
                const SizedBox(height: 4),
                Text(_moeda.format(s.saldoCalculado),
                    style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text('Operador: ${s.operadorNome}',
                    style: const TextStyle(color: Colors.white70, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _linha('Fundo inicial', _moeda.format(s.fundoCaixa)),
          _linha('Entradas', _moeda.format(s.totalEntradas)),
          _linha('Sangrias', _moeda.format(s.totalSangrias)),
          const SizedBox(height: 12),
          InkWell(
            onTap: () => context.push(Routes.caixaMovimentos),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
              child: Row(
                children: [
                  const Icon(Icons.receipt_long_outlined,
                      size: 20, color: AppColors.primary),
                  const SizedBox(width: 10),
                  const Text('Ver movimentos do caixa',
                      style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary)),
                  const Spacer(),
                  const Icon(Icons.chevron_right,
                      color: AppColors.onSurfaceVariant),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => _dialogLancamento(context, ref),
            icon: const Icon(Icons.swap_vert_rounded),
            label: const Text('Lançar receita ou despesa'),
          ),
          const SizedBox(height: 10),
          FilledButton.icon(
            onPressed: () => _dialogFechar(context, ref, s),
            icon: const Icon(Icons.lock_outline),
            label: const Text('Fechar caixa'),
          ),
        ],
      );

  Widget _linha(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(k, style: const TextStyle(color: AppColors.onSurfaceVariant)),
            Text(v, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      );

  Future<void> _dialogAbrir(BuildContext context, WidgetRef ref) async {
    // Fundo já vem 0,00 — na maioria dos casos o operador só confirma.
    final ctrl = TextEditingController(text: '0,00');
    ctrl.selection =
        TextSelection(baseOffset: 0, extentOffset: ctrl.text.length);
    final ok = await _dialogValor(context, 'Abrir caixa', 'Fundo inicial (R\$)', ctrl);
    if (ok != true) return;
    final fundo = _parseValor(ctrl.text);
    await ref.read(caixaSessaoNotifierProvider.notifier).abrir(fundo);
    if (context.mounted) AppToast.success(context, 'Caixa aberto!');
  }

  /// Lançamento manual: Receita (entra) ou Despesa (sai), com descrição.
  Future<void> _dialogLancamento(BuildContext context, WidgetRef ref) async {
    final valorCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    var receita = true;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: const Text('Lançar no caixa'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: _chipTipo(
                      'Receita',
                      Icons.arrow_downward_rounded,
                      selecionado: receita,
                      cor: AppColors.entrada,
                      bg: AppColors.entradaBg,
                      onTap: () => setState(() => receita = true),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _chipTipo(
                      'Despesa',
                      Icons.arrow_upward_rounded,
                      selecionado: !receita,
                      cor: AppColors.danger,
                      bg: const Color(0xFFFDECEC),
                      onTap: () => setState(() => receita = false),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: valorCtrl,
                autofocus: true,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))
                ],
                decoration: const InputDecoration(labelText: 'Valor (R\$)'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descCtrl,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Descrição',
                  hintText: 'Ex.: venda de água / compra de bobina',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancelar')),
            FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Lançar')),
          ],
        ),
      ),
    );
    if (ok != true) return;

    final valor = _parseValor(valorCtrl.text);
    final descricao = descCtrl.text.trim();
    if (valor <= 0) {
      if (context.mounted) AppToast.error(context, 'Informe um valor maior que zero.');
      return;
    }
    if (descricao.isEmpty) {
      if (context.mounted) AppToast.error(context, 'Informe a descrição do lançamento.');
      return;
    }

    final sessao = ref.read(caixaSessaoNotifierProvider).value;
    if (sessao == null) return;
    await ref.read(caixaRepositoryProvider).registrarLancamentoManual(
          caixaSessaoId: sessao.id,
          receita: receita,
          valor: valor,
          descricao: descricao,
        );
    ref.invalidate(caixaSessaoNotifierProvider);
    ref.invalidate(caixaMovimentosProvider(sessao.id));
    if (context.mounted) {
      AppToast.success(
          context, receita ? 'Receita lançada.' : 'Despesa lançada.');
    }
  }

  Widget _chipTipo(
    String label,
    IconData icon, {
    required bool selecionado,
    required Color cor,
    required Color bg,
    required VoidCallback onTap,
  }) =>
      InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selecionado ? bg : AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selecionado ? cor : AppColors.border,
              width: selecionado ? 1.6 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, size: 20, color: selecionado ? cor : AppColors.outline),
              const SizedBox(height: 4),
              Text(label,
                  style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: selecionado ? cor : AppColors.onSurfaceVariant)),
            ],
          ),
        ),
      );

  Future<void> _dialogFechar(BuildContext context, WidgetRef ref, CaixaModel s) async {
    final ctrl = TextEditingController(text: s.saldoCalculado.toStringAsFixed(2));
    final ok = await _dialogValor(context, 'Fechar caixa', 'Valor contado (R\$)', ctrl);
    if (ok != true) return;
    final contado = _parseValor(ctrl.text);
    final fechamento = DateTime.now();
    final res = await ref.read(caixaSessaoNotifierProvider.notifier).fechar(contado);
    if (res == null) return;

    // Imprime o relatório de fechamento (com todos os movimentos da sessão:
    // validações de veículos, receitas e despesas), se houver impressora.
    final printer = await ref
          .read(printerNotifierProvider.future)
          .catchError((_) => const PrinterState());
    if (printer.temImpressora) {
      final patioNome = ref.read(patioNotifierProvider).value?.nome ?? 'Patio';
      final hora = DateFormat('HH:mm');
      final movs = await ref.read(caixaRepositoryProvider).getMovimentos(s.id);
      final bytes = PrintTemplates.fechamentoCaixa(
        operadorNome: s.operadorNome,
        operacaoNome: patioNome,
        abertura: s.abertura,
        fechamento: fechamento,
        fundoCaixa: s.fundoCaixa,
        totalEntradas: s.totalEntradas,
        totalSangrias: s.totalSangrias,
        totalCalculado: res.totalCalculado,
        totalContado: res.totalContado,
        divergencia: res.divergencia,
        movimentos: movs
            .map((m) => MovimentoCupom(
                  hora: hora.format(m.criadoEm),
                  descricao: m.descricao,
                  valor:
                      '${m.tipo == 'sangria' ? '-' : '+'}${_moeda.format(m.valor)}',
                ))
            .toList(),
        cols: printer.cols,
        avancoFinal: printer.avancoFinal,
      );
      await ref.read(printerNotifierProvider.notifier).print(bytes);
    }

    if (context.mounted) {
      final msg = res.temDivergencia
          ? 'Caixa fechado. Divergência: ${_moeda.format(res.divergencia)}'
          : 'Caixa fechado sem divergência.';
      AppToast.info(context, msg);
    }
  }

  Future<bool?> _dialogValor(
    BuildContext context,
    String titulo,
    String label,
    TextEditingController ctrl,
  ) =>
      showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(titulo),
          content: TextField(
            controller: ctrl,
            autofocus: true,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
            decoration: InputDecoration(labelText: label),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirmar')),
          ],
        ),
      );

  static double _parseValor(String s) =>
      double.tryParse(s.replaceAll('.', '').replaceAll(',', '.')) ??
      double.tryParse(s) ??
      0.0;
}
