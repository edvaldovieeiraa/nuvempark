import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:dio/dio.dart';

import '../../../core/config/env.dart';
import '../../../database/app_database.dart';
import '../../../features/auth/data/token_storage.dart';
import 'sync_result.dart';

/// Resultado do envio de um item da fila.
enum _Envio { ok, retry, offline }

class SyncEngine {
  SyncEngine({
    required this.db,
    required this.dio,
    required this.storage,
  });

  final AppDatabase db;
  final Dio dio;
  final TokenStorage storage;

  /// Drena todas as entradas devidas do SyncLog. Garantias: nunca descarta um
  /// item sem confirmação explícita do servidor. Após [Env.syncMaxTentativas]
  /// falhas o item vai para 'falhou' em vez de ser deletado.
  Future<SyncResult> drain() async {
    final agora = DateTime.now().millisecondsSinceEpoch;
    final pendentes = await db.syncDao.getPendentes(agora);

    // NuvemPark: o envelope carrega tenant_id + patio_id (antes só operacao_id).
    final tenantId = await storage.readTenantId() ?? '';
    final patioId = await storage.readPatioId() ?? '';
    int synced = 0;
    int failed = 0;
    // Carimbo do SERVIDOR do último item aceito (vem na resposta do /sync).
    DateTime? ultimoServidor;

    for (final item in pendentes) {
      final r = await _enviarItem(item, tenantId: tenantId, patioId: patioId);
      if (r == _Envio.ok) {
        synced++;
        ultimoServidor = _ultimoCarimboServidor ?? ultimoServidor;
      } else {
        failed++;
        // Rede fora: os itens seguintes falhariam igual, cada um esperando o
        // connect timeout (20s). Interrompe a drenagem — os pendentes ficam
        // intactos (sem queimar tentativa) para a próxima run.
        if (r == _Envio.offline) break;
      }
    }

    // Fotos de entrada são best-effort: rodam mesmo com a fila principal vazia
    // e nunca marcam a sync como falha — reintentam na próxima drenagem.
    await _enviarFotosPendentes(patioId);

    // Carimbo de "sincronizado com a nuvem": só quando o servidor confirmou ao
    // menos um item nesta drenagem.
    //
    // Guarda a hora do SERVIDOR (devolvida no /sync), não a do celular. Antes
    // era `DateTime.now()`, e aí o app mostrava a hora do aparelho enquanto o
    // painel mostrava a do servidor — os dois divergiam, e com relógio errado
    // no celular nenhum dos dois era confiável.
    //
    // Fallback no relógio local só se o servidor não mandar o campo (API antiga).
    if (synced > 0) {
      await storage.saveUltimoSync(ultimoServidor ?? DateTime.now());
    }

    return SyncResult(synced: synced, failed: failed);
  }

  /// Carimbo do servidor da última resposta OK — preenchido por [_enviarItem] e
  /// lido logo em seguida pelo [drain]. Contido no engine de propósito: não
  /// muda envelope, payload nem estratégia de retry.
  DateTime? _ultimoCarimboServidor;

  /// Sobe as fotos de entrada de tickets já sincronizados ainda não enviadas.
  /// Falha silenciosa por item (fica pendente p/ próxima run).
  Future<void> _enviarFotosPendentes(String patioId) async {
    final pendentes = await db.ticketsDao.getFotosPendentes();
    for (final ticket in pendentes) {
      final path = ticket.fotoEntradaPath;
      if (path == null) continue;

      final file = File(path);
      // Arquivo sumiu: marca como enviada para não reintentar em loop.
      if (!await file.exists()) {
        await db.ticketsDao.marcarFotoEnviada(ticket.id);
        continue;
      }

      try {
        final form = FormData.fromMap({
          'ticket_id': ticket.id,
          'patio_id': patioId,
          'foto': await MultipartFile.fromFile(
            path,
            filename: '${ticket.id}.jpg',
          ),
        });
        await dio.post<void>(Env.fotoUrl, data: form);
        await db.ticketsDao.marcarFotoEnviada(ticket.id);
      } catch (_) {
        // Best-effort: mantém pendente para a próxima drenagem.
      }
    }
  }

  Future<_Envio> _enviarItem(
    SyncLogData item, {
    required String tenantId,
    required String patioId,
  }) async {
    try {
      final payload = jsonDecode(item.payload) as Map<String, dynamic>;

      final resp = await dio.post<dynamic>(
        Env.syncUrl,
        data: {
          'app_id': Env.appId,
          'tenant_id': tenantId,
          'patio_id': patioId,
          'entidade': item.entidade,
          'entidade_id': item.entidadeId,
          'operacao': item.operacao,
          'payload': payload,
        },
      );

      final body = resp.data;

      // BLINDAGEM: só é sucesso se a resposta for o JSON esperado da API
      // (`{ok:true, ...}`). Um proxy no meio (Cloudflare) pode devolver 200 com
      // uma PÁGINA HTML de desafio — e aí `body` chega como String, não Map.
      // Tratar isso como sucesso marcaria o item 'sincronizado' e o APAGARIA da
      // fila sem a API ter recebido nada: perda silenciosa de dado, justamente
      // no caminho mais crítico do app. Sem `ok:true`, é retry — o item fica na
      // fila e sobe de novo no próximo tick (com backoff).
      if (body is! Map || body['ok'] != true) {
        await _registrarFalha(
          item,
          'Resposta inesperada do /sync (sem ok:true) — possível desafio de proxy',
        );
        return _Envio.retry;
      }

      // Camada 2: o servidor pode responder 200 sinalizando que ignorou o update
      // porque o ticket foi removido no painel (Limpeza de Pátio). Isso é SUCESSO
      // do item — nunca retry — e dispara a convergência local do ticket.
      final ignoradoRemovido = item.entidade == 'ticket' &&
          body['ignorado'] == true &&
          body['motivo'] == 'removido';

      // Hora do servidor: é ela que o painel exibe. Guardar a nossa faria as
      // duas telas mostrarem números diferentes para o mesmo evento.
      final iso = body['sincronizado_em'];
      if (iso is String) {
        _ultimoCarimboServidor = DateTime.tryParse(iso)?.toLocal();
      }

      // Marca o sync_log e a flag da entidade na MESMA transação: sem isto, se
      // o app morre entre as duas escritas, o sync_log fica 'sincronizado' mas
      // o ticket permanece 'pendente' para sempre (e nunca sobe a foto).
      await db.transaction(() async {
        await db.syncDao.marcarSucesso(item.id);
        await _marcarEntidadeSincronizada(item.entidade, item.entidadeId);
        if (ignoradoRemovido) {
          // Converge: apaga o ticket local e limpa a outbox remanescente dele
          // (a foto pendente sai junto, por viver na linha do ticket).
          await db.ticketsDao.deletar(item.entidadeId);
          await db.syncDao.removerItensDoTicket(item.entidadeId);
        }
      });
      return _Envio.ok;
    } on DioException catch (e) {
      // Rede fora: não marca falha nem queima tentativa — item continua
      // pendente e a drenagem para (fail-fast).
      if (_isOffline(e)) return _Envio.offline;

      // Só códigos HTTP definitivos viram 'falhou' na hora. 401/408/425/429 e
      // 5xx são transitórios → retry com backoff (não travam a fila inteira).
      await _registrarFalha(
        item,
        _dioErrorMessage(e),
        immediate: isPermanenteHttp(e.response?.statusCode),
      );
      return _Envio.retry;
    } catch (e) {
      await _registrarFalha(item, e.toString());
      return _Envio.retry;
    }
  }

  static bool _isOffline(DioException e) =>
      e.type == DioExceptionType.connectionError ||
      e.type == DioExceptionType.connectionTimeout;

  /// Erros HTTP que NÃO adianta reenviar. Exposto para teste. 401/408/425/429
  /// ficam de fora de propósito: são transitórios e devem seguir o retry.
  static bool isPermanenteHttp(int? status) =>
      status == 400 ||
      status == 404 ||
      status == 409 ||
      status == 410 ||
      status == 422;

  Future<void> _registrarFalha(
    SyncLogData item,
    String msg, {
    bool immediate = false,
  }) async {
    final maxReached = item.tentativas >= Env.syncMaxTentativas;

    if (maxReached || immediate) {
      await db.syncDao.marcarFalhou(item.id, msg);
    } else {
      await db.syncDao.marcarErro(
        item.id,
        _proximaTentativa(item.tentativas),
        msg,
      );
    }
  }

  Future<void> _marcarEntidadeSincronizada(
    String entidade,
    String entidadeId,
  ) async {
    switch (entidade) {
      case 'ticket':
        await db.ticketsDao.marcarSincronizado(entidadeId);
      case 'caixa_sessao':
        await db.caixaDao.marcarSessaoSincronizada(entidadeId);
      case 'caixa_movimento':
        await db.caixaDao.marcarMovimentoSincronizado(entidadeId);
      case 'mensalidade_pagamento':
        await db.mensalidadePagamentosDao.marcarSincronizado(entidadeId);
    }
  }

  /// Exposto para teste. Retorna o epoch-ms da próxima tentativa para [tentativas].
  static int proximaTentativaMs(int tentativas) {
    // Cap no expoente para 2^(exp+1) nunca estourar int64 (2^7 = 128 > 60).
    final safeExp = tentativas.clamp(0, 7);
    final minutos = math.min(math.pow(2, safeExp + 1).toInt(), 60);
    return DateTime.now()
        .add(Duration(minutes: minutos))
        .millisecondsSinceEpoch;
  }

  static int _proximaTentativa(int tentativas) => proximaTentativaMs(tentativas);

  static String _dioErrorMessage(DioException e) {
    if (e.response != null) return 'HTTP ${e.response!.statusCode}';
    return e.message ?? e.type.name;
  }
}
