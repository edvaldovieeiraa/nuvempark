import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../../database/app_database.dart';

/// Registra avarias do veículo na entrada. Só Drift: devolve na hora e
/// funciona em modo avião — é o que o fluxo de entrada espera.
///
/// O registro vai para a outbox (`sync_log`) e as fotos para a fila de envio
/// (`fotos_envio`), na mesma transação. Quem sobe as fotos é o `FotoUploader`,
/// com retry gravado: antes elas subiam em memória (3 tentativas em ~45 s) e
/// se perdiam com o app fechado ou sem sinal — o texto da avaria chegava ao
/// painel, a prova não.
///
/// As duas filas não precisam de ordem: o backend salva a foto num caminho
/// determinístico (`avarias/<avaria_id>/<indice>.jpg`, ver rota /foto-avaria),
/// então o payload já leva os caminhos finais e as fotos vão atrás.
class AvariaService {
  AvariaService({required this.db});

  final AppDatabase db;

  /// Caminho no storage onde o backend grava a foto [indice] desta avaria.
  static String fotoPath(String avariaId, int indice) =>
      'avarias/$avariaId/$indice.jpg';

  /// Enfileira a avaria e as fotos dela. APENAS escrita local — zero rede.
  /// Devolve o id da avaria.
  Future<String> enfileirar({
    required String ticketId,
    required String patioId,
    required String placa,
    required String descricao,
    required String operadorId,
    required List<String> fotosPaths,
  }) async {
    final id = const Uuid().v4();
    final agora = DateTime.now().millisecondsSinceEpoch;

    final payload = jsonEncode({
      'id': id,
      'ticket_id': ticketId,
      'placa': placa,
      'descricao': descricao,
      'operador_id': operadorId,
      'fotos': [for (var i = 0; i < fotosPaths.length; i++) fotoPath(id, i)],
      'criado_em': agora,
    });

    // Tamanho de cada foto para o menu — medido antes da transação.
    final tamanhos = [for (final p in fotosPaths) await _tamanho(p)];

    await db.transaction(() async {
      await db.syncDao.enqueue(SyncLogCompanion(
        entidade: const Value('avaria'),
        entidadeId: Value(id),
        operacao: const Value('create'),
        payload: Value(payload),
        criadoEm: Value(agora),
      ));
      for (var i = 0; i < fotosPaths.length; i++) {
        await db.fotosEnvioDao.enfileirar(FotosEnvioCompanion.insert(
          id: 'avaria-$id-$i',
          tipo: 'avaria',
          operacaoId: patioId,
          ticketId: ticketId,
          avariaId: Value(id),
          indice: Value(i),
          caminhoLocal: fotosPaths[i],
          bytes: Value(tamanhos[i]),
          criadoEm: agora,
        ));
      }
    });

    return id;
  }

  static Future<int> _tamanho(String path) async {
    try {
      return await File(path).length();
    } catch (_) {
      return 0;
    }
  }
}
