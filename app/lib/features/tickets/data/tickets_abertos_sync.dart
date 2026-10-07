import 'package:dio/dio.dart';

import '../../../core/config/env.dart';
import '../../../database/app_database.dart';
import '../../sync/data/sync_mutex.dart';
import 'ticket_remoto.dart';

/// Veículos no pátio vistos por TODOS os aparelhos.
///
/// Sem isto cada celular só enxergava as próprias entradas: o carro que entrou
/// pelo aparelho do pátio não era encontrado pelo aparelho do caixa. Roda no
/// ciclo rápido do SyncLoop (segundos com o app aberto), por isso:
///   • manda o ETag da última lista e o servidor responde 304 sem corpo quando
///     nada mudou — o custo de rede do ciclo parado é só o cabeçalho;
///   • roda sob o [SyncMutex] do envio (ver lá o porquê).
///
/// Duas direções:
///   • aberto no servidor e ausente aqui → grava (entrou por outro aparelho)
///   • aberto aqui, já sincronizado, e fora da lista → apaga (saiu por outro
///     aparelho, ou foi cancelado no painel)
/// O que tem escrita ou foto pendente nunca é tocado.
class TicketsAbertosSync {
  TicketsAbertosSync({
    required this.db,
    required this.dio,
    required this.mutex,
  });

  final AppDatabase db;
  final Dio dio;
  final SyncMutex mutex;

  String? _etag;
  String? _etagPatio;

  /// Retorna true quando o Drift mudou (a tela precisa redesenhar). Falha de
  /// rede, 404 de API antiga e resposta estranha viram false sem mexer em nada.
  Future<bool> puxar(String patioId) => mutex.exclusivo(() async {
        // ETag de outro pátio não vale (troca de pátio no mesmo aparelho).
        final etag = _etagPatio == patioId ? _etag : null;
        final Response<dynamic> resp;
        try {
          resp = await dio.get<dynamic>(
            Env.ticketsAbertosUrl,
            queryParameters: {'patio_id': patioId},
            options: Options(
              headers: {'If-None-Match': ?etag},
              validateStatus: (s) => s == 200 || s == 304,
            ),
          );
        } catch (_) {
          return false;
        }
        if (resp.statusCode == 304) return false;

        final body = resp.data;
        // Lista ausente NÃO é lista vazia: vazia apagaria todos os abertos.
        if (body is! Map || body['tickets'] is! List) return false;
        final abertos = [
          for (final e in body['tickets'] as List)
            Map<String, dynamic>.from(e as Map),
        ];

        final mudou = await _convergir(patioId, abertos);
        _etag = resp.headers.value('etag');
        _etagPatio = patioId;
        return mudou;
      });

  Future<bool> _convergir(
    String patioId,
    List<Map<String, dynamic>> abertos,
  ) =>
      db.transaction(() async {
        final idsServidor = {for (final m in abertos) m['id'] as String};
        final conhecidos =
            await db.ticketsDao.idsExistentes(idsServidor.toList());
        var mudou = false;

        for (final m in abertos) {
          if (conhecidos.contains(m['id'])) continue;
          await db.ticketsDao
              .inserirSeAusente(ticketRemotoParaCompanion(m, patioId));
          mudou = true;
        }
        for (final t in await db.ticketsDao.getAbertosSincronizados(patioId)) {
          if (!idsServidor.contains(t.id)) {
            await db.ticketsDao.deletar(t.id);
            mudou = true;
          }
        }
        return mudou;
      });
}
