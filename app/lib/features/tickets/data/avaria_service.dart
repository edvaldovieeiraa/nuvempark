import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../../core/config/env.dart';
import '../../../database/app_database.dart';

/// Registra avarias do veículo na entrada: sobe as fotos (best-effort) e
/// enfileira a avaria no sync_log para o painel. Sem tabela Drift própria —
/// o app não relê avarias localmente, só as envia.
class AvariaService {
  AvariaService({required this.db, required this.dio});

  final AppDatabase db;
  final Dio dio;

  /// Cria uma avaria: tenta subir as fotos agora (se online) e enfileira o
  /// registro com os paths que subiram. Fotos que falharem ficam de fora
  /// (best-effort — o registro textual sempre é enfileirado).
  Future<void> registrar({
    required String ticketId,
    required String patioId,
    required String placa,
    required String descricao,
    required String operadorId,
    required List<String> fotosPaths, // caminhos locais dos arquivos
  }) async {
    final id = const Uuid().v4();
    final agora = DateTime.now().millisecondsSinceEpoch;

    // Upload best-effort de cada foto → coleta os paths remotos que subiram.
    final remotos = <String>[];
    for (var i = 0; i < fotosPaths.length; i++) {
      final file = File(fotosPaths[i]);
      if (!await file.exists()) continue;
      try {
        final form = FormData.fromMap({
          'avaria_id': id,
          'patio_id': patioId,
          'indice': '$i',
          'foto': await MultipartFile.fromFile(file.path, filename: '$i.jpg'),
        });
        final resp = await dio.post<Map<String, dynamic>>(
          Env.fotoAvariaUrl,
          data: form,
        );
        final path = resp.data?['path'];
        if (path is String) remotos.add(path);
      } catch (_) {
        // Best-effort: foto que não subiu fica de fora do registro.
      }
    }

    final payload = jsonEncode({
      'id': id,
      'ticket_id': ticketId,
      'placa': placa,
      'descricao': descricao,
      'operador_id': operadorId,
      'fotos': remotos,
      'criado_em': agora,
    });

    await db.syncDao.enqueue(SyncLogCompanion(
      entidade: const Value('avaria'),
      entidadeId: Value(id),
      operacao: const Value('create'),
      payload: Value(payload),
      criadoEm: Value(agora),
    ));
  }
}
