import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/providers.dart';

/// Estado da fila de sincronização (pendentes/falhos + último sync).
/// Morava em Configurações; hoje alimenta o item vivo "Sincronização" do Menu.
class SyncInfo {
  const SyncInfo({
    required this.pendentes,
    required this.falhos,
    required this.ultimoSync,
  });

  final int pendentes;
  final int falhos;
  final DateTime? ultimoSync;

  bool get emDia => pendentes == 0 && falhos == 0;
}

final syncInfoProvider = FutureProvider<SyncInfo>((ref) async {
  final db = ref.read(appDatabaseProvider);
  final storage = ref.read(tokenStorageProvider);
  final pendentes = await db.syncDao.countPendentes();
  final falhos = await db.syncDao.countFalhos();
  final iso = await storage.readUltimoSync();
  return SyncInfo(
    pendentes: pendentes,
    falhos: falhos,
    ultimoSync: iso != null ? DateTime.tryParse(iso) : null,
  );
});
