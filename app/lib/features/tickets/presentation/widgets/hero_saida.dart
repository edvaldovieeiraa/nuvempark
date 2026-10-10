import 'package:flutter/material.dart';

/// Topo escuro da saída: placa em pílula, legenda, valor grande, chips.
/// Extraído da `saida_screen` para a saída de hóspede usar o mesmo componente.
class HeroSaida extends StatelessWidget {
  const HeroSaida({
    super.key,
    required this.placa,
    required this.caption,
    required this.valorLabel,
    required this.subLabel,
    required this.chips,
  });

  final String placa;
  final String? caption;
  final String valorLabel;
  final String subLabel;
  final List<HeroChip> chips;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: const Color(0xFF1F2937),
          borderRadius: BorderRadius.circular(28),
          boxShadow: const [
            BoxShadow(color: Color(0x4D14532D), blurRadius: 28, offset: Offset(0, 10)),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                placa,
                style: const TextStyle(
                    fontSize: 14,
                    height: 1,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.6,
                    color: Colors.white),
              ),
            ),
            if (caption != null) ...[
              const SizedBox(height: 12),
              Text(caption!,
                  style: const TextStyle(
                      fontSize: 11,
                      height: 1,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                      color: Color(0xFF9CA3AF))),
            ],
            const SizedBox(height: 8),
            Text(
              valorLabel,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 44, height: 1, fontWeight: FontWeight.w800, color: Colors.white),
            ),
            const SizedBox(height: 8),
            Text(subLabel,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, height: 1.3, color: Color(0xFF9CA3AF))),
            const SizedBox(height: 14),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: chips,
            ),
          ],
        ),
      );
}

class HeroChip extends StatelessWidget {
  const HeroChip(this.texto, {super.key, this.fundo, this.icone});

  final String texto;

  /// Nulo = chip neutro (branco translúcido). Selo de estado: cor cheia, com
  /// contraste ≥ 4,5:1 para o texto branco (ex.: `#15803D`, `#B45309`).
  final Color? fundo;
  final IconData? icone;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
        decoration: BoxDecoration(
          color: fundo ?? Colors.white.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icone != null) ...[
              Icon(icone, size: 13, color: Colors.white),
              const SizedBox(width: 5),
            ],
            Text(texto,
                style: TextStyle(
                    fontSize: 11,
                    height: 1,
                    fontWeight: fundo != null ? FontWeight.w700 : FontWeight.w600,
                    color: fundo != null ? Colors.white : const Color(0xFFCBD5E1))),
          ],
        ),
      );
}
