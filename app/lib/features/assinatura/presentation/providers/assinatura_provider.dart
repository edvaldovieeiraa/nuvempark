import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../domain/assinatura_status.dart';

/// Estado vivo do gate de assinatura.
///
/// Fontes, em ordem de riqueza:
///  1. Corpo de /login (objeto completo) → [definir].
///  2. Headers X-Assinatura-* de TODA resposta autenticada → [aplicarHeaders]
///     (é o que faz o bloqueio chegar durante o sync/heartbeat, sem deslogar).
///  3. SecureStorage no splash → [restaurar] (fail-open offline: mantém o último
///     estado conhecido; nunca bloqueia só por falta de rede).
///
/// Toda atualização (1 e 2) persiste o último estado conhecido.
class AssinaturaController extends Notifier<AssinaturaStatus?> {
  @override
  AssinaturaStatus? build() => null;

  void definir(AssinaturaStatus status) {
    state = status;
    _persistir(status);
  }

  /// Atualização a partir dos headers (só estado + bloqueia chegam).
  void aplicarHeaders({required String estado, required bool bloqueia}) {
    final base = state ?? AssinaturaStatus.ativa;
    final novo = base.comHeaders(estado: estado, bloqueia: bloqueia);
    if (novo == state) return; // sem mudança → não repinta nem regrava
    state = novo;
    _persistir(novo);
  }

  /// Restaura o último estado conhecido do SecureStorage (chamado no splash,
  /// ANTES de a rota ser decidida). Se não há nada salvo, não mexe no state.
  Future<void> restaurar() async {
    final snap = await ref.read(tokenStorageProvider).readAssinatura();
    if (snap == null) return;
    state = AssinaturaStatus(
      estado: snap.estado,
      libera: !snap.bloqueia &&
          (snap.estado == 'ativa' || snap.estado == 'trial'),
      bloqueia: snap.bloqueia,
    );
  }

  /// Limpa o gate (logout). O snapshot é apagado no clearAll do TokenStorage.
  void limpar() => state = null;

  void _persistir(AssinaturaStatus s) {
    // best-effort; falha de storage não pode derrubar o fluxo.
    ref
        .read(tokenStorageProvider)
        .saveAssinatura(estado: s.estado, bloqueia: s.bloqueia)
        .catchError((_) {});
  }
}

final assinaturaControllerProvider =
    NotifierProvider<AssinaturaController, AssinaturaStatus?>(
  AssinaturaController.new,
);
