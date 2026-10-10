import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';

/// Ícone de hóspede (cama) — chip de tabela, faixas, pílulas, selo.
const iconeHospede = Icons.bed_outlined;

/// − [3 diárias] +. O "−" trava no [minimo] e o "+" no [maximo].
class DiariasStepper extends StatelessWidget {
  const DiariasStepper({
    super.key,
    required this.valor,
    required this.onChanged,
    this.minimo = 1,
    this.maximo = 30,
  });

  final int valor;
  final int minimo;
  final int maximo;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final rotulo = valor == 1 ? 'diária' : 'diárias';
    Widget botao(IconData icone, String dica, VoidCallback? acao, {bool cheio = false}) =>
        SizedBox(
          width: 44,
          height: 44,
          child: IconButton(
            tooltip: dica,
            onPressed: acao,
            style: IconButton.styleFrom(
              backgroundColor: cheio ? AppColors.primaryFill : AppColors.surface,
              foregroundColor: cheio ? Colors.white : AppColors.primary,
              disabledBackgroundColor: AppColors.surfaceContainerLow,
              disabledForegroundColor: AppColors.outline,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: Icon(icone, size: 20),
          ),
        );
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          botao(Icons.remove, 'Menos uma diária', valor > minimo ? () => onChanged(valor - 1) : null),
          Semantics(
            value: '$valor $rotulo',
            child: SizedBox(
              width: 52,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('$valor',
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, height: 1)),
                  const SizedBox(height: 3),
                  Text(rotulo,
                      style: const TextStyle(
                          fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.onSurfaceVariant)),
                ],
              ),
            ),
          ),
          botao(Icons.add, 'Mais uma diária', valor < maximo ? () => onChanged(valor + 1) : null,
              cheio: true),
        ],
      ),
    );
  }
}

/// TOTAL à esquerda, VALIDADE à direita.
class TotalEValidade extends StatelessWidget {
  const TotalEValidade({
    super.key,
    required this.total,
    required this.validadeRotulo,
    required this.validade,
    this.detalhe,
  });

  final String total;
  final String validadeRotulo;
  final String validade;
  final String? detalhe;

  @override
  Widget build(BuildContext context) {
    const legenda = TextStyle(
        fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.9, color: AppColors.onSurfaceVariant);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('TOTAL', style: legenda),
              Text(total,
                  style: const TextStyle(
                      fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.primary)),
              if (detalhe != null)
                Text(detalhe!, style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
            ],
          ),
        ),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(validadeRotulo, style: legenda),
              Text(validade,
                  textAlign: TextAlign.right,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      ],
    );
  }
}

/// Toda cobrança de estadia passa pelo caixa: sem caixa aberto, esta faixa
/// toma o lugar do botão (mesma regra do `exigeCaixa` da saída).
class FaixaCaixaFechado extends StatelessWidget {
  const FaixaCaixaFechado({super.key});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.warningBg,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Row(
              children: [
                Icon(Icons.lock_outline, color: AppColors.warning),
                SizedBox(width: 10),
                Expanded(
                  child: Text('Abra o caixa para cobrar a estadia.',
                      style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF78350F))),
                ),
              ],
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: () => context.push(Routes.caixa),
              child: const Text('Abrir caixa'),
            ),
          ],
        ),
      );
}

/// Caixa com explicação de onde a contagem começa (renovação/conversão).
class AvisoBase extends StatelessWidget {
  const AvisoBase(this.texto, {super.key});
  final String texto;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.info_outline, size: 18, color: AppColors.primary),
            const SizedBox(width: 10),
            Expanded(
              child: Text(texto, style: const TextStyle(fontSize: 13, height: 1.4, color: Color(0xFF374151))),
            ),
          ],
        ),
      );
}
