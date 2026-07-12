import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';

/// Dispositivo autenticado mas sem pátio vinculado e com múltiplos pátios
/// possíveis. Mostra a lista para escolher.
class NaoVinculadoScreen extends ConsumerWidget {
  const NaoVinculadoScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    if (auth is! AuthDeviceNaoVinculado) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Escolha o pátio')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: auth.patios.length,
        separatorBuilder: (context, i) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final p = auth.patios[i];
          return Card(
            child: ListTile(
              title: Text(p.nome),
              subtitle: Text('${p.qtdVagas} vagas'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => ref
                  .read(authControllerProvider.notifier)
                  .selecionarPatio(auth.user, p.id),
            ),
          );
        },
      ),
    );
  }
}
