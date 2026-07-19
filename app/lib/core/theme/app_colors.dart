import 'package:flutter/material.dart';

/// Paleta NuvemPark — **Brisa**. Verde protagonista, light-first.
/// Portada do protótipo "NuvemPark Brisa" (claude.ai/design).
///
/// ## Os DOIS verdes não são estilo — são contraste
///
/// O protótipo usa dois verdes com papéis rigorosamente separados, e a razão é
/// legibilidade, não gosto:
///
/// * [primary] `#0B7A4C` — a **tinta verde**. ~5,4:1 sobre branco → passa
///   WCAG AA para texto normal. É o único que pode virar texto/ícone.
/// * [primaryFill] `#0FA968` — o **preenchimento**. ~3,0:1 sobre branco →
///   REPROVA para texto, mas cumpre o mínimo de componente de UI. Só entra como
///   fundo de CTA/chip, com texto branco por cima.
///
/// No protótipo isso é literal: `#0B7A4C` aparece 33× e SEMPRE como `color:`,
/// nunca como `background:`. Inverter os dois quebra o contraste do app inteiro
/// de forma silenciosa — o texto continua aparecendo, só fica ilegível no sol
/// do pátio, que é exatamente onde este app é usado.
abstract final class AppColors {
  // ---- Backgrounds (claros) ----
  /// Fundo do app (o "papel" do Brisa) — #F4F8F5 do protótipo novo.
  static const Color background = Color(0xFFF4F8F5);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceContainerLowest = Color(0xFFFFFFFF);
  static const Color surfaceContainerLow = Color(0xFFF9FAFB);
  static const Color surfaceContainer = Color(0xFFF0FDF4);
  static const Color surfaceContainerHigh = Color(0xFFECF7EF);
  static const Color surfaceContainerHighest = Color(0xFFDCFCE7);
  static const Color surfaceBright = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFF0FDF4);

  /// Superfície ESCURA: cards de destaque e botões secundários do Brisa.
  /// Texto por cima é branco.
  static const Color surfaceInverse = Color(0xFF123B2A);
  static const Color onSurfaceInverse = Color(0xFFFFFFFF);

  // ---- Texto sobre fundo claro ----
  static const Color onSurface = Color(0xFF1F2937);
  static const Color onBackground = Color(0xFF1F2937);
  static const Color onSurfaceVariant = Color(0xFF6B7280);
  static const Color outline = Color(0xFF9CA3AF);
  static const Color outlineVariant = Color(0xFFE5E7EB);

  // ---- Primária (verde marca) ----
  /// Tinta verde — segura como TEXTO (#15803D, ~5:1 no branco). Ver doc da classe.
  static const Color primary = Color(0xFF15803D);
  static const Color onPrimary = Color(0xFFFFFFFF);

  /// Preenchimento — FUNDO de CTA/chip (#16A34A). Texto branco por cima.
  static const Color primaryFill = Color(0xFF16A34A);
  static const Color onPrimaryFill = Color(0xFFFFFFFF);

  static const Color primaryContainer = Color(0xFFDCFCE7);
  static const Color onPrimaryContainer = Color(0xFF15803D);

  // ---- Accent ----
  static const Color secondary = Color(0xFF16A34A);
  static const Color onSecondary = Color(0xFFFFFFFF);
  static const Color secondaryContainer = Color(0xFFDCFCE7);
  static const Color secondaryFixed = Color(0xFFA7D9BC);
  static const Color secondaryFixedDim = Color(0xFF16A34A);

  // ---- Semânticas ----
  // Tripletes fundo/frente do Brisa: ok · aviso · erro · saída.
  static const Color success = Color(0xFF16A34A);
  static const Color successBg = Color(0xFFDCFCE7);
  static const Color warning = Color(0xFFB45309);
  static const Color warningBg = Color(0xFFFEF3C7);
  static const Color danger = Color(0xFFDC2626);
  static const Color dangerBg = Color(0xFFFEE2E2);
  static const Color error = Color(0xFFDC2626);
  static const Color onError = Color(0xFFFFFFFF);
  static const Color errorContainer = Color(0xFFFEE2E2);

  // ---- Ações entrada/saída (temático) ----
  static const Color entrada = Color(0xFF16A34A); // verde = entra/livre
  static const Color entradaBg = Color(0xFFDCFCE7);
  static const Color saida = Color(0xFFEA580C); // laranja = sai/ocupado
  static const Color saidaBg = Color(0xFFFEF6F1);

  // ---- Gradiente assinatura (verde) ----
  static const List<Color> gradient = [Color(0xFF16A34A), Color(0xFF15803D)];

  // ---- Indicadores de sync ----
  static const Color syncOnline = Color(0xFF16A34A);
  static const Color syncPending = Color(0xFFB45309);
  static const Color syncOffline = Color(0xFFDC2626);

  // ---- Compat / atalhos ----
  static const Color info = Color(0xFF15803D);
  static const Color textSecondary = onSurfaceVariant;
  static const Color border = outlineVariant;

  /// Sombra dos cards do Brisa: suave, esverdeada.
  static const Color shadow = Color(0x14123B2A);
}
