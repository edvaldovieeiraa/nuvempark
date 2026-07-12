import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/theme/app_colors.dart';
import '../domain/caixa_model.dart';
import 'providers/caixa_provider.dart';

/// Movimentos da sessão de caixa aberta: cada entrada/sangria/isenção,
/// com totais por tipo no topo. Somente leitura (movimentos são imutáveis).
class CaixaMovimentosScreen extends ConsumerWidget {
  const CaixaMovimentosScreen({super.key});

  static final _moeda = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
  static final _hora = DateFormat('HH:mm');
  static final _diaHora = DateFormat('dd/MM HH:mm');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessao = ref.watch(caixaSessaoNotifierProvider).value;

    return Scaffold(
      appBar: AppBar(title: const Text('Movimentos do caixa')),
      body: sessao == null
          ? const EmptyState(
              icon: Icons.point_of_sale_outlined,
              titulo: 'Nenhum caixa aberto',
              descricao: 'Abra o caixa para registrar movimentos.',
            )
          : _MovimentosBody(sessao: sessao),
    );
  }

  static String formatarValor(double v) => _moeda.format(v);
  static String formatarHora(DateTime d) {
    final agora = DateTime.now();
    final mesmoDia = d.year == agora.year && d.month == agora.month && d.day == agora.day;
    return mesmoDia ? _hora.format(d) : _diaHora.format(d);
  }
}

class _MovimentosBody extends ConsumerWidget {
  const _MovimentosBody({required this.sessao});

  final CaixaModel sessao;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final movimentosAsync = ref.watch(caixaMovimentosProvider(sessao.id));

    return movimentosAsync.when(
      loading: () => const _MovimentosSkeleton(),
      error: (e, _) =>
          const ErrorState(mensagem: 'Erro ao carregar os movimentos.'),
      data: (movimentos) => RefreshIndicator(
        onRefresh: () async =>
            ref.invalidate(caixaMovimentosProvider(sessao.id)),
        child: movimentos.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 120),
                  EmptyState(
                    icon: Icons.receipt_long_outlined,
                    titulo: 'Sem movimentos ainda',
                    descricao:
                        'As cobranças de tickets e sangrias aparecem aqui.',
                  ),
                ],
              )
            : ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  _ResumoCard(sessao: sessao, movimentos: movimentos),
                  const SizedBox(height: 16),
                  ...movimentos.map((m) => _MovimentoTile(movimento: m)),
                ],
              ),
      ),
    );
  }
}

class _ResumoCard extends StatelessWidget {
  const _ResumoCard({required this.sessao, required this.movimentos});

  final CaixaModel sessao;
  final List<MovimentoModel> movimentos;

  @override
  Widget build(BuildContext context) {
    final qtdEntradas = movimentos.where((m) => m.tipo == 'entrada').length;
    final qtdSangrias = movimentos.where((m) => m.tipo == 'sangria').length;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          _resumoItem(
            'Entradas',
            CaixaMovimentosScreen.formatarValor(sessao.totalEntradas),
            '$qtdEntradas mov.',
            AppColors.entrada,
          ),
          Container(width: 1, height: 40, color: AppColors.border),
          _resumoItem(
            'Sangrias',
            CaixaMovimentosScreen.formatarValor(sessao.totalSangrias),
            '$qtdSangrias mov.',
            AppColors.danger,
          ),
          Container(width: 1, height: 40, color: AppColors.border),
          _resumoItem(
            'Saldo esperado',
            CaixaMovimentosScreen.formatarValor(sessao.saldoCalculado),
            'fundo incluso',
            AppColors.onSurface,
          ),
        ],
      ),
    );
  }

  Widget _resumoItem(String rotulo, String valor, String detalhe, Color cor) =>
      Expanded(
        child: Column(
          children: [
            Text(rotulo,
                style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurfaceVariant)),
            const SizedBox(height: 2),
            Text(valor,
                style: TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w800, color: cor)),
            Text(detalhe,
                style: const TextStyle(
                    fontSize: 10, color: AppColors.outline)),
          ],
        ),
      );
}

class _MovimentoTile extends StatelessWidget {
  const _MovimentoTile({required this.movimento});

  final MovimentoModel movimento;

  @override
  Widget build(BuildContext context) {
    final (icone, corIcone, fundoIcone) = switch (movimento.tipo) {
      'sangria' => (
          Icons.arrow_upward_rounded,
          AppColors.danger,
          const Color(0xFFFDECEC)
        ),
      'isencao' => (
          Icons.volunteer_activism_outlined,
          AppColors.onSurfaceVariant,
          AppColors.surfaceContainer
        ),
      _ => (Icons.arrow_downward_rounded, AppColors.entrada, AppColors.entradaBg),
    };

    final sinal = movimento.tipo == 'sangria' ? '−' : '+';
    final corValor = switch (movimento.tipo) {
      'sangria' => AppColors.danger,
      'isencao' => AppColors.onSurfaceVariant,
      _ => AppColors.entrada,
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: fundoIcone,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icone, size: 20, color: corIcone),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  movimento.descricao,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 14),
                ),
                const SizedBox(height: 2),
                Text(
                  _subtitulo(),
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.onSurfaceVariant),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$sinal${CaixaMovimentosScreen.formatarValor(movimento.valor)}',
                style: TextStyle(
                    fontWeight: FontWeight.w800, fontSize: 14, color: corValor),
              ),
              Text(
                CaixaMovimentosScreen.formatarHora(movimento.criadoEm),
                style:
                    const TextStyle(fontSize: 11, color: AppColors.outline),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _subtitulo() {
    final partes = <String>[];
    if (movimento.formaPagamento != null) {
      partes.add(movimento.formaPagamento!.replaceAll('_', ' '));
    }
    partes.add(switch (movimento.tipo) {
      'sangria' => 'sangria',
      'isencao' => 'isenção',
      _ => 'entrada',
    });
    return partes.join(' · ');
  }
}

class _MovimentosSkeleton extends StatelessWidget {
  const _MovimentosSkeleton();

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SkeletonBox(height: 76, radius: 16),
          const SizedBox(height: 16),
          for (var i = 0; i < 6; i++) ...[
            const SkeletonBox(height: 64, radius: 14),
            const SizedBox(height: 8),
          ],
        ],
      );
}
