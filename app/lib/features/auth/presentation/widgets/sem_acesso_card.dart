import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/theme/app_colors.dart';

/// Orienta quem chega pelas lojas sem conta: o operador pede o acesso ao
/// gerente; o dono do estacionamento cria a conta no site.
///
/// Só o Android ganha o botão para o cadastro. No iOS fica apenas o texto,
/// sem link e sem falar em teste grátis: o cadastro vira assinatura paga, e
/// a diretriz 3.1.1 da Apple proíbe levar a uma compra fora da App Store.
class SemAcessoCard extends StatelessWidget {
  const SemAcessoCard({super.key});

  static final urlCadastro =
      Uri.parse('https://nuvempark.com/cadastro?utm_source=app_android');

  Future<void> _abrirCadastro(BuildContext context) async {
    bool abriu;
    try {
      abriu = await launchUrl(urlCadastro, mode: LaunchMode.externalApplication);
    } catch (_) {
      abriu = false; // aparelho sem navegador / intent recusada
    }
    if (!abriu && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Não foi possível abrir o navegador. '
            'Acesse nuvempark.com/cadastro'),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final android = defaultTargetPlatform == TargetPlatform.android;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 15, 16, 16),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primaryContainer, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Ainda não tem acesso?',
            style: TextStyle(
              fontSize: 14.5,
              fontWeight: FontWeight.w700,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 12),
          const _Caso(
            icone: Icons.badge_outlined,
            titulo: 'Sou operador',
            texto: 'Peça ao gerente o código do pátio, o usuário e a senha.',
          ),
          const SizedBox(height: 12),
          _Caso(
            icone: Icons.storefront_outlined,
            titulo: 'Tenho um estacionamento',
            texto: android
                ? 'Crie a conta do estacionamento no site, com 15 dias grátis.'
                : 'A conta do estacionamento é criada pelo gestor em nuvempark.com.',
          ),
          if (android) ...[
            const SizedBox(height: 14),
            SizedBox(
              height: 46,
              child: OutlinedButton.icon(
                onPressed: () => _abrirCadastro(context),
                icon: const Icon(Icons.open_in_new, size: 18),
                label: const Text('Criar conta grátis'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary, width: 1.5),
                  shape: const StadiumBorder(),
                  textStyle:
                      const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Caso extends StatelessWidget {
  const _Caso({required this.icone, required this.titulo, required this.texto});

  final IconData icone;
  final String titulo;
  final String texto;

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icone, color: AppColors.primary, size: 21),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  titulo,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  texto,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.4,
                    fontWeight: FontWeight.w500,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      );
}
