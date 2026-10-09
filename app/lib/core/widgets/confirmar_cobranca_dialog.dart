import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Resumo antes de cobrar — no padrão do "Confirmar saída" da saída. Usado em
/// contratação, renovação, conversão e cobrança de atraso de estadia: na v1
/// não há estorno pelo app, então o operador confere antes de gravar.
Future<bool> confirmarCobranca(
  BuildContext context, {
  required String titulo,
  required List<(String, String)> linhas,
  required String total,
  String totalRotulo = 'Total',
  String? aviso,
}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(titulo),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final (k, v) in linhas)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(k, style: const TextStyle(fontSize: 14, color: AppColors.onSurfaceVariant)),
                  const SizedBox(width: 12),
                  Flexible(
                    child: Text(v,
                        textAlign: TextAlign.right,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),
          const Divider(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(totalRotulo,
                  style: const TextStyle(fontSize: 14, color: AppColors.onSurfaceVariant)),
              Text(total,
                  style: const TextStyle(
                      fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.primary)),
            ],
          ),
          if (aviso != null) ...[
            const SizedBox(height: 12),
            Text(aviso, style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
          ],
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Voltar')),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirmar')),
      ],
    ),
  );
  return ok == true;
}
