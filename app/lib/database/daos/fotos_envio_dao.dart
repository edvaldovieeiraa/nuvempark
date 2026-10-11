part of '../app_database.dart';

/// Contagens da fila de fotos para o menu de sincronização.
class ResumoFotos {
  const ResumoFotos({
    required this.pendentes,
    required this.bytes,
    required this.falhas,
  });

  /// Fotos `pendente` (inclui as que esperam o ticket subir).
  final int pendentes;

  /// Soma do tamanho das pendentes — é o "4,8 MB" do menu.
  final int bytes;

  /// Fotos `falhou` (reenviáveis ou não).
  final int falhas;

  static const vazio = ResumoFotos(pendentes: 0, bytes: 0, falhas: 0);
}

@DriftAccessor(tables: [FotosEnvio, Tickets])
class FotosEnvioDao extends DatabaseAccessor<AppDatabase>
    with _$FotosEnvioDaoMixin {
  FotosEnvioDao(super.db);

  /// Id determinístico: enfileirar de novo a mesma foto não duplica — a
  /// primeira linha vale.
  Future<void> enfileirar(FotosEnvioCompanion f) =>
      into(fotosEnvio).insert(f, mode: InsertMode.insertOrIgnore);

  /// Fotos da próxima rodada: `pendente`, com a próxima tentativa vencida,
  /// mais antigas primeiro.
  ///
  /// A de ENTRADA só vai com o ticket já sincronizado (o `/foto` grava o
  /// caminho na linha do ticket no servidor) — ou ausente no aparelho, o que
  /// só acontece depois de ele ter subido (saiu por outro aparelho). A de
  /// AVARIA não depende de ordem: o caminho no servidor é determinístico.
  Future<List<FotoEnvio>> devidas({
    required int agoraEpoch,
    required int limite,
  }) {
    final q = select(fotosEnvio).join([
      leftOuterJoin(tickets, tickets.id.equalsExp(fotosEnvio.ticketId)),
    ])
      ..where(fotosEnvio.status.equals('pendente') &
          fotosEnvio.proximaTentativaEpoch.isSmallerOrEqualValue(agoraEpoch) &
          (fotosEnvio.tipo.equals('entrada').not() |
              tickets.id.isNull() |
              tickets.syncStatus.equals('sincronizado')))
      ..orderBy([
        OrderingTerm.asc(fotosEnvio.criadoEm),
        OrderingTerm.asc(fotosEnvio.id),
      ])
      ..limit(limite);
    return q.map((r) => r.readTable(fotosEnvio)).get();
  }

  Future<void> marcarEnviada(String id, {required int agoraEpoch}) =>
      (update(fotosEnvio)..where((f) => f.id.equals(id))).write(
        FotosEnvioCompanion(
          status: const Value('enviada'),
          enviadoEmEpoch: Value(agoraEpoch),
          erro: const Value(null),
          erroCodigo: const Value(null),
        ),
      );

  Future<void> agendarRetry(
    String id, {
    required int tentativas,
    required int proximaEpoch,
    required String erro,
  }) =>
      (update(fotosEnvio)..where((f) => f.id.equals(id))).write(
        FotosEnvioCompanion(
          tentativas: Value(tentativas),
          proximaTentativaEpoch: Value(proximaEpoch),
          erro: Value(erro),
        ),
      );

  Future<void> marcarFalhou(
    String id, {
    required String erro,
    required String codigo,
    int? tentativas,
  }) =>
      (update(fotosEnvio)..where((f) => f.id.equals(id))).write(
        FotosEnvioCompanion(
          status: const Value('falhou'),
          erro: Value(erro),
          erroCodigo: Value(codigo),
          tentativas:
              tentativas == null ? const Value.absent() : Value(tentativas),
        ),
      );

  /// Ticket removido no painel: as fotos que ainda não subiram não têm mais
  /// onde aparecer.
  Future<void> descartarDoTicket(String ticketId) =>
      (update(fotosEnvio)
            ..where((f) =>
                f.ticketId.equals(ticketId) &
                f.status.isIn(const ['pendente', 'falhou'])))
          .write(const FotosEnvioCompanion(status: Value('descartada')));

  /// Reenvio pelo menu: falhas voltam a `pendente` com tentativas zeradas —
  /// menos a de arquivo ausente, que falharia de novo na hora.
  Future<int> resetFalhas() => customUpdate(
        '''
        UPDATE fotos_envio
        SET status = 'pendente',
            tentativas = 0,
            proxima_tentativa_epoch = 0,
            erro = NULL,
            erro_codigo = NULL
        WHERE status = 'falhou'
          AND (erro_codigo IS NULL OR erro_codigo <> 'sem_arquivo')
        ''',
        updates: {fotosEnvio},
        updateKind: UpdateKind.update,
      );

  /// Pendentes ainda sem tamanho medido (backfill da migração).
  Future<List<FotoEnvio>> semBytes() => (select(fotosEnvio)
        ..where((f) => f.status.equals('pendente') & f.bytes.equals(0)))
      .get();

  Future<void> atualizarBytes(String id, int bytes) =>
      (update(fotosEnvio)..where((f) => f.id.equals(id)))
          .write(FotosEnvioCompanion(bytes: Value(bytes)));

  /// Pendentes, tamanho delas e falhas — reativo para o menu.
  Stream<ResumoFotos> watchResumo() => customSelect(
        '''
        SELECT
          COALESCE(SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END), 0) AS pendentes,
          COALESCE(SUM(CASE WHEN status = 'pendente' THEN bytes ELSE 0 END), 0) AS bytes,
          COALESCE(SUM(CASE WHEN status = 'falhou' THEN 1 ELSE 0 END), 0) AS falhas
        FROM fotos_envio
        ''',
        readsFrom: {fotosEnvio},
      ).watchSingle().map((r) => ResumoFotos(
            pendentes: r.read<int>('pendentes'),
            bytes: r.read<int>('bytes'),
            falhas: r.read<int>('falhas'),
          ));

  /// Fotos cujo arquivo local pode ser apagado: já enviadas e com o carro
  /// fora há [corteEpoch] ou mais. Ticket ausente no aparelho conta pela hora
  /// do envio. Ticket aberto (sem saída) nunca entra — a foto ainda aparece na
  /// ficha do veículo.
  Future<List<FotoEnvio>> elegiveisLimpeza({required int corteEpoch}) {
    final q = select(fotosEnvio).join([
      leftOuterJoin(tickets, tickets.id.equalsExp(fotosEnvio.ticketId)),
    ])
      ..where(fotosEnvio.status.equals('enviada') &
          fotosEnvio.arquivoApagadoEmEpoch.isNull() &
          ((tickets.id.isNotNull() &
                  tickets.saidaEpoch.isNotNull() &
                  tickets.saidaEpoch.isSmallerOrEqualValue(corteEpoch)) |
              (tickets.id.isNull() &
                  fotosEnvio.enviadoEmEpoch
                      .isSmallerOrEqualValue(corteEpoch))));
    return q.map((r) => r.readTable(fotosEnvio)).get();
  }

  Future<void> marcarArquivoApagado(String id, {required int agoraEpoch}) =>
      (update(fotosEnvio)..where((f) => f.id.equals(id))).write(
          FotosEnvioCompanion(arquivoApagadoEmEpoch: Value(agoraEpoch)));

  /// Fila técnica: a linha de uma foto já enviada e com o arquivo apagado há
  /// mais de [corteEpoch] não serve para mais nada.
  Future<int> removerApagadasAntes({required int corteEpoch}) =>
      (delete(fotosEnvio)
            ..where((f) =>
                f.arquivoApagadoEmEpoch.isSmallerOrEqualValue(corteEpoch)))
          .go();
}
