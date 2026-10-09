import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Grade de formas de pagamento (cards do Brisa, 2 colunas) — a da saída,
/// compartilhada com contratação, renovação e conversão de estadia.
///
/// A escolhida ganha um selo de check além da borda verde: no sol, cor sozinha
/// não basta para o operador ter certeza de qual marcou.
class FormaPagamentoGrid extends StatelessWidget {
  const FormaPagamentoGrid({
    super.key,
    required this.formas,
    required this.selecionada,
    required this.onSelecionar,
  });

  /// Formas configuradas no pátio (`patio.formasPagamento`).
  final List<String> formas;

  /// Nenhuma pré-marcada: quem chama começa com null.
  final String? selecionada;
  final ValueChanged<String> onSelecionar;

  static String rotulo(String forma) => switch (forma) {
        'dinheiro' => 'Dinheiro',
        'cartao_debito' => 'Cartão de débito',
        'cartao_credito' => 'Cartão de crédito',
        'pix' => 'Pix (manual)',
        _ => forma,
      };

  static IconData icone(String forma) => switch (forma) {
        'dinheiro' => Icons.payments_outlined,
        'cartao_debito' => Icons.credit_card,
        'cartao_credito' => Icons.credit_card,
        'pix' => Icons.pix,
        _ => Icons.attach_money,
      };

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (ctx, c) {
          const gap = 10.0;
          final w = (c.maxWidth - gap) / 2;
          return Wrap(
            spacing: gap,
            runSpacing: gap,
            children: [
              for (final forma in formas)
                SizedBox(
                  width: w,
                  child: _Card(
                    forma: forma,
                    selecionada: forma == selecionada,
                    onTap: () => onSelecionar(forma),
                  ),
                ),
            ],
          );
        },
      );
}

class _Card extends StatelessWidget {
  const _Card({required this.forma, required this.selecionada, required this.onTap});

  final String forma;
  final bool selecionada;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        selected: selecionada,
        label: FormaPagamentoGrid.rotulo(forma),
        excludeSemantics: true,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            height: 74,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: selecionada ? AppColors.primaryFill : AppColors.outlineVariant,
                width: 2,
              ),
              boxShadow: const [
                BoxShadow(color: AppColors.shadow, blurRadius: 10, offset: Offset(0, 2)),
              ],
            ),
            child: Stack(
              children: [
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(FormaPagamentoGrid.icone(forma),
                          size: 22,
                          color: selecionada ? AppColors.primary : AppColors.onSurfaceVariant),
                      const SizedBox(height: 5),
                      Text(FormaPagamentoGrid.rotulo(forma),
                          style: const TextStyle(
                              fontSize: 13,
                              height: 1,
                              fontWeight: FontWeight.w700,
                              color: AppColors.onSurface)),
                    ],
                  ),
                ),
                if (selecionada)
                  Positioned(
                    top: 6,
                    right: 8,
                    child: Container(
                      width: 20,
                      height: 20,
                      decoration: const BoxDecoration(
                          color: AppColors.primaryFill, shape: BoxShape.circle),
                      child: const Icon(Icons.check, size: 13, color: Colors.white),
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
}
