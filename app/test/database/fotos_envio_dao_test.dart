import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nuvempark_app/database/app_database.dart';

const _dia = 24 * 60 * 60 * 1000;

Future<void> _ticket(
  AppDatabase db,
  String id, {
  String sync = 'sincronizado',
  int? saida,
}) =>
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
      saidaEpoch: Value(saida),
      status: Value(saida == null ? 'aberto' : 'fechado'),
    ));

Future<void> _foto(
  AppDatabase db,
  String id, {
  String tipo = 'avaria',
  String ticket = 't1',
  int criado = 1,
  int bytes = 100,
  String status = 'pendente',
  int proxima = 0,
  String? erroCodigo,
  int? enviado,
  int? apagado,
}) =>
    db.fotosEnvioDao.enfileirar(FotosEnvioCompanion.insert(
      id: id,
      tipo: tipo,
      operacaoId: 'p1',
      ticketId: ticket,
      caminhoLocal: '/fotos/$id.jpg',
      criadoEm: criado,
      bytes: Value(bytes),
      status: Value(status),
      proximaTentativaEpoch: Value(proxima),
      erroCodigo: Value(erroCodigo),
      enviadoEmEpoch: Value(enviado),
      arquivoApagadoEmEpoch: Value(apagado),
    ));

Future<FotoEnvio> _ler(AppDatabase db, String id) =>
    (db.select(db.fotosEnvio)..where((f) => f.id.equals(id))).getSingle();

void main() {
  late AppDatabase db;
  setUp(() => db = AppDatabase.forTesting(NativeDatabase.memory()));
  tearDown(() => db.close());

  test('enfileirar duas vezes o mesmo id não duplica', () async {
    await _foto(db, 'a');
    await _foto(db, 'a', criado: 99);
    expect(await db.select(db.fotosEnvio).get(), hasLength(1));
    expect((await _ler(db, 'a')).criadoEm, 1, reason: 'a primeira vale');
  });

  group('devidas', () {
    test('mais antigas primeiro, respeitando o limite', () async {
      await _foto(db, 'c', criado: 30);
      await _foto(db, 'a', criado: 10);
      await _foto(db, 'b', criado: 20);
      final r = await db.fotosEnvioDao.devidas(agoraEpoch: 1000, limite: 2);
      expect(r.map((f) => f.id), ['a', 'b']);
    });

    test('ignora próxima tentativa no futuro e status fora de pendente',
        () async {
      await _foto(db, 'futura', proxima: 5000);
      await _foto(db, 'enviada', status: 'enviada');
      await _foto(db, 'falhou', status: 'falhou');
      await _foto(db, 'descartada', status: 'descartada');
      await _foto(db, 'ok');
      final r = await db.fotosEnvioDao.devidas(agoraEpoch: 1000, limite: 10);
      expect(r.map((f) => f.id), ['ok']);
    });

    test('entrada só com o ticket sincronizado ou ausente no aparelho',
        () async {
      await _ticket(db, 'pendente', sync: 'pendente');
      await _ticket(db, 'subiu');
      await _foto(db, 'e-pendente', tipo: 'entrada', ticket: 'pendente');
      await _foto(db, 'e-subiu', tipo: 'entrada', ticket: 'subiu', criado: 2);
      await _foto(db, 'e-sumiu', tipo: 'entrada', ticket: 'nao-existe', criado: 3);
      await _foto(db, 'avaria', ticket: 'pendente', criado: 4);
      final r = await db.fotosEnvioDao.devidas(agoraEpoch: 1000, limite: 10);
      expect(r.map((f) => f.id), ['e-subiu', 'e-sumiu', 'avaria'],
          reason: 'avaria não depende do ticket; entrada espera ele subir');
    });
  });

  test('marcarEnviada limpa o erro e guarda a hora', () async {
    await _foto(db, 'a');
    await db.fotosEnvioDao
        .agendarRetry('a', tentativas: 1, proximaEpoch: 50, erro: 'HTTP 500');
    await db.fotosEnvioDao.marcarEnviada('a', agoraEpoch: 777);
    final f = await _ler(db, 'a');
    expect(f.status, 'enviada');
    expect(f.enviadoEmEpoch, 777);
    expect(f.erro, isNull);
  });

  test('agendarRetry e marcarFalhou gravam tentativas, motivo e código',
      () async {
    await _foto(db, 'a');
    await db.fotosEnvioDao
        .agendarRetry('a', tentativas: 3, proximaEpoch: 900, erro: 'HTTP 503');
    var f = await _ler(db, 'a');
    expect((f.status, f.tentativas, f.proximaTentativaEpoch, f.erro),
        ('pendente', 3, 900, 'HTTP 503'));

    await db.fotosEnvioDao
        .marcarFalhou('a', erro: 'HTTP 413', codigo: 'http_permanente', tentativas: 4);
    f = await _ler(db, 'a');
    expect((f.status, f.tentativas, f.erroCodigo), ('falhou', 4, 'http_permanente'));
  });

  test('resetFalhas reabre falhas, menos a de arquivo ausente', () async {
    await _foto(db, 'http', status: 'falhou', erroCodigo: 'http_permanente');
    await _foto(db, 'tent', status: 'falhou', erroCodigo: 'tentativas');
    await _foto(db, 'sem', status: 'falhou', erroCodigo: 'sem_arquivo');
    final n = await db.fotosEnvioDao.resetFalhas();
    expect(n, 2);
    expect((await _ler(db, 'http')).status, 'pendente');
    expect((await _ler(db, 'http')).tentativas, 0);
    expect((await _ler(db, 'tent')).status, 'pendente');
    expect((await _ler(db, 'sem')).status, 'falhou');
  });

  test('descartarDoTicket tira pendentes e falhas do ticket; enviada fica',
      () async {
    await _foto(db, 'p', ticket: 'x');
    await _foto(db, 'f', ticket: 'x', status: 'falhou');
    await _foto(db, 'e', ticket: 'x', status: 'enviada');
    await _foto(db, 'outro', ticket: 'y');
    await db.fotosEnvioDao.descartarDoTicket('x');
    expect((await _ler(db, 'p')).status, 'descartada');
    expect((await _ler(db, 'f')).status, 'descartada');
    expect((await _ler(db, 'e')).status, 'enviada');
    expect((await _ler(db, 'outro')).status, 'pendente');
  });

  test('semBytes e atualizarBytes', () async {
    await _foto(db, 'zero', bytes: 0);
    await _foto(db, 'medida', bytes: 10);
    await _foto(db, 'enviada-zero', bytes: 0, status: 'enviada');
    final r = await db.fotosEnvioDao.semBytes();
    expect(r.map((f) => f.id), ['zero']);
    await db.fotosEnvioDao.atualizarBytes('zero', 4321);
    expect((await _ler(db, 'zero')).bytes, 4321);
  });

  test('watchResumo conta pendentes, soma os bytes deles e separa as falhas',
      () async {
    await _foto(db, 'p1', bytes: 1000);
    await _foto(db, 'p2', bytes: 500);
    await _foto(db, 'f1', bytes: 9999, status: 'falhou', erroCodigo: 'tentativas');
    await _foto(db, 'perdida', status: 'falhou', erroCodigo: 'sem_arquivo');
    await _foto(db, 'e1', bytes: 9999, status: 'enviada');
    final r = await db.fotosEnvioDao.watchResumo().first;
    expect((r.pendentes, r.bytes, r.falhas, r.perdidas), (2, 1500, 1, 1),
        reason: 'sem arquivo não é reenviável: conta à parte');
  });

  test('watchResumo com a fila vazia é zero, não nulo', () async {
    final r = await db.fotosEnvioDao.watchResumo().first;
    expect((r.pendentes, r.bytes, r.falhas, r.perdidas), (0, 0, 0, 0));
  });

  test('transições só valem para foto pendente (não ressuscitam descartada)',
      () async {
    await _foto(db, 'd', status: 'descartada');
    await db.fotosEnvioDao.marcarEnviada('d', agoraEpoch: 1);
    await db.fotosEnvioDao.marcarFalhou('d', erro: 'x', codigo: 'tentativas');
    await db.fotosEnvioDao.agendarRetry('d', tentativas: 2, proximaEpoch: 9, erro: 'y');
    final f = await _ler(db, 'd');
    expect((f.status, f.tentativas), ('descartada', 0));
    expect(f.erro, isNull);
  });

  test('descartarPerdidasAntes tira do menu a foto sem arquivo antiga',
      () async {
    await _foto(db, 'velha', status: 'falhou', erroCodigo: 'sem_arquivo', criado: 10);
    await _foto(db, 'nova', status: 'falhou', erroCodigo: 'sem_arquivo', criado: 100);
    await _foto(db, 'reenviavel', status: 'falhou', erroCodigo: 'tentativas', criado: 10);
    final n = await db.fotosEnvioDao.descartarPerdidasAntes(corteEpoch: 50);
    expect(n, 1);
    expect((await _ler(db, 'velha')).status, 'descartada');
    expect((await _ler(db, 'nova')).status, 'falhou');
    expect((await _ler(db, 'reenviavel')).status, 'falhou');
  });

  group('limpeza', () {
    const agora = 100 * _dia;
    const corte = agora - 7 * _dia;

    test('elegível: enviada, saída há mais de 7 dias ou ticket ausente',
        () async {
      await _ticket(db, 'saiu-8d', saida: agora - 8 * _dia);
      await _ticket(db, 'saiu-6d', saida: agora - 6 * _dia);
      await _ticket(db, 'aberto');
      await _foto(db, 'ok', ticket: 'saiu-8d', status: 'enviada', enviado: agora - 9 * _dia);
      await _foto(db, 'recente', ticket: 'saiu-6d', status: 'enviada', enviado: agora - 9 * _dia);
      await _foto(db, 'aberto', ticket: 'aberto', status: 'enviada', enviado: agora - 30 * _dia);
      await _foto(db, 'pendente', ticket: 'saiu-8d');
      await _foto(db, 'falhou', ticket: 'saiu-8d', status: 'falhou');
      await _foto(db, 'ausente-velha', ticket: 'sumiu', status: 'enviada', enviado: agora - 8 * _dia);
      await _foto(db, 'ausente-nova', ticket: 'sumiu', status: 'enviada', enviado: agora - 2 * _dia);
      await _foto(db, 'ja-apagada', ticket: 'saiu-8d', status: 'enviada',
          enviado: agora - 9 * _dia, apagado: agora - _dia);

      final r = await db.fotosEnvioDao.elegiveisLimpeza(corteEpoch: corte);
      expect(r.map((f) => f.id).toSet(), {'ok', 'ausente-velha'});
    });

    test('marcarArquivoApagado e removerApagadasAntes', () async {
      await _foto(db, 'velha', status: 'enviada', apagado: agora - 40 * _dia);
      await _foto(db, 'nova', status: 'enviada');
      await db.fotosEnvioDao.marcarArquivoApagado('nova', agoraEpoch: agora);
      expect((await _ler(db, 'nova')).arquivoApagadoEmEpoch, agora);

      final n = await db.fotosEnvioDao
          .removerApagadasAntes(corteEpoch: agora - 30 * _dia);
      expect(n, 1);
      expect(await db.select(db.fotosEnvio).get(), hasLength(1));
    });
  });
}
