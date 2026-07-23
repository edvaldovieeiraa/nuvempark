import 'package:flutter/material.dart';

/// Toasts padronizados. Ícones com cor SEMÂNTICA (verde=sucesso, azul=info,
/// vermelho=erro), independentes da cor de marca.
class AppToast {
  AppToast._();

  static const Color _verde = Color(0xFF22C55E);
  static const Color _azul = Color(0xFF3B82F6);

  static void success(BuildContext context, String message) {
    _show(context, message, _verde, Icons.check_circle_outline);
  }

  static void error(BuildContext context, String message) {
    final colors = Theme.of(context).colorScheme;
    _show(context, message, colors.error, Icons.error_outline);
  }

  static void info(BuildContext context, String message) {
    _show(context, message, _azul, Icons.info_outline);
  }

  /// Erro com uma AÇÃO (ex.: "Reimprimir"). Fica visível por mais tempo para o
  /// operador ter tempo de tocar. Usado por trabalhos de fundo (impressão) que
  /// falham depois da tela ter saído.
  static void errorAcao(
    BuildContext context,
    String message, {
    required String acaoLabel,
    required VoidCallback onAcao,
  }) {
    final colors = Theme.of(context).colorScheme;
    _show(
      context,
      message,
      colors.error,
      Icons.error_outline,
      acaoLabel: acaoLabel,
      onAcao: onAcao,
      duration: const Duration(seconds: 8),
    );
  }

  static void _show(
    BuildContext context,
    String message,
    Color iconColor,
    IconData icon, {
    String? acaoLabel,
    VoidCallback? onAcao,
    Duration duration = const Duration(seconds: 3),
  }) {
    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) return;
    final colors = Theme.of(context).colorScheme;
    messenger
      ..clearSnackBars()
      ..showSnackBar(
        SnackBar(
          backgroundColor: colors.surfaceContainerHighest,
          duration: duration,
          action: (acaoLabel != null && onAcao != null)
              ? SnackBarAction(
                  label: acaoLabel,
                  textColor: iconColor,
                  onPressed: onAcao,
                )
              : null,
          content: Row(
            children: [
              Icon(icon, color: iconColor, size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  message,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: colors.onSurface,
                      ),
                ),
              ),
            ],
          ),
        ),
      );
  }
}
