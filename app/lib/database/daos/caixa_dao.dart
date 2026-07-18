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
            )
            // Blindagem: se houver mais de uma sessão aberta (duplo-toque,
            // multi-device), pega a mais recente em vez de lançar exceção.
            ..orderBy([(s) => OrderingTerm.desc(s.aberturaEpoch)])
            ..limit(1))
          .getSingleOrNull();

  Future<CaixaSessoe?> getSessaoById(String id) =>
      (select(caixaSessoes)..where((s) => s.id.equals(id))).getSingleOrNull();

  /// Última sessão FECHADA do operador — base da reimpressão de fechamento.
  Future<CaixaSessoe?> getUltimaSessaoFechada(
    String operacaoId,
    String operadorId,
  ) =>
      (select(caixaSessoes)
            ..where(
              (s) =>
                  s.operacaoId.equals(operacaoId) &
                  s.operadorId.equals(operadorId) &
                  s.status.equals('fechada'),
            )
            ..orderBy([(s) => OrderingTerm.desc(s.fechamentoEpoch)])
            ..limit(1))
          .getSingleOrNull();

  Future<void> atualizarSessao(String id, CaixaSessoesCompanion c) =>
      (update(caixaSessoes)..where((s) => s.id.equals(id))).write(c);

  /// Fecho CONDICIONAL e atômico da sessão: aplica [c] só se ainda 'aberta'.
  /// Retorna linhas alteradas — 1 = este chamador fechou; 0 = já fechada (ou
  /// inexistente). Blinda o fechamento contra duplo-toque/retry, que senão
  /// reescreveria o total e reenfileiraria o sync.
  Future<int> fecharSeAberta(String id, CaixaSessoesCompanion c) =>
      (update(caixaSessoes)
            ..where((s) => s.id.equals(id) & s.status.equals('aberta')))
          .write(c);

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
