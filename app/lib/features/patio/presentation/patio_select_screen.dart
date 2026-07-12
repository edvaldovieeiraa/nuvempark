import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/providers/auth_provider.dart';

/// Seleção de pátio quando o operador tem acesso a vários (rede).
class PatioSelectScreen extends ConsumerWidget {
  const PatioSelectScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    if (auth is! AuthNeedPatio) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Selecione o pátio')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: auth.patios.length,
        separatorBuilder: (context, i) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final p = auth.patios[i];
          return Card(
            child: ListTile(
              leading: const Icon(Icons.local_parking),
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
