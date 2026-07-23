import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../domain/dispositivo_bloqueio.dart';

/// Estado vivo do gate de DISPOSITIVO (espelha o [AssinaturaController]).
///
/// Fontes:
///  1. 403 `dispositivo_nao_autorizado` de login/heartbeat/rota → [bloquear]
///     (via [DispositivoInterceptor] e do fluxo de login).
///  2. Heartbeat 200 (dispositivo autorizado) → [liberar] (auto-desbloqueio).
///  3. SecureStorage no splash → [restaurar] (matar/reabrir não fura o bloqueio).
///
/// Setar o bloqueio NÃO limpa sessão nem outbox — o guard só troca de tela.
class DispositivoController extends Notifier<DispositivoBloqueio?> {
  @override
  DispositivoBloqueio? build() => null;

  void bloquear({required String motivo, String? codigoPareamento}) {
    final novo =
        DispositivoBloqueio(motivo: motivo, codigoPareamento: codigoPareamento);
    if (novo == state) return; // sem mudança → não repinta nem regrava
    state = novo;
    ref
        .read(tokenStorageProvider)
        .saveDispositivoBloqueio(motivo: motivo, codigo: codigoPareamento)
        .catchError((_) {});
  }

  /// Libera o gate (dispositivo autorizado / desbloqueado). Idempotente.
  void liberar() {
    if (state == null) return;
    state = null;
    ref.read(tokenStorageProvider).clearDispositivoBloqueio().catchError((_) {});
  }

  /// Restaura o último bloqueio conhecido do SecureStorage (chamado no splash).
  Future<void> restaurar() async {
    final snap = await ref.read(tokenStorageProvider).readDispositivoBloqueio();
    if (snap == null) return;
    state = DispositivoBloqueio(motivo: snap.motivo, codigoPareamento: snap.codigo);
  }

  /// Limpa o gate no logout (o snapshot já sai no clearAll do TokenStorage).
  void limpar() => state = null;
}

final dispositivoControllerProvider =
    NotifierProvider<DispositivoController, DispositivoBloqueio?>(
  DispositivoController.new,
);
