import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../../core/config/env.dart';
import '../../../database/app_database.dart';

/// Registra avarias do veículo na entrada. Duas etapas SEPARADAS de propósito:
///
/// - [enfileirar]: só Drift. Devolve na hora, funciona em modo avião. É a única
///   que o fluxo de entrada espera.
/// - [subirFotos]: só rede. Roda em background, com retry próprio, e nunca
///   lança — a entrada já foi confirmada pro operador muito antes.
///
/// As duas não precisam de ordem: o backend salva a foto num caminho
/// determinístico (`avarias/<avaria_id>/<indice>.jpg`, ver rota /foto-avaria),
/// então [enfileirar] já registra os caminhos finais e as fotos vão atrás.
///
/// Sem tabela Drift própria — o app não relê avarias localmente, só as envia.
class AvariaService {
  AvariaService({required this.db, required this.dio});

  final AppDatabase db;
  final Dio dio;

  /// Tentativas de upload por foto antes de desistir.
  static const int maxTentativasFoto = 3;
  static const Duration _esperaBase = Duration(seconds: 15);

  /// Caminho no storage onde o backend grava a foto [indice] desta avaria.
  static String fotoPath(String avariaId, int indice) =>
      'avarias/$avariaId/$indice.jpg';

  /// Enfileira a avaria no sync_log. APENAS escrita local — zero rede.
  /// Devolve o id da avaria (passe-o para [subirFotos]).
  Future<String> enfileirar({
    required String ticketId,
    required String placa,
    required String descricao,
    required String operadorId,
    required int totalFotos,
  }) async {
    final id = const Uuid().v4();
    final agora = DateTime.now().millisecondsSinceEpoch;

    final payload = jsonEncode({
      'id': id,
      'ticket_id': ticketId,
      'placa': placa,
      'descricao': descricao,
      'operador_id': operadorId,
      'fotos': [for (var i = 0; i < totalFotos; i++) fotoPath(id, i)],
      'criado_em': agora,
    });

    await db.syncDao.enqueue(SyncLogCompanion(
      entidade: const Value('avaria'),
      entidadeId: Value(id),
      operacao: const Value('create'),
      payload: Value(payload),
      criadoEm: Value(agora),
    ));

    return id;
  }

  /// Sobe as fotos da avaria (best-effort, com retry). Nunca lança: o chamador
  /// dispara e esquece. Foto que não subir deixa o registro sem a imagem no
  /// painel — o texto da avaria, esse, já subiu pela fila de sync.
  Future<void> subirFotos({
    required String avariaId,
    required String patioId,
    required List<String> fotosPaths,
  }) async {
    for (var i = 0; i < fotosPaths.length; i++) {
      await _subirFoto(
        avariaId: avariaId,
        patioId: patioId,
        indice: i,
        path: fotosPaths[i],
      );
    }
  }

  Future<void> _subirFoto({
    required String avariaId,
    required String patioId,
    required int indice,
    required String path,
  }) async {
    final file = File(path);
    if (!await file.exists()) return;

    for (var tentativa = 1; tentativa <= maxTentativasFoto; tentativa++) {
      try {
        // FormData é consumido no envio: reconstrói a cada tentativa.
        final form = FormData.fromMap({
          'avaria_id': avariaId,
          'patio_id': patioId,
          'indice': '$indice',
          'foto': await MultipartFile.fromFile(path, filename: '$indice.jpg'),
        });
        await dio.post<void>(Env.fotoAvariaUrl, data: form);
        return;
      } catch (_) {
        if (tentativa == maxTentativasFoto) return;
        await Future<void>.delayed(_esperaBase * tentativa);
      }
    }
  }
}
