import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/sync/presentation/sync_info_provider.dart';
import '../config/env.dart';
import '../di/providers.dart';

/// Heartbeat: avisa o painel do gestor que este app está vivo.
///
/// POR QUE EXISTE: o sync engine só fala com o servidor quando há dado novo.
/// Num pátio parado (nenhuma entrada/saída por horas) nada sobe, e o gestor não
/// conseguia distinguir "app aberto e ocioso" de "app fechado / tablet mudo".
/// Este serviço bate um POST /heartbeat a cada [Env.heartbeatInterval] (60s),
/// que carimba `dispositivos.ultimo_acesso` — e o painel enxerga isso ao vivo.
///
/// É um mecanismo SEPARADO do sync de propósito: não compartilha fila, backoff,
/// nem idempotência com ele, e não toca em nenhum arquivo do sync engine. Se o
/// heartbeat falhar, nada no sync muda; se o sync falhar, o heartbeat segue.
///
/// Roda enquanto houver sessão (o [MainShell] só existe pós-login), INCLUSIVE
/// com o app fora da tela — ver didChangeAppLifecycleState.
///
/// FAIL-SILENT por contrato: rede caída, timeout ou 4xx são engolidos sem log
/// nem retry. O heartbeat é um sinal descartável — perder um tick só significa
/// que o painel mostra o carimbo anterior por mais um minuto.
class HeartbeatService with WidgetsBindingObserver {
  HeartbeatService(this._ref);

  final Ref _ref;
  Timer? _timer;
  bool _rodando = false;
  bool _emTick = false;

  /// Liga o heartbeat: bate uma vez agora e agenda o ciclo.
  void iniciar() {
    if (_rodando) return;
    _rodando = true;
    WidgetsBinding.instance.addObserver(this);
    _bater();
    _agendar();
  }

  /// Desliga (logout / dispose).
  void parar() {
    _rodando = false;
    _timer?.cancel();
    _timer = null;
    WidgetsBinding.instance.removeObserver(this);
  }

  void _agendar() {
    _timer?.cancel();
    _timer = Timer.periodic(Env.heartbeatInterval, (_) => _bater());
  }

  /// Força uma batida imediata (ex.: botão "Tentar novamente" da tela de
  /// bloqueio revalidando o gate). A resposta traz os headers X-Assinatura-*,
  /// que o interceptor aplica no provider — e o desbloqueio chega na hora.
  Future<void> baterAgora() => _bater();

  /// Um tick. Reentrância-safe: se o anterior ainda está no ar (rede lenta),
  /// este é descartado em vez de empilhar requisições.
  Future<void> _bater() async {
    if (_emTick || !_rodando) return;
    _emTick = true;
    try {
      // O patio_id só é necessário no PRIMEIRO heartbeat de um aparelho novo,
      // quando o servidor o cadastra (ver rota /heartbeat). Depois disso ele é
      // ignorado — mas mandar sempre é mais barato que rastrear "já registrei".
      final patioId = await _ref.read(tokenStorageProvider).readPatioId();

      // Os interceptors do Dio já injetam Bearer + X-Device-Id (e renovam o
      // token quando expira) — o serviço não conhece token nem device.
      final resp = await _ref.read(dioProvider).post<dynamic>(
            Env.heartbeatUrl,
            data: patioId == null ? null : {'patio_id': patioId},
            options: Options(
              sendTimeout: Env.heartbeatTimeout,
              receiveTimeout: Env.heartbeatTimeout,
            ),
          );

      // "Última sincronização" = último CONTATO com o servidor. O heartbeat bate
      // a cada 60s independente de haver dado a subir, então esse carimbo avança
      // sozinho num pátio parado — e é o MESMO instante (relógio do servidor) que
      // o painel lê de dispositivos.ultimo_acesso, então as duas telas batem.
      // Robusto com a API antiga: sem corpo (204) simplesmente não atualiza.
      final body = resp.data;
      if (body is Map) {
        final iso = body['sincronizado_em'];
        if (iso is String) {
          final quando = DateTime.tryParse(iso)?.toLocal();
          if (quando != null) {
            await _ref.read(tokenStorageProvider).saveUltimoSync(quando);
            _ref.invalidate(syncInfoProvider);
          }
        }
      }
    } catch (_) {
      // Fail-silent: ver doc da classe.
    } finally {
      _emTick = false;
    }
  }

  /// SEGUE BATENDO em background — é justamente aí que o gestor precisa saber
  /// se o tablet está vivo (pátio parado, tela apagada). Quem sustenta isso é
  /// o OperacaoService: sem o foreground service o Android congelaria o
  /// processo e este timer pararia sozinho, sem nada aqui pedir.
  ///
  /// No resume ainda batemos na hora: a rede pode ter mudado (wifi caiu e
  /// voltou), e o painel fica verde imediatamente em vez de esperar até 60s.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_rodando) return;
    if (state == AppLifecycleState.resumed) {
      _bater();
      _agendar();
    }
  }
}

/// Provider do heartbeat. Mantido vivo pela árvore (como o syncLoopProvider).
final heartbeatServiceProvider = Provider<HeartbeatService>((ref) {
  final servico = HeartbeatService(ref);
  ref.onDispose(servico.parar);
  return servico;
});
