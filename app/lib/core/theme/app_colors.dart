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
  /// Fundo do app (o "papel" do Brisa).
  static const Color background = Color(0xFFF1F7F2);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceContainerLowest = Color(0xFFFFFFFF);
  static const Color surfaceContainerLow = Color(0xFFF5F9F6);
  static const Color surfaceContainer = Color(0xFFEFF6F1);
  static const Color surfaceContainerHigh = Color(0xFFE3EFE7);
  static const Color surfaceContainerHighest = Color(0xFFDCE9E0);
  static const Color surfaceBright = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFEFF6F1);

  /// Superfície ESCURA: cards de destaque e botões secundários do Brisa
  /// (raio 28, sombra funda). Texto por cima é branco.
  static const Color surfaceInverse = Color(0xFF123B2A);
  static const Color onSurfaceInverse = Color(0xFFFFFFFF);

  // ---- Texto sobre fundo claro ----
  static const Color onSurface = Color(0xFF123B2A);
  static const Color onBackground = Color(0xFF123B2A);
  static const Color onSurfaceVariant = Color(0xFF6E8177);
  static const Color outline = Color(0xFF9DB0A5);
  static const Color outlineVariant = Color(0xFFE3EFE7);

  // ---- Primária (verde marca) ----
  /// Tinta verde — segura como TEXTO (~5,4:1 no branco). Ver doc da classe.
  static const Color primary = Color(0xFF0B7A4C);
  static const Color onPrimary = Color(0xFFFFFFFF);

  /// Preenchimento — só como FUNDO de CTA/chip. Nunca como texto (~3,0:1).
  static const Color primaryFill = Color(0xFF0FA968);
  static const Color onPrimaryFill = Color(0xFFFFFFFF);

  static const Color primaryContainer = Color(0xFFDFF2E7);
  static const Color onPrimaryContainer = Color(0xFF0B7A4C);

  // ---- Accent ----
  static const Color secondary = Color(0xFF0FA968);
  static const Color onSecondary = Color(0xFFFFFFFF);
  static const Color secondaryContainer = Color(0xFFDFF2E7);
  static const Color secondaryFixed = Color(0xFFA9D6C1);
  static const Color secondaryFixedDim = Color(0xFF0FA968);

  // ---- Semânticas ----
  // Tripletes fundo/frente do Brisa: ok · aviso · erro · saída.
  static const Color success = Color(0xFF0B7A4C);
  static const Color successBg = Color(0xFFDFF2E7);
  static const Color warning = Color(0xFFC77E06);
  static const Color warningBg = Color(0xFFFFF4DE);
  static const Color danger = Color(0xFFE0472C);
  static const Color dangerBg = Color(0xFFFCE4DE);
  static const Color error = Color(0xFFE0472C);
  static const Color onError = Color(0xFFFFFFFF);
  static const Color errorContainer = Color(0xFFFCE4DE);

  // ---- Ações entrada/saída (temático) ----
  static const Color entrada = Color(0xFF0B7A4C); // verde = entra/livre
  static const Color entradaBg = Color(0xFFDFF2E7);
  static const Color saida = Color(0xFFF0641E); // laranja = sai/ocupado
  static const Color saidaBg = Color(0xFFFDEEE4);

  // ---- Gradiente assinatura (verde) ----
  static const List<Color> gradient = [Color(0xFF0B7A4C), Color(0xFF0FA968)];

  // ---- Indicadores de sync ----
  static const Color syncOnline = Color(0xFF0FA968);
  static const Color syncPending = Color(0xFFC77E06);
  static const Color syncOffline = Color(0xFFE0472C);

  // ---- Compat / atalhos ----
  static const Color info = Color(0xFF0B7A4C);
  static const Color textSecondary = onSurfaceVariant;
  static const Color border = outlineVariant;

  /// Sombra dos cards do Brisa: `0 2px 8px rgba(18,59,42,.08)`.
  static const Color shadow = Color(0x14123B2A);
}
