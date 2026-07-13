import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/env.dart';
import '../../../core/di/providers.dart';
import '../../patio/presentation/providers/patio_provider.dart';

/// Loop de sincronização contínua e bidirecional.
///
/// Enquanto o app está em PRIMEIRO PLANO, a cada [Env.syncInterval] (30s) faz:
///   • PUSH — drena a outbox local (entradas, saídas, caixa) pro servidor
///   • PULL — baixa os cadastros da dashboard (tarifas, tipos, config, cupom)
///
/// O operador não precisa clicar em nada: o que muda na dashboard aparece
/// sozinho, e o que ele registra sobe sozinho. Em SEGUNDO PLANO o loop pausa
/// (economiza bateria/dados); ao voltar, sincroniza na hora e retoma o ciclo.
///
/// É resiliente a offline: cada tick é best-effort — se a rede cai, o cache
/// atual continua servindo e o próximo tick tenta de novo (sem travar a UI).
class SyncLoop with WidgetsBindingObserver {
  SyncLoop(this._ref);

  final Ref _ref;
  Timer? _timer;
  bool _rodando = false;
  bool _emTick = false;

  /// Liga o loop: sincroniza uma vez agora e agenda o ciclo.
  void iniciar() {
    if (_rodando) return;
    _rodando = true;
    WidgetsBinding.instance.addObserver(this);
    _tick(); // primeira sincronização imediata
    _agendar();
  }

  /// Desliga o loop (logout / dispose).
  void parar() {
    _rodando = false;
    _timer?.cancel();
    _timer = null;
    WidgetsBinding.instance.removeObserver(this);
  }

  void _agendar() {
    _timer?.cancel();
    _timer = Timer.periodic(Env.syncInterval, (_) => _tick());
  }

  /// Um ciclo: push + pull. Reentrância-safe (não empilha se um tick demora).
  Future<void> _tick() async {
    if (_emTick || !_rodando) return;
    _emTick = true;
    try {
      // PUSH: sobe a fila local. Best-effort — offline não lança.
      await _ref.read(syncEngineProvider).drain();
      // PULL: baixa os cadastros da dashboard, silencioso (não pisca a tela).
      await _ref
          .read(patioNotifierProvider.notifier)
          .bootstrap(silencioso: true);
    } catch (_) {
      // Nunca deixa um erro derrubar o loop; o próximo tick tenta de novo.
    } finally {
      _emTick = false;
    }
  }

  /// Pausa em background, retoma (com sync imediato) em foreground.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_rodando) return;
    if (state == AppLifecycleState.resumed) {
      _tick(); // sincroniza na hora que voltou
      _agendar();
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      _timer?.cancel();
      _timer = null;
    }
  }
}

/// Provider do loop. Mantido vivo pela árvore (keepAlive implícito via read).
final syncLoopProvider = Provider<SyncLoop>((ref) {
  final loop = SyncLoop(ref);
  ref.onDispose(loop.parar);
  return loop;
});
