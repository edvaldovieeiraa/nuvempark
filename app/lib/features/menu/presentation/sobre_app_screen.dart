import 'package:flutter/material.dart';

import '../../../core/config/env.dart';
import '../../../core/theme/app_colors.dart';

/// Identificação do app. Versão vem do [Env] (injetado por --dart-define no
/// build) — sem package_info_plus: seria uma dependência nova para ler um dado
/// que o app já carrega.
class SobreAppScreen extends StatelessWidget {
  const SobreAppScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sobre o aplicativo')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SizedBox(height: 12),
          Center(
            child: Column(
              children: [
                Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: AppColors.gradient),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(Icons.cloud_outlined,
                      size: 38, color: Colors.white),
                ),
                const SizedBox(height: 14),
                const Text('NuvemPark',
                    style: TextStyle(
                        fontSize: 24, fontWeight: FontWeight.w800)),
                const SizedBox(height: 2),
                const Text('App do operador de pátio',
                    style: TextStyle(
                        fontSize: 13, color: AppColors.onSurfaceVariant)),
                const SizedBox(height: 10),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.entradaBg,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    Env.versionDisplay,
                    style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.entrada),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                _linha('Versão', Env.appVersion),
                const Divider(height: 1, indent: 14, endIndent: 14),
                _linha('Build', Env.buildNumber),
                const Divider(height: 1, indent: 14, endIndent: 14),
                _linha('Revisão', Env.gitSha),
                const Divider(height: 1, indent: 14, endIndent: 14),
                _linha(
                  'Servidor',
                  Env.apiBaseUrl.replaceFirst(RegExp(r'^https?://'), ''),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              'O app funciona sem internet: as entradas e saídas ficam guardadas '
              'no aparelho e sobem sozinhas quando a rede voltar.',
              style:
                  TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant),
            ),
          ),
        ],
      ),
    );
  }

  Widget _linha(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        child: Row(
          children: [
            Text(k,
                style: const TextStyle(
                    fontSize: 13, color: AppColors.onSurfaceVariant)),
            const Spacer(),
            Flexible(
              child: Text(v,
                  textAlign: TextAlign.right,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      );
}
