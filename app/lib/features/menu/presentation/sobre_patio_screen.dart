import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:nuvempark_core/nuvempark_core.dart';

import '../../../core/di/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../patio/presentation/providers/patio_provider.dart';

/// Dados do pátio vinculado a este aparelho. Somente leitura — tudo já vem do
/// bootstrap (cache Drift) e da sessão; nenhuma chamada nova de rede.
class SobrePatioScreen extends ConsumerWidget {
  const SobrePatioScreen({super.key});

  static final _dataHora = DateFormat('dd/MM/yyyy HH:mm');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final patioAsync = ref.watch(patioNotifierProvider);
    final tenantAsync = ref.watch(_tenantCodigoProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Sobre o pátio')),
      body: patioAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => const ErrorState(
          mensagem: 'Não foi possível ler a config do pátio.',
        ),
        data: (patio) {
          if (patio == null) {
            return const ErrorState(
              mensagem: 'Sincronize a config do pátio para ver os dados.',
            );
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _cartao([
                _linha('Nome', patio.nome),
                _linha('Código de acesso', patio.codigo),
                _linha('Vagas', '${patio.qtdVagas}'),
                _linha('Empresa (código)', tenantAsync.value ?? '—'),
              ]),
              const SizedBox(height: 20),
              _titulo('Cadastros'),
              _cartao([
                _linha('Tipos de veículo', '${patio.tiposVeiculo.length}'),
                _linha('Tabelas de preço', '${patio.tarifas.length}'),
                _linha('Formas de pagamento', '${patio.formasPagamento.length}'),
              ]),
              const SizedBox(height: 20),
              _titulo('Sincronização'),
              _cartao([
                _linha('Config atualizada em',
                    _dataHora.format(patio.sincronizadoEm)),
              ]),
              const SizedBox(height: 12),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  'Estes dados vêm do painel e chegam sozinhos na sincronização. '
                  'Para mudar qualquer coisa aqui, use o painel do gestor.',
                  style: TextStyle(
                      fontSize: 12, color: AppColors.onSurfaceVariant),
                ),
              ),
            ],
          );
        },
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
