import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:dio/dio.dart';

import '../../../core/config/env.dart';
import '../../../database/app_database.dart';
import 'sync_engine.dart';

/// O que fazer com uma foto cujo envio falhou.
enum FalhaFoto {
  /// Sem rede, timeout de conexão ou rodada cancelada: para a rodada, sem
  /// gastar tentativa — as próximas fotos falhariam igual.
  offline,

  /// O servidor recusou de vez (campos, acesso, tamanho): reenviar não muda
  /// nada, vira `falhou` na primeira.
  permanente,

  /// Qualquer outra coisa (auth expirada, limite, 5xx, timeout de envio,
  /// resposta estranha): espera crescente e nova tentativa.
  passageira,
}

/// Códigos HTTP de recusa definitiva nas rotas de foto. 403 entra aqui (ao
/// contrário da outbox): na foto ele é "sem acesso a este pátio", que não
/// muda reenviando; 413 é o limite de 6 MB do multipart.
const _httpPermanente = {400, 403, 404, 413, 422};

FalhaFoto classificarFalhaFoto(Object erro) {
  if (erro is! DioException) return FalhaFoto.passageira;
  switch (erro.type) {
    case DioExceptionType.connectionError:
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.cancel:
      return FalhaFoto.offline;
    default:
      final status = erro.response?.statusCode;
      return status != null && _httpPermanente.contains(status)
          ? FalhaFoto.permanente
          : FalhaFoto.passageira;
  }
}

/// Progresso da rodada em curso — alimenta a barra do menu.
class FotoProgresso {
  const FotoProgresso({
    required this.atual,
    required this.total,
    required this.bytesEnviados,
    required this.bytesTotal,
  });

  /// Foto em envio, contando de 1.
  final int atual;

  /// Fotos desta rodada (no máximo [Env.fotosPorRodada]).
  final int total;

  /// Bytes já enviados na rodada, somando as fotos anteriores.
  final int bytesEnviados;

  /// Soma do tamanho das fotos da rodada.
  final int bytesTotal;
}

enum _Resultado { ok, falhou, parar }

/// Resposta 200 que não é o JSON da API (ex.: página de desafio do proxy).
class _RespostaInvalida implements Exception {
  const _RespostaInvalida();
  @override
  String toString() => 'Resposta inesperada da rota de foto (sem ok:true)';
}

/// Sobe as fotos da fila `fotos_envio`, FORA da trava dos dados.
///
/// Antes, as fotos subiam dentro do `SyncEngine.drain()`: um lote grande
/// segurava a leitura dos veículos e as entradas novas, sem rede cada foto
/// ainda esperava o próprio timeout, e uma foto recusada voltava a cada tick
/// para sempre. Aqui (spec fila-fotos-sync):
/// - uma rodada por vez, até [Env.fotosPorRodada] fotos, mais antigas primeiro;
/// - sem rede (ou rodada cancelada) → para na hora, sem gastar tentativa;
/// - recusa definitiva → `falhou`; passageira → espera crescente da outbox e,
///   na [Env.syncMaxTentativas]ª, `falhou`;
/// - arquivo ausente → `falhou` com `sem_arquivo` (o reenvio não reabre);
/// - [rodada] NUNCA lança: roda com `unawaited` a cada tick.
class FotoUploader {
  FotoUploader({required this.db, required this.dio, DateTime Function()? agora})
      : _agora = agora ?? DateTime.now;

  final AppDatabase db;
  final Dio dio;
  final DateTime Function() _agora;

  bool _rodando = false;
  CancelToken? _cancel;
  final _progresso = StreamController<FotoProgresso?>.broadcast();

  /// Progresso da rodada em curso; `null` quando ela termina.
  Stream<FotoProgresso?> get progresso => _progresso.stream;

  /// Interrompe a rodada em curso (logout / loop parado). A foto em envio não
  /// gasta tentativa.
  void cancelar() => _cancel?.cancel('rodada cancelada');

  /// Fecha o canal de progresso (descarte do provider).
  void dispose() {
    cancelar();
    _progresso.close();
  }

  /// Uma rodada de envio. Devolve quantas fotos subiram.
  Future<int> rodada() async {
    if (_rodando) return 0;
    _rodando = true;
    final cancel = _cancel = CancelToken();
    var enviadas = 0;
    try {
      await _medirSemBytes();
      final fila = await db.fotosEnvioDao.devidas(
        agoraEpoch: _agora().millisecondsSinceEpoch,
        limite: Env.fotosPorRodada,
      );
      final bytesTotal = fila.fold<int>(0, (s, f) => s + f.bytes);
      var bytesAntes = 0;
      for (var i = 0; i < fila.length; i++) {
        if (cancel.isCancelled) break;
        final foto = fila[i];
        final base = bytesAntes;
        void emitir(int enviadosDaFoto) => _emitir(FotoProgresso(
              atual: i + 1,
              total: fila.length,
              bytesEnviados: base + math.min(enviadosDaFoto, foto.bytes),
              bytesTotal: bytesTotal,
            ));
        emitir(0);
        final r = await _enviar(foto, cancel, emitir);
        bytesAntes += foto.bytes;
        if (r == _Resultado.ok) enviadas++;
        if (r == _Resultado.parar) break;
      }
    } catch (_) {
      // Nunca lança: o próximo tick tenta de novo.
    } finally {
      _emitir(null);
      _cancel = null;
      _rodando = false;
    }
    return enviadas;
  }

  void _emitir(FotoProgresso? p) {
    if (!_progresso.isClosed) _progresso.add(p);
  }

  /// O backfill da migração deixa `bytes = 0`: mede TODAS as pendentes assim,
  /// não só as devidas, para o menu mostrar o MB certo logo após a atualização.
  Future<void> _medirSemBytes() async {
    for (final f in await db.fotosEnvioDao.semBytes()) {
      try {
        final n = await File(f.caminhoLocal).length();
        if (n > 0) await db.fotosEnvioDao.atualizarBytes(f.id, n);
      } catch (_) {
        // Arquivo ausente: o envio marca a falha.
      }
    }
  }

  Future<_Resultado> _enviar(
    FotoEnvio foto,
    CancelToken cancel,
    void Function(int enviados) emitir,
  ) async {
    if (!await File(foto.caminhoLocal).exists()) {
      await _semArquivo(foto);
      return _Resultado.falhou;
    }
    try {
      final entrada = foto.tipo == 'entrada';
      final form = FormData.fromMap({
        if (entrada) 'ticket_id': foto.ticketId,
        if (!entrada) 'avaria_id': foto.avariaId,
        'patio_id': foto.operacaoId,
        if (!entrada) 'indice': '${foto.indice ?? 0}',
        'foto': await MultipartFile.fromFile(
          foto.caminhoLocal,
          filename: entrada ? '${foto.ticketId}.jpg' : '${foto.indice ?? 0}.jpg',
        ),
      });
      final resp = await dio.post<dynamic>(
        entrada ? Env.fotoUrl : Env.fotoAvariaUrl,
        data: form,
        cancelToken: cancel,
        options: Options(sendTimeout: Env.fotoSendTimeout),
        onSendProgress: (enviados, _) => emitir(enviados),
      );
      final body = resp.data;
      if (body is! Map || body['ok'] != true) throw const _RespostaInvalida();

      await db.transaction(() async {
        await db.fotosEnvioDao
            .marcarEnviada(foto.id, agoraEpoch: _agora().millisecondsSinceEpoch);
        // Compatibilidade: a coluna do ticket continua refletindo o envio.
        if (entrada) await db.ticketsDao.marcarFotoEnviada(foto.ticketId);
      });
      return _Resultado.ok;
    } on FileSystemException {
      await _semArquivo(foto);
      return _Resultado.falhou;
    } catch (e) {
      return _registrarFalha(foto, e);
    }
  }

  Future<void> _semArquivo(FotoEnvio foto) => db.fotosEnvioDao.marcarFalhou(
        foto.id,
        erro: 'Arquivo não encontrado no aparelho',
        codigo: 'sem_arquivo',
      );

  Future<_Resultado> _registrarFalha(FotoEnvio foto, Object e) async {
    final tentativas = foto.tentativas + 1;
    switch (classificarFalhaFoto(e)) {
      case FalhaFoto.offline:
        return _Resultado.parar;
      case FalhaFoto.permanente:
        await db.fotosEnvioDao.marcarFalhou(foto.id,
            erro: _mensagem(e), codigo: 'http_permanente', tentativas: tentativas);
        return _Resultado.falhou;
      case FalhaFoto.passageira:
        if (tentativas >= Env.syncMaxTentativas) {
          await db.fotosEnvioDao.marcarFalhou(foto.id,
              erro: _mensagem(e), codigo: 'tentativas', tentativas: tentativas);
        } else {
          await db.fotosEnvioDao.agendarRetry(
            foto.id,
            tentativas: tentativas,
            proximaEpoch: SyncEngine.proximaTentativaMs(foto.tentativas),
            erro: _mensagem(e),
          );
        }
        return _Resultado.falhou;
    }
  }

  static String _mensagem(Object e) {
    if (e is DioException) {
      final s = e.response?.statusCode;
      return s != null ? 'HTTP $s' : (e.message ?? e.type.name);
    }
    return e.toString();
  }
}
