import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:nuvempark_core/nuvempark_core.dart';
import 'package:nuvempark_app/database/app_database.dart';

/// SecureStorage em memória (sem canal de plataforma) para testes.
class MemSecureStorage extends SecureStorage {
  final Map<String, String> _m = {};
  @override
  Future<String?> read(String key) async => _m[key];
  @override
  Future<void> write(String key, String value) async {
    _m[key] = value;
  }

  @override
  Future<void> delete(String key) async {
    _m.remove(key);
  }
}

typedef Responder = ResponseBody Function(RequestOptions options);

/// Adapter que responde localmente — sem rede — a partir de [responder].
class FakeAdapter implements HttpClientAdapter {
  FakeAdapter(this.responder);
  final Responder responder;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async =>
      responder(options);

  @override
  void close({bool force = false}) {}
}

ResponseBody jsonResponse(Object body, {int status = 200}) =>
    ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );

Dio fakeDio(Responder responder) {
  final dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
  dio.httpClientAdapter = FakeAdapter(responder);
  return dio;
}

/// Insere um ticket 'aberto' mínimo (todas as colunas NOT NULL).
Future<void> seedTicket(
  AppDatabase db, {
  required String id,
  required String patio,
}) {
  final now = DateTime.now().millisecondsSinceEpoch;
  return db.ticketsDao.inserir(
    TicketsCompanion.insert(
      id: id,
      operacaoId: patio, // o VALOR é o patio_id (nome de coluna preservado)
      placa: 'ABC1D23',
      tipoVeiculo: 'carro',
      entradaEpoch: now,
      operadorId: 'op1',
      criadoEm: now,
      atualizadoEm: now,
    ),
  );
}

/// Enfileira um item de outbox 'pendente' para um ticket.
Future<void> enqueueTicket(AppDatabase db, String ticketId) {
  return db.syncDao.enqueue(
    SyncLogCompanion.insert(
      entidade: 'ticket',
      entidadeId: ticketId,
      operacao: 'update',
      payload: '{}',
      criadoEm: DateTime.now().millisecondsSinceEpoch,
    ),
  );
}

/// Payload de bootstrap mínimo e válido. Inclui tickets_removidos só quando
/// [removidos] != null (para testar também o caso do backend antigo).
Map<String, dynamic> bootstrapPayload({List<String>? removidos}) => {
      'patio': {
        'id': 'p1',
        'nome': 'Pátio Teste',
        'codigo': 'PT01',
        'qtd_vagas': 50,
      },
      'config': <String, dynamic>{},
      'tarifas': <dynamic>[],
      'clientes': <dynamic>[],
      'assinatura_estado': 'ativa',
      'tickets_removidos': ?removidos,
    };
