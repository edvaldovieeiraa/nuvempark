import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/env.dart';
import '../../../core/di/providers.dart';
import '../../patio/presentation/providers/patio_provider.dart';
import '../../tickets/presentation/providers/ticket_provider.dart';

/// Loop de sincronização contínua e bidirecional.
///
/// A cada tick ([Env.syncRapidoInterval] com o app aberto, [Env.syncInterval]
/// em segundo plano) faz:
///   • PUSH — drena a outbox local (entradas, saídas, caixa) pro servidor
///   • VEÍCULOS — lê os tickets abertos do pátio, inclusive os dos OUTROS
///     aparelhos, e redesenha a lista quando algo mudou
///   • PULL — no máximo a cada [Env.syncInterval], baixa os cadastros da
///     dashboard (tarifas, tipos, config, cupom)
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
  bool _primeiroPlano = true;
  DateTime? _ultimoBootstrap;

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
    _ultimoBootstrap = null;
    _timer?.cancel();
    _timer = null;
    WidgetsBinding.instance.removeObserver(this);
  }

  void _agendar() {
    _timer?.cancel();
    _timer = Timer.periodic(
      _primeiroPlano ? Env.syncRapidoInterval : Env.syncInterval,
      (_) => _tick(),
    );
  }

  /// Um ciclo. Reentrância-safe (não empilha se um tick demora).
  Future<void> _tick() async {
    if (_emTick || !_rodando) return;
    _emTick = true;
    try {
      // PUSH: sobe a fila local. Best-effort — offline não lança. Com a fila
      // vazia é só uma consulta ao Drift.
      await _ref.read(syncEngineProvider).drain();

      // VEÍCULOS: o que entrou ou saiu pelos outros aparelhos.
      final patioId = await _ref.read(tokenStorageProvider).readPatioId();
      if (patioId != null &&
          await _ref.read(ticketsAbertosSyncProvider).puxar(patioId)) {
        _ref.invalidate(ticketsAbertosProvider);
        _ref.invalidate(ticketsMovimentosProvider);
      }

      // PULL: cadastros da dashboard, silencioso (não pisca a tela). Mudam
      // pouco — não precisam do ritmo dos veículos.
      final agora = DateTime.now();
      final ultimo = _ultimoBootstrap;
      if (ultimo == null || agora.difference(ultimo) >= Env.syncInterval) {
        _ultimoBootstrap = agora;
        await _ref
            .read(patioNotifierProvider.notifier)
            .bootstrap(silencioso: true);
      }
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
  /// Fora da tela o ritmo cai para [Env.syncInterval]: ninguém está olhando a
  /// lista, e 5s com a tela apagada só gastaria bateria.
  ///
  /// No resume ainda sincronizamos na hora: é quando a rede costuma voltar.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_rodando) return;
    if (state == AppLifecycleState.resumed) {
      _primeiroPlano = true;
      _tick();
      _agendar();
    } else if (state == AppLifecycleState.paused && _primeiroPlano) {
      _primeiroPlano = false;
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
