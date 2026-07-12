part of '../app_database.dart';

@DriftAccessor(tables: [SyncLog])
class SyncDao extends DatabaseAccessor<AppDatabase> with _$SyncDaoMixin {
  SyncDao(super.db);

  Future<void> enqueue(SyncLogCompanion item) => into(syncLog).insert(item);

  Future<List<SyncLogData>> getPendentes(int agora) =>
      (select(syncLog)
            ..where(
              (s) =>
                  s.status.equals('pendente') &
                  (s.proximaTentativaEpoch.isNull() |
                      s.proximaTentativaEpoch.isSmallerOrEqualValue(agora)),
            )
            ..orderBy([(s) => OrderingTerm.asc(s.criadoEm)]))
          .get();

  Future<void> marcarSucesso(int id) =>
      (update(syncLog)..where((s) => s.id.equals(id)))
          .write(const SyncLogCompanion(status: Value('sincronizado')));

  Future<void> marcarErro(int id, int proximaTentativa, String erro) =>
      customUpdate(
        '''
        UPDATE sync_log
        SET status = 'pendente',
            tentativas = tentativas + 1,
            proxima_tentativa_epoch = ?,
            erro_ultima_tentativa = ?
        WHERE id = ?
        ''',
        variables: [
          Variable.withInt(proximaTentativa),
          Variable.withString(erro),
          Variable.withInt(id),
        ],
        updates: {syncLog},
      );

  Future<void> marcarFalhou(int id, String erro) => customUpdate(
        '''
        UPDATE sync_log
        SET status = 'falhou',
            tentativas = tentativas + 1,
            erro_ultima_tentativa = ?
        WHERE id = ?
        ''',
        variables: [Variable.withString(erro), Variable.withInt(id)],
        updates: {syncLog},
      );

  Future<int> countPendentes() async {
    final count = countAll(filter: syncLog.status.equals('pendente'));
    final q = selectOnly(syncLog)..addColumns([count]);
    final row = await q.getSingle();
    return row.read(count) ?? 0;
  }

  /// Itens que esgotaram as tentativas (status 'falhou') — somem de
  /// countPendentes() ao cair nesse status, então precisam de contagem à parte.
  Future<int> countFalhos() async {
    final count = countAll(filter: syncLog.status.equals('falhou'));
    final q = selectOnly(syncLog)..addColumns([count]);
    final row = await q.getSingle();
    return row.read(count) ?? 0;
  }

  Future<List<SyncLogData>> getFalhos() =>
      (select(syncLog)
            ..where((s) => s.status.equals('falhou'))
            ..orderBy([(s) => OrderingTerm.desc(s.criadoEm)]))
          .get();

  Future<List<SyncLogData>> getRecentes({int limit = 50}) =>
      (select(syncLog)
            ..orderBy([(s) => OrderingTerm.desc(s.criadoEm)])
            ..limit(limit))
          .get();

  /// Recoloca todos os itens 'falhou' na fila para retry imediato.
  Future<void> retryFalhos() => customUpdate(
        '''
        UPDATE sync_log
        SET status = 'pendente',
            tentativas = 0,
            proxima_tentativa_epoch = NULL,
            erro_ultima_tentativa = NULL
        WHERE status = 'falhou'
        ''',
        updates: {syncLog},
      );
}
