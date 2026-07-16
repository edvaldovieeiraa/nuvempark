import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Blocos compartilhados do Brisa — o que se repete entre telas.
///
/// Existe para que "card branco do Brisa" tenha UMA definição: a sombra
/// `rgba(18,59,42,.06)` e os raios 20/24/28 aparecem em quase toda tela, e
/// copiá-los à mão garante que um dia divirjam.

/// AppBar do Brisa: sem barra — um chip de voltar + título, sobre o fundo.
///
/// As telas empilhadas (entrada, saída, movimentos, mensalistas) usam isto no
/// lugar do `AppBar` do Material, que traria elevação, altura fixa e um ícone
/// de voltar solto que não combina com a linguagem de chips do Brisa.
PreferredSizeWidget appBarBrisa(BuildContext context, String titulo) {
  return PreferredSize(
    preferredSize: const Size.fromHeight(58),
    child: SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
        child: Row(
          children: [
            InkWell(
              onTap: () => Navigator.of(context).maybePop(),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: const [
                    BoxShadow(
                        color: AppColors.shadow,
                        blurRadius: 8,
                        offset: Offset(0, 2)),
                  ],
                ),
                child: const Icon(Icons.arrow_back,
                    size: 20, color: AppColors.onSurface),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                titulo,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 18,
                  height: 1,
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface,
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// Card branco do Brisa: raio grande + sombra suave. `onTap` opcional.
class CardBrisa extends StatelessWidget {
  const CardBrisa({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(18),
    this.radius = 24,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets padding;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final corpo = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(radius),
        boxShadow: const [
          BoxShadow(
              color: AppColors.shadow, blurRadius: 10, offset: Offset(0, 2)),
        ],
      ),
      child: child,
    );
    if (onTap == null) return corpo;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(radius),
      child: corpo,
    );
  }
}

/// Pílula de status do Brisa — os tripletes bg/fg da paleta.
class PilulaBrisa extends StatelessWidget {
  const PilulaBrisa({
    super.key,
    required this.texto,
    required this.bg,
    required this.fg,
    this.icone,
  });

  final String texto;
  final Color bg;
  final Color fg;
  final IconData? icone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(texto,
              style: TextStyle(
                  fontSize: 12,
                  height: 1,
                  fontWeight: FontWeight.w700,
                  color: fg)),
          if (icone != null) ...[
            const SizedBox(width: 5),
            Icon(icone, size: 14, color: fg),
          ],
        ],
      ),
    );
  }
}

/// Rótulo de seção do Brisa (o "OPERAÇÃO" / "Tipo de veículo").
class RotuloBrisa extends StatelessWidget {
  const RotuloBrisa(this.texto, {super.key});

  final String texto;

  @override
  Widget build(BuildContext context) {
    return Text(
      texto,
      style: const TextStyle(
        fontSize: 12,
        height: 1,
        fontWeight: FontWeight.w700,
        color: AppColors.onSurfaceVariant,
      ),
    );
  }
}
