import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/core/config/env.dart';
import 'package:nuvempark_app/database/app_database.dart';
import 'package:nuvempark_app/features/sync/data/foto_uploader.dart';

import '../../support/fakes.dart' show jsonResponse;

/// Adapter que LÊ o corpo enviado — é a leitura que dispara o
/// `onSendProgress` do Dio — e guarda cada requisição.
class _Adapter implements HttpClientAdapter {
  _Adapter(this.responder);
  final FutureOr<ResponseBody> Function(RequestOptions o) responder;
  final pedidos = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? corpo,
      Future<void>? cancelFuture) async {
    pedidos.add(o);
    if (corpo != null) await corpo.drain<void>();
    return responder(o);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _ok() => jsonResponse({'ok': true, 'path': 'x'});

DioException _semRede(RequestOptions o) =>
    DioException.connectionError(requestOptions: o, reason: 'offline');

Map<String, String> _campos(RequestOptions o) =>
    {for (final e in (o.data as FormData).fields) e.key: e.value};

void main() {
  late AppDatabase db;
  late Directory tmp;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    tmp = Directory.systemTemp.createTempSync('uploader_');
  });
  tearDown(() async {
    await db.close();
    tmp.deleteSync(recursive: true);
  });

  ({FotoUploader uploader, _Adapter adapter}) montar(
      FutureOr<ResponseBody> Function(RequestOptions o) responder) {
    final adapter = _Adapter(responder);
    final dio = Dio(BaseOptions(baseUrl: 'http://test.local'))
      ..httpClientAdapter = adapter;
    return (uploader: FotoUploader(db: db, dio: dio), adapter: adapter);
  }

  String arquivo(String nome, {int bytes = 1000}) {
    final f = File('${tmp.path}/$nome.jpg')
      ..writeAsBytesSync(List.filled(bytes, 9));
    return f.path;
  }

  Future<void> ticket(String id, {String sync = 'sincronizado'}) =>
      db.ticketsDao.inserir(TicketsCompanion.insert(
        id: id,
        operacaoId: 'p1',
        placa: 'ABC1D23',
        tipoVeiculo: 'carro',
        entradaEpoch: 1,
        operadorId: 'op1',
        criadoEm: 1,
        atualizadoEm: 1,
        syncStatus: Value(sync),
        fotoEntradaPath: const Value('/x.jpg'),
      ));

  Future<void> fotoEntrada(String ticketId,
          {String? caminho, int bytes = 1000, int criado = 1, int tentativas = 0}) =>
      db.fotosEnvioDao.enfileirar(FotosEnvioCompanion.insert(
        id: 'entrada-$ticketId',
        tipo: 'entrada',
        operacaoId: 'p1',
        ticketId: ticketId,
        caminhoLocal: caminho ?? arquivo(ticketId, bytes: bytes),
        bytes: Value(bytes),
        criadoEm: criado,
        tentativas: Value(tentativas),
      ));

  Future<void> fotoAvaria(String avariaId, int indice, {int criado = 1}) =>
      db.fotosEnvioDao.enfileirar(FotosEnvioCompanion.insert(
        id: 'avaria-$avariaId-$indice',
        tipo: 'avaria',
        operacaoId: 'p1',
        ticketId: 'T',
        avariaId: Value(avariaId),
        indice: Value(indice),
        caminhoLocal: arquivo('$avariaId-$indice'),
        bytes: const Value(1000),
        criadoEm: criado,
      ));

  Future<FotoEnvio> ler(String id) =>
      (db.select(db.fotosEnvio)..where((f) => f.id.equals(id))).getSingle();

  test('entrada: sobe para /foto com ticket e pátio; marca a fila e o ticket',
      () async {
    await ticket('T1');
    await fotoEntrada('T1');
    final m = montar((_) => _ok());

    expect(await m.uploader.rodada(), 1);

    final pedido = m.adapter.pedidos.single;
    expect(pedido.path, endsWith('/foto'));
    expect(_campos(pedido), {'ticket_id': 'T1', 'patio_id': 'p1'});
    expect((pedido.data as FormData).files.single.value.filename, 'T1.jpg');
    expect(pedido.sendTimeout, Env.fotoSendTimeout);
    final f = await ler('entrada-T1');
    expect(f.status, 'enviada');
    expect(f.enviadoEmEpoch, isNotNull);
    expect((await db.ticketsDao.getById('T1'))!.fotoEntradaEnviada, isTrue);
  });

  test('avaria: sobe para /foto-avaria com avaria_id e índice', () async {
    await fotoAvaria('A1', 1);
    final m = montar((_) => _ok());

    await m.uploader.rodada();

    final pedido = m.adapter.pedidos.single;
    expect(pedido.path, endsWith('/foto-avaria'));
    expect(_campos(pedido), {'avaria_id': 'A1', 'patio_id': 'p1', 'indice': '1'});
    expect((pedido.data as FormData).files.single.value.filename, '1.jpg');
    expect((await ler('avaria-A1-1')).status, 'enviada');
  });

  test('sem rede: para a rodada na primeira foto, sem gastar tentativa',
      () async {
    await fotoAvaria('A', 0, criado: 1);
    await fotoAvaria('A', 1, criado: 2);
    final m = montar((o) => throw _semRede(o));

    expect(await m.uploader.rodada(), 0);

    expect(m.adapter.pedidos, hasLength(1), reason: 'não insiste nas outras');
    for (final id in ['avaria-A-0', 'avaria-A-1']) {
      final f = await ler(id);
      expect((f.status, f.tentativas), ('pendente', 0));
    }
  });

  test('recusa definitiva (413): falhou na primeira; a rodada segue', () async {
    await fotoAvaria('A', 0, criado: 1);
    await fotoAvaria('A', 1, criado: 2);
    final m = montar((o) => _campos(o)['indice'] == '0'
        ? jsonResponse({'error': 'grande demais'}, status: 413)
        : _ok());

    expect(await m.uploader.rodada(), 1);

    final f = await ler('avaria-A-0');
    expect((f.status, f.erroCodigo, f.tentativas), ('falhou', 'http_permanente', 1));
    expect(f.erro, contains('413'));
    expect((await ler('avaria-A-1')).status, 'enviada');
  });

  test('falha passageira (500): espera crescente; na 10ª tentativa, falhou',
      () async {
    await ticket('T1');
    await fotoEntrada('T1');
    final m = montar((_) => jsonResponse({'error': 'x'}, status: 500));
    final antes = DateTime.now().millisecondsSinceEpoch;

    await m.uploader.rodada();
    var f = await ler('entrada-T1');
    expect((f.status, f.tentativas), ('pendente', 1));
    expect(f.proximaTentativaEpoch, greaterThan(antes));

    // Já na 9ª: a próxima falha é a 10ª e fecha a conta.
    await (db.update(db.fotosEnvio)..where((x) => x.id.equals('entrada-T1')))
        .write(const FotosEnvioCompanion(
            tentativas: Value(9), proximaTentativaEpoch: Value(0)));
    await m.uploader.rodada();
    f = await ler('entrada-T1');
    expect((f.status, f.erroCodigo, f.tentativas), ('falhou', 'tentativas', 10));
  });

  test('resposta sem ok:true (desafio de proxy): passageira, não enviada',
      () async {
    await fotoAvaria('A', 0);
    final m = montar((_) => ResponseBody.fromString('<html>desafio</html>', 200,
        headers: {
          Headers.contentTypeHeader: ['text/html'],
        }));

    await m.uploader.rodada();

    final f = await ler('avaria-A-0');
    expect((f.status, f.tentativas), ('pendente', 1));
  });

  test('arquivo ausente: falhou sem_arquivo, sem requisição', () async {
    await ticket('T1');
    await fotoEntrada('T1', caminho: '${tmp.path}/sumiu.jpg');
    final m = montar((_) => _ok());

    await m.uploader.rodada();

    expect(m.adapter.pedidos, isEmpty);
    final f = await ler('entrada-T1');
    expect((f.status, f.erroCodigo), ('falhou', 'sem_arquivo'));
  });

  test('limite por rodada: 12 devidas → sobem as 10 mais antigas', () async {
    for (var i = 0; i < 12; i++) {
      await fotoAvaria('A', i, criado: 100 - i); // a de índice 11 é a mais antiga
    }
    final m = montar((_) => _ok());

    expect(await m.uploader.rodada(), Env.fotosPorRodada);

    final indices = m.adapter.pedidos.map((o) => _campos(o)['indice']).toList();
    expect(indices, ['11', '10', '9', '8', '7', '6', '5', '4', '3', '2']);
    expect((await ler('avaria-A-0')).status, 'pendente');
    expect((await ler('avaria-A-1')).status, 'pendente');
  });

  test('reentrância: rodada já em curso não começa outra', () async {
    await fotoAvaria('A', 0);
    final libera = Completer<void>();
    final m = montar((_) async {
      await libera.future;
      return _ok();
    });

    final primeira = m.uploader.rodada();
    await Future<void>.delayed(Duration.zero);
    expect(await m.uploader.rodada(), 0, reason: 'a segunda sai na hora');
    libera.complete();
    expect(await primeira, 1);
    expect(m.adapter.pedidos, hasLength(1));
  });

  test('progresso: foto n de N com os bytes da rodada; termina em null',
      () async {
    await fotoAvaria('A', 0, criado: 1);
    await fotoAvaria('A', 1, criado: 2);
    final m = montar((_) => _ok());
    final eventos = <FotoProgresso?>[];
    final sub = m.uploader.progresso.listen(eventos.add);

    await m.uploader.rodada();
    await Future<void>.delayed(Duration.zero);
    await sub.cancel();

    final reais = eventos.whereType<FotoProgresso>().toList();
    expect(reais.first.atual, 1);
    expect(reais.map((e) => e.total).toSet(), {2});
    expect(reais.map((e) => e.bytesTotal).toSet(), {2000});
    expect(reais.any((e) => e.atual == 2), isTrue);
    expect(reais.last.bytesEnviados, lessThanOrEqualTo(2000));
    expect(reais.any((e) => e.bytesEnviados > 0), isTrue,
        reason: 'onSendProgress alimenta a barra');
    expect(eventos.last, isNull, reason: 'fim da rodada');
  });

  test('mede no começo da rodada o tamanho de toda pendente com 0 bytes',
      () async {
    // Ticket ainda não subiu: a foto não é devida, mas o menu precisa do MB.
    await ticket('T1', sync: 'pendente');
    await fotoEntrada('T1', bytes: 0, caminho: arquivo('T1', bytes: 4321));
    final m = montar((_) => _ok());

    await m.uploader.rodada();

    expect(m.adapter.pedidos, isEmpty);
    expect((await ler('entrada-T1')).bytes, 4321);
  });

  test('cancelar(): a foto em envio não gasta tentativa', () async {
    await fotoAvaria('A', 0);
    final nunca = Completer<ResponseBody>();
    final m = montar((_) => nunca.future);

    final rodada = m.uploader.rodada();
    await Future<void>.delayed(const Duration(milliseconds: 20));
    m.uploader.cancelar();

    expect(await rodada, 0);
    final f = await ler('avaria-A-0');
    expect((f.status, f.tentativas), ('pendente', 0));
  });

  test('erro inesperado nunca escapa da rodada', () async {
    await fotoAvaria('A', 0);
    final m = montar((_) => throw StateError('adapter quebrou'));

    await expectLater(m.uploader.rodada(), completes);
    expect((await ler('avaria-A-0')).tentativas, 1);
  });
}
