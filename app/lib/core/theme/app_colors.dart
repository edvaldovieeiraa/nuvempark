import 'package:flutter/material.dart';

/// Paleta NuvemPark — VERDE protagonista, LIGHT-FIRST (fundo claro).
/// Verde = vaga livre (temático). Saída em laranja. Fundo branco/claro.
abstract final class AppColors {
  // ---- Backgrounds (claros) ----
  static const Color background = Color(0xFFF6F8F6);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceContainerLowest = Color(0xFFFFFFFF);
  static const Color surfaceContainerLow = Color(0xFFF4F6F4);
  static const Color surfaceContainer = Color(0xFFEEF2EE);
  static const Color surfaceContainerHigh = Color(0xFFE9EDE9);
  static const Color surfaceContainerHighest = Color(0xFFE3E9E4);
  static const Color surfaceBright = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFEEF2EE);

  // ---- Texto sobre fundo claro ----
  static const Color onSurface = Color(0xFF17231C);
  static const Color onBackground = Color(0xFF17231C);
  static const Color onSurfaceVariant = Color(0xFF5F6B62);
  static const Color outline = Color(0xFF97A29A);
  static const Color outlineVariant = Color(0xFFDCE3DC);

  // ---- Primária (verde marca) ----
  static const Color primary = Color(0xFF059669);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color primaryContainer = Color(0xFFD6F5E7);
  static const Color onPrimaryContainer = Color(0xFF00382A);

  // ---- Accent (verde esmeralda) ----
  static const Color secondary = Color(0xFF10B981);
  static const Color onSecondary = Color(0xFFFFFFFF);
  static const Color secondaryContainer = Color(0xFFCDF3E4);
  static const Color secondaryFixed = Color(0xFF34D399);
  static const Color secondaryFixedDim = Color(0xFF10B981);

  // ---- Semânticas ----
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);
  static const Color error = Color(0xFFDC2626);
  static const Color onError = Color(0xFFFFFFFF);

  // ---- Ações entrada/saída (temático) ----
  static const Color entrada = Color(0xFF059669); // verde = entra/livre
  static const Color entradaBg = Color(0xFFEAF7F1);
  static const Color saida = Color(0xFFEA580C); // laranja = sai/ocupado
  static const Color saidaBg = Color(0xFFFDEEE3);

  // ---- Gradiente assinatura (verde) ----
  static const List<Color> gradient = [Color(0xFF059669), Color(0xFF10B981)];

  // ---- Indicadores de sync ----
  static const Color syncOnline = Color(0xFF10B981);
  static const Color syncPending = Color(0xFFF59E0B);
  static const Color syncOffline = Color(0xFFEF4444);

  // ---- Compat / atalhos ----
  static const Color info = Color(0xFF3B82F6);
  static const Color textSecondary = onSurfaceVariant;
  static const Color border = outlineVariant;
}
