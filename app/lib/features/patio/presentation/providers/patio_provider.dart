import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/providers.dart';
import '../../../../database/app_database.dart';
import '../../domain/patio_model.dart';
import '../../domain/tarifa_config.dart';
import '../../data/bootstrap_repository.dart';

// ── BootstrapRepository provider ─────────────────────────────────────────────
final bootstrapRepositoryProvider = Provider<BootstrapRepository>(
  (ref) => BootstrapRepository(
    dio: ref.read(dioProvider),
    db: ref.read(appDatabaseProvider),
  ),
);

/// Estado do pátio atual: lê cache offline e dispara bootstrap online.
class PatioNotifier extends AsyncNotifier<PatioModel?> {
  bool _bootstrapping = false;

  @override
  Future<PatioModel?> build() async {
    final patioId = await ref.read(tokenStorageProvider).readPatioId();
    if (patioId == null) return null;
    return _lerCache(patioId);
  }

  Future<PatioModel?> _lerCache(String patioId) async {
    final db = ref.read(appDatabaseProvider);
    final cache = await db.operacaoDao.getCacheByOperacaoId(patioId);
    if (cache == null) return null;

    final tarifasRows = await db.operacaoDao.getTarifasByOperacaoId(patioId);
    final config = jsonDecode(cache.configJson) as Map<String, dynamic>;

    List<String> lista(String k) =>
        List<String>.from((config[k] as List?) ?? const []);

    final tarifas = tarifasRows.map(_toTarifaConfig).toList();

    return PatioModel(
      id: cache.operacaoId,
      nome: cache.nome,
      codigo: cache.codigo,
      qtdVagas: cache.qtdVagas,
      tiposVeiculo: lista('tipos_veiculo'),
      formasPagamento: lista('formas_pagamento'),
      motivosIsencao: lista('motivos_isencao'),
      motivosCancelamento: lista('motivos_cancelamento'),
      ticketCabecalho: lista('ticket_cabecalho'),
      ticketRodape: lista('ticket_rodape'),
      tarifas: tarifas,
      sincronizadoEm:
          DateTime.fromMillisecondsSinceEpoch(cache.sincronizadoEm),
      fotoReciboModo: (config['foto_recibo_modo'] as String?) ?? 'desativada',
    );
  }

  TarifaConfig _toTarifaConfig(Tarifa t) => TarifaConfig(
        id: t.id,
        operacaoId: t.operacaoId,
        nome: t.nome,
        tipoVeiculo: t.tipoVeiculo,
        ordem: t.ordem,
        visivelOperador: t.visivelOperador,
        fracaoInicialMinutos: t.fracaoInicialMinutos,
        fracaoInicialValor: t.fracaoInicialValor,
        fracaoAdicionalMinutos: t.fracaoAdicionalMinutos,
        fracaoAdicionalValor: t.fracaoAdicionalValor,
        tetoDiaria: t.tetoDiaria,
        toleranciaMinutos: t.toleranciaMinutos,
        pernoiteValor: t.pernoiteValor,
        pernoiteHoraInicio: t.pernoiteHoraInicio,
        pernoiteHoraFim: t.pernoiteHoraFim,
        vigenciaInicio:
            DateTime.fromMillisecondsSinceEpoch(t.vigenciaInicioEpoch),
        vigenciaFim: t.vigenciaFimEpoch != null
            ? DateTime.fromMillisecondsSinceEpoch(t.vigenciaFimEpoch!)
            : null,
      );

  /// Baixa a config atualizada do servidor e recarrega o cache.
  /// Mantém o cache anterior se o bootstrap falhar (offline-first).
  /// [silencioso] = não mostra AsyncLoading (usado pelo loop de sync contínuo,
  /// pra não piscar "carregando" na tela a cada 30s).
  Future<void> bootstrap({bool silencioso = false}) async {
    if (_bootstrapping) return;
    _bootstrapping = true;
    final patioId = await ref.read(tokenStorageProvider).readPatioId();
    if (patioId == null) {
      _bootstrapping = false;
      return;
    }
    final anterior = state.value;
    if (!silencioso) state = const AsyncLoading<PatioModel?>();
    try {
      await ref.read(bootstrapRepositoryProvider).sincronizar(patioId);
      state = AsyncData(await _lerCache(patioId));
    } catch (e, st) {
      // Mantém o cache anterior; só erro se nem o cache existir.
      final cache = await _lerCache(patioId) ?? anterior;
      if (cache != null) {
        state = AsyncData(cache);
      } else if (!silencioso) {
        // No modo silencioso, falha de rede não vira tela de erro — o loop
        // tenta de novo em 30s e o cache atual continua servindo.
        state = AsyncError(e, st);
      }
    } finally {
      _bootstrapping = false;
    }
  }
}

final patioNotifierProvider =
    AsyncNotifierProvider<PatioNotifier, PatioModel?>(PatioNotifier.new);
