part of '../app_database.dart';

@DriftAccessor(tables: [CaixaSessoes, CaixaMovimentos])
class CaixaDao extends DatabaseAccessor<AppDatabase> with _$CaixaDaoMixin {
  CaixaDao(super.db);

  Future<void> abrirSessao(CaixaSessoesCompanion s) =>
      into(caixaSessoes).insert(s);

  Future<CaixaSessoe?> getSessaoAberta(
    String operacaoId,
    String operadorId,
  ) =>
      (select(caixaSessoes)
            ..where(
              (s) =>
                  s.operacaoId.equals(operacaoId) &
                  s.operadorId.equals(operadorId) &
                  s.status.equals('aberta'),
            ))
          .getSingleOrNull();

  Future<CaixaSessoe?> getSessaoById(String id) =>
      (select(caixaSessoes)..where((s) => s.id.equals(id))).getSingleOrNull();

  Future<void> atualizarSessao(String id, CaixaSessoesCompanion c) =>
      (update(caixaSessoes)..where((s) => s.id.equals(id))).write(c);

  Future<void> inserirMovimento(CaixaMovimentosCompanion m) =>
      into(caixaMovimentos).insert(m);

  Future<List<CaixaMovimento>> getMovimentosBySessao(String sessaoId) =>
      (select(caixaMovimentos)
            ..where((m) => m.caixaSessaoId.equals(sessaoId))
            ..orderBy([(m) => OrderingTerm.asc(m.criadoEm)]))
          .get();

  Future<List<CaixaSessoe>> getSessoesPendentesSync() =>
      (select(caixaSessoes)..where((s) => s.syncStatus.equals('pendente')))
          .get();

  Future<List<CaixaMovimento>> getMovimentosPendentesSync() =>
      (select(caixaMovimentos)..where((m) => m.syncStatus.equals('pendente')))
          .get();

  Future<void> marcarSessaoSincronizada(String id) =>
      (update(caixaSessoes)..where((s) => s.id.equals(id)))
          .write(const CaixaSessoesCompanion(syncStatus: Value('sincronizado')));

  Future<void> marcarMovimentoSincronizado(String id) =>
      (update(caixaMovimentos)..where((m) => m.id.equals(id))).write(
          const CaixaMovimentosCompanion(syncStatus: Value('sincronizado')));
}
