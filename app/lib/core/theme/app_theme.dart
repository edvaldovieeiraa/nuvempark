import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'app_colors.dart';

/// Tema NuvemPark — **Brisa**. Light-first, verde, Material 3 claro.
///
/// Formas do Brisa: CTA em pílula (999), cards em 20–24, chips/ícones em 14–18.
abstract final class AppTheme {
  static const double buttonHeight = 54.0;
  static const double inputHeight = 54.0;
  static const double cardRadius = 20.0;

  /// CTA do Brisa é pílula. 999 = "totalmente arredondado" (igual ao CSS).
  static const double buttonRadius = 999.0;

  /// Raio de campos e chips — o Brisa não usa pílula aqui.
  static const double inputRadius = 16.0;

  /// A fonte do Brisa. Embutida como asset — ver pubspec.yaml.
  static const String fontFamily = 'PlusJakartaSans';

  static ThemeData get theme {
    final base = ThemeData.light(useMaterial3: true);

    const colorScheme = ColorScheme.light(
      primary: AppColors.primary,
      onPrimary: AppColors.onPrimary,
      primaryContainer: AppColors.primaryContainer,
      onPrimaryContainer: AppColors.onPrimaryContainer,
      secondary: AppColors.secondary,
      onSecondary: AppColors.onSecondary,
      secondaryContainer: AppColors.secondaryContainer,
      surface: AppColors.surface,
      onSurface: AppColors.onSurface,
      surfaceContainerLowest: AppColors.surfaceContainerLowest,
      surfaceContainerLow: AppColors.surfaceContainerLow,
      surfaceContainer: AppColors.surfaceContainer,
      surfaceContainerHigh: AppColors.surfaceContainerHigh,
      surfaceContainerHighest: AppColors.surfaceContainerHighest,
      onSurfaceVariant: AppColors.onSurfaceVariant,
      outline: AppColors.outline,
      outlineVariant: AppColors.outlineVariant,
      error: AppColors.error,
      onError: AppColors.onError,
    );

    return base.copyWith(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.background,
      // `apply` vem DEPOIS do `copyWith`, não antes: os estilos explícitos
      // abaixo substituem a entrada inteira, então um apply anterior seria
      // descartado por eles e a fonte só valeria nos estilos não sobrescritos.
      textTheme: base.textTheme
          .copyWith(
            displayLarge: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.onSurface, letterSpacing: -0.5),
            titleLarge: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.onSurface, letterSpacing: -0.3),
            titleMedium: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.onSurface),
            bodyLarge: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: AppColors.onSurface),
            bodyMedium: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.onSurfaceVariant),
            labelLarge: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.onSurfaceVariant, letterSpacing: 0.96),
          )
          .apply(fontFamily: fontFamily),
      primaryTextTheme: base.primaryTextTheme.apply(fontFamily: fontFamily),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.primary,
        elevation: 0,
        scrolledUnderElevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
          statusBarBrightness: Brightness.light,
        ),
        titleTextStyle: TextStyle(fontFamily: fontFamily, fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.onSurface, letterSpacing: -0.5),
      ),
      // CTA do Brisa: pílula verde VIVA (primaryFill) com texto branco e
      // sombra. É o único lugar onde o #0FA968 pode entrar — como fundo.
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(buttonHeight),
          backgroundColor: AppColors.primaryFill,
          foregroundColor: AppColors.onPrimaryFill,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(buttonRadius)),
          textStyle: const TextStyle(fontFamily: fontFamily, fontSize: 17, fontWeight: FontWeight.w700),
        ),
      ),
      // Contorno usa a TINTA (primary), não o preenchimento: aqui o verde é
      // texto, e o #0FA968 reprovaria no contraste.
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(buttonHeight),
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.outlineVariant, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(buttonRadius)),
          textStyle: const TextStyle(fontFamily: fontFamily, fontSize: 16, fontWeight: FontWeight.w700),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceContainerLow,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(inputRadius), borderSide: const BorderSide(color: AppColors.outlineVariant)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(inputRadius), borderSide: const BorderSide(color: AppColors.outlineVariant)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(inputRadius), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(inputRadius), borderSide: const BorderSide(color: AppColors.error)),
        labelStyle: const TextStyle(fontFamily: fontFamily, color: AppColors.onSurfaceVariant),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(cardRadius),
          side: const BorderSide(color: AppColors.outlineVariant),
        ),
      ),
      dividerTheme: const DividerThemeData(color: AppColors.outlineVariant, thickness: 1),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surface,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.onSurfaceVariant,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      // Chips de seleção (tipo de veículo, tabela de preço): selecionado =
      // verde sólido + texto branco. O default M3 fica "apagado".
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surface,
        selectedColor: AppColors.primaryFill,
        checkmarkColor: Colors.white,
        labelStyle: TextStyle(
          fontFamily: fontFamily,
          fontWeight: FontWeight.w700,
          color: WidgetStateColor.resolveWith(
            (states) => states.contains(WidgetState.selected)
                ? Colors.white
                : AppColors.onSurface,
          ),
        ),
        side: WidgetStateBorderSide.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? const BorderSide(color: AppColors.primaryFill, width: 1.5)
              : const BorderSide(color: AppColors.outlineVariant),
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(inputRadius),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      // NavigationBar (Material 3) — usada no bottom nav do MainShell.
      // Pílula verde sólida + ícone branco: item ativo com presença real.
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        height: 68,
        indicatorColor: AppColors.primaryFill,
        indicatorShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            size: 24,
            color: states.contains(WidgetState.selected)
                ? Colors.white
                : AppColors.onSurfaceVariant,
          ),
        ),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontFamily: fontFamily,
            fontSize: 12,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w800
                : FontWeight.w600,
            color: states.contains(WidgetState.selected)
                ? AppColors.primary
                : AppColors.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}
