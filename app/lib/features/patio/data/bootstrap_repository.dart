import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart';

import '../../../core/config/env.dart';
import '../../../database/app_database.dart';

/// Baixa a config do pátio (config + tarifas + clientes) e grava no Drift.
/// O endpoint NuvemPark recebe `patio_id`; internamente o Drift usa a coluna
/// `operacaoId` (nome mantido do leve-patio) para preservar as queries.
class BootstrapRepository {
  BootstrapRepository({required this.dio, required this.db});

  final Dio dio;
  final AppDatabase db;

  Future<void> sincronizar(String patioId) async {
    final resp = await dio.get<Map<String, dynamic>>(
      Env.bootstrapUrl,
      queryParameters: {'patio_id': patioId},
    );
    final data = resp.data!;
    final patioJson = data['patio'] as Map<String, dynamic>;
    final configJson = data['config'] as Map<String, dynamic>? ?? {};
    final tarifasJson = (data['tarifas'] as List?) ?? const [];
    final clientesJson = (data['clientes'] as List?) ?? const [];
    // Campo aditivo (Camada 2): backend antigo omite → lista vazia, sem erro.
    final removidosIds = <String>[
      for (final e in (data['tickets_removidos'] as List?) ?? const []) e as String,
    ];

    // ── OperacaoCache (config do pátio) ──────────────────────────────────────
    final configStr = jsonEncode({
      'tipos_veiculo': configJson['tipos_veiculo'],
      'formas_pagamento': configJson['formas_pagamento'],
      'motivos_isencao': configJson['motivos_isencao'],
      'motivos_cancelamento': configJson['motivos_cancelamento'],
      'ticket_cabecalho': configJson['ticket_cabecalho'],
      'ticket_rodape': configJson['ticket_rodape'],
    });

    await db.operacaoDao.upsertCache(OperacaoCacheCompanion(
      operacaoId: Value(patioJson['id'] as String),
      nome: Value(patioJson['nome'] as String),
      codigo: Value(patioJson['codigo'] as String? ?? ''),
      qtdVagas: Value((patioJson['qtd_vagas'] as num?)?.toInt() ?? 0),
      configJson: Value(configStr),
      sincronizadoEm: Value(DateTime.now().millisecondsSinceEpoch),
    ));

    // ── Tarifas ──────────────────────────────────────────────────────────────
    final tarifasComp = <TarifasCompanion>[];
    for (final raw in tarifasJson) {
      final m = raw as Map<String, dynamic>;
      final vigInicio = DateTime.parse(m['vigencia_inicio'] as String);
      final vigFim = m['vigencia_fim'] != null
          ? DateTime.parse(m['vigencia_fim'] as String)
          : null;
      tarifasComp.add(TarifasCompanion(
        id: Value(m['id'] as String),
        operacaoId: Value(patioId),
        nome: Value(m['nome'] as String? ?? 'Padrão'),
        tipoVeiculo: Value(m['tipo_veiculo'] as String),
        ordem: Value((m['ordem'] as num?)?.toInt() ?? 0),
        visivelOperador: Value((m['visivel_operador'] as bool?) ?? true),
        fracaoInicialMinutos: Value((m['fracao_inicial_minutos'] as num).toInt()),
        fracaoInicialValor: Value((m['fracao_inicial_valor'] as num).toDouble()),
        fracaoAdicionalMinutos: Value((m['fracao_adicional_minutos'] as num).toInt()),
        fracaoAdicionalValor: Value((m['fracao_adicional_valor'] as num).toDouble()),
        tetoDiaria: Value((m['teto_diaria'] as num).toDouble()),
        toleranciaMinutos: Value((m['tolerancia_minutos'] as num).toInt()),
        pernoiteValor: Value((m['pernoite_valor'] as num).toDouble()),
        pernoiteHoraInicio: Value((m['pernoite_hora_inicio'] as num).toInt()),
        pernoiteHoraFim: Value((m['pernoite_hora_fim'] as num).toInt()),
        vigenciaInicioEpoch: Value(vigInicio.millisecondsSinceEpoch),
        vigenciaFimEpoch: Value(vigFim?.millisecondsSinceEpoch),
      ));
    }
    await db.operacaoDao.replaceTarifas(patioId, tarifasComp);

    // ── Clientes + placas (livre passagem) ───────────────────────────────────
    final clientesComp = <PatioClientesCompanion>[];
    final placasComp = <PatioClientePlacasCompanion>[];
    for (final raw in clientesJson) {
      final m = raw as Map<String, dynamic>;
      final id = m['id'] as String;
      final plano = m['plano'] as Map<String, dynamic>?;
      final venc = m['vencimento'] as String?;
      clientesComp.add(PatioClientesCompanion(
        id: Value(id),
        operacaoId: Value(patioId),
        nome: Value(m['nome'] as String),
        planoId: Value(plano?['id'] as String?),
        planoNome: Value(plano?['nome'] as String?),
        planoTipo: Value(plano?['tipo'] as String?),
        planoValor: Value((plano?['valor'] as num?)?.toDouble()),
        vagas: Value((m['vagas'] as num?)?.toInt() ?? 1),
        vencimentoEpoch: Value(venc != null
            ? DateTime.parse('${venc}T00:00:00').millisecondsSinceEpoch
            : null),
        bloqueado: Value((m['bloqueado'] as bool?) ?? false),
      ));
      final veiculos = (m['veiculos'] as List?) ?? const [];
      for (final rawV in veiculos) {
        final vm = rawV as Map<String, dynamic>;
        placasComp.add(PatioClientePlacasCompanion(
          operacaoId: Value(patioId),
          placa: Value((vm['placa'] as String).toUpperCase()),
          clienteId: Value(id),
          descricao: Value(vm['descricao'] as String?),
        ));
      }
    }
    await db.clientesDao.replaceClientes(patioId, clientesComp, placasComp);

    // ── Convergência da Limpeza de Pátio (Camada 2) ──────────────────────────
    // Para cada ticket removido no painel: apaga o ticket local e limpa os itens
    // de outbox dele (foto pendente sai junto, por viver na linha do ticket).
    // As duas escritas de cada id na MESMA transação (padrão do projeto).
    if (removidosIds.isNotEmpty) {
      await db.transaction(() async {
        for (final id in removidosIds) {
          await db.ticketsDao.deletar(id);
          await db.syncDao.removerItensDoTicket(id);
        }
      });
    }
  }
}
