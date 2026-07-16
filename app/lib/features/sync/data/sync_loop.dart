import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/env.dart';
import '../../../core/di/providers.dart';
import '../../patio/presentation/providers/patio_provider.dart';

/// Loop de sincronização contínua e bidirecional.
///
/// A cada [Env.syncInterval] (30s) faz:
///   • PUSH — drena a outbox local (entradas, saídas, caixa) pro servidor
///   • PULL — baixa os cadastros da dashboard (tarifas, tipos, config, cupom)
///
/// O operador não precisa clicar em nada: o que muda na dashboard aparece
/// sozinho, e o que ele registra sobe sozinho — inclusive com o app fora da
/// tela (ver didChangeAppLifecycleState e OperacaoService).
///
/// Este é o AGENDADOR. A mecânica de sync (outbox, estratégias, backoff,
/// idempotência) mora no SyncEngine e não é da conta deste arquivo.
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

  /// SEGUE SINCRONIZANDO em background: a fila local precisa subir mesmo com o
  /// tablet de tela apagada, senão uma entrada registrada no fim do expediente
  /// só apareceria no painel no dia seguinte. Quem sustenta o timer fora da
  /// tela é o OperacaoService (foreground service) — sem ele o Android 12+
  /// congela o processo e este timer para sozinho.
  ///
  /// No resume ainda sincronizamos na hora: é quando a rede costuma voltar.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_rodando) return;
    if (state == AppLifecycleState.resumed) {
      _tick();
      _agendar();
    }
  }
}

/// Provider do loop. Mantido vivo pela árvore (keepAlive implícito via read).
final syncLoopProvider = Provider<SyncLoop>((ref) {
  final loop = SyncLoop(ref);
  ref.onDispose(loop.parar);
  return loop;
});
