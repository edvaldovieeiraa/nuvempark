import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/config/env.dart';
import '../../../core/di/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../auth/presentation/providers/auth_provider.dart';
import '../../patio/presentation/providers/patio_provider.dart';

/// "Sobre o pátio e o app": fusão das antigas telas Sobre o pátio + Sobre o
/// aplicativo + bloco "Conexão" das Configurações (que deixou de existir).
/// Somente leitura — tudo vem do bootstrap (cache Drift), da sessão e do [Env];
/// nenhuma chamada nova de rede.
class SobreScreen extends ConsumerWidget {
  const SobreScreen({super.key});

  static final _dataHora = DateFormat('dd/MM/yyyy HH:mm');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final user = auth is AuthLoggedIn ? auth.user : null;
    final patio = ref.watch(patioNotifierProvider).value;
    final tenantCodigo = ref.watch(_tenantCodigoProvider).value;

    return Scaffold(
      appBar: AppBar(title: const Text('Sobre o pátio e o app')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Identidade do app ────────────────────────────────────────
          const SizedBox(height: 8),
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
                    style:
                        TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
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
          const SizedBox(height: 24),

          // ── Pátio ────────────────────────────────────────────────────
          _titulo('Pátio'),
          if (patio == null)
            _cartao([
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                child: Text(
                  'Sincronize a config do pátio para ver os dados aqui.',
                  style: TextStyle(
                      fontSize: 13, color: AppColors.onSurfaceVariant),
                ),
              ),
            ])
          else ...[
            _cartao([
              _linha('Nome', patio.nome),
              _linha('Código de acesso', patio.codigo),
              _linha('Vagas', '${patio.qtdVagas}'),
              _linha('Empresa (código)', tenantCodigo ?? '—'),
            ]),
            const SizedBox(height: 20),
            _titulo('Cadastros'),
            _cartao([
              _linha('Tipos de veículo', '${patio.tiposVeiculo.length}'),
              _linha('Tabelas de preço', '${patio.tarifas.length}'),
              _linha('Formas de pagamento', '${patio.formasPagamento.length}'),
              _linha('Config atualizada em',
                  _dataHora.format(patio.sincronizadoEm)),
            ]),
          ],
          const SizedBox(height: 20),

          // ── Operador (era o bloco "Conexão" das Configurações) ───────
          _titulo('Operador'),
          _cartao([
            _linha('Nome', user?.nome ?? '—'),
            _linha('Usuário', user?.usuario ?? '—'),
          ]),
          const SizedBox(height: 20),

          // ── Aplicativo ───────────────────────────────────────────────
          _titulo('Aplicativo'),
          _cartao([
            _linha('Versão', Env.appVersion),
            _linha('Build', Env.buildNumber),
            _linha('Revisão', Env.gitSha),
            _linha(
              'Servidor',
              Env.apiBaseUrl.replaceFirst(RegExp(r'^https?://'), ''),
            ),
          ]),
          const SizedBox(height: 16),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              'Os dados do pátio vêm do painel do gestor e chegam sozinhos na '
              'sincronização. O app funciona sem internet: entradas e saídas '
              'ficam guardadas no aparelho e sobem quando a rede voltar.',
              style:
                  TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant),
            ),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  Widget _titulo(String t) => Padding(
        padding: const EdgeInsets.only(left: 4, bottom: 8),
        child: Text(t.toUpperCase(),
            style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
                color: AppColors.onSurfaceVariant)),
      );

  Widget _cartao(List<Widget> linhas) => Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            for (var i = 0; i < linhas.length; i++) ...[
              if (i > 0) const Divider(height: 1, indent: 14, endIndent: 14),
              linhas[i],
            ],
          ],
        ),
      );

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

/// Código da empresa (tenant) guardado na sessão.
final _tenantCodigoProvider = FutureProvider<String?>(
  (ref) => ref.read(tokenStorageProvider).readTenantCodigo(),
);
