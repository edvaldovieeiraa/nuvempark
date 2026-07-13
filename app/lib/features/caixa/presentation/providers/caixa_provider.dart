import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../data/caixa_repository.dart';
import '../../domain/caixa_model.dart';

final caixaRepositoryProvider = Provider<CaixaRepository>(
  (ref) => CaixaRepository(db: ref.read(appDatabaseProvider)),
);

/// Sessão de caixa aberta do operador atual (null se nenhuma).
class CaixaSessaoNotifier extends AsyncNotifier<CaixaModel?> {
  @override
  Future<CaixaModel?> build() async {
    final storage = ref.read(tokenStorageProvider);
    final patioId = await storage.readPatioId();
    final user = await storage.readUser();
    if (patioId == null || user == null) return null;
    return ref.read(caixaRepositoryProvider).getSessaoAberta(patioId, user.id);
  }

  Future<void> abrir(double fundo) async {
    final storage = ref.read(tokenStorageProvider);
    final patioId = await storage.readPatioId();
    final user = await storage.readUser();
    if (patioId == null || user == null) return;
    final id = await ref.read(caixaRepositoryProvider).abrirCaixa(
          patioId: patioId,
          operadorId: user.id,
          operadorNome: user.nome,
          fundoCaixa: fundo,
        );
    state = AsyncData(await ref.read(caixaRepositoryProvider).getSessaoById(id));
    Future.microtask(() => ref.read(syncEngineProvider).drain());
  }

  /// Última sessão fechada do operador (base da reimpressão de fechamento).
  Future<CaixaModel?> ultimoFechamento() async {
    final storage = ref.read(tokenStorageProvider);
    final patioId = await storage.readPatioId();
    final user = await storage.readUser();
    if (patioId == null || user == null) return null;
    return ref
        .read(caixaRepositoryProvider)
        .getUltimaSessaoFechada(patioId, user.id);
  }

  Future<FechamentoResult?> fechar(double totalContado, {String? obs}) async {
    final atual = state.value;
    if (atual == null) return null;
    final res = await ref.read(caixaRepositoryProvider).fecharCaixa(
          caixaSessaoId: atual.id,
          totalContado: totalContado,
          observacao: obs,
        );
    state = const AsyncData(null);
    Future.microtask(() => ref.read(syncEngineProvider).drain());
    return res;
  }
}

final caixaSessaoNotifierProvider =
    AsyncNotifierProvider<CaixaSessaoNotifier, CaixaModel?>(
        CaixaSessaoNotifier.new);

/// Movimentos de uma sessão de caixa (somente leitura; imutáveis).
final caixaMovimentosProvider =
    FutureProvider.family<List<MovimentoModel>, String>((ref, sessaoId) {
  return ref.read(caixaRepositoryProvider).getMovimentos(sessaoId);
});
