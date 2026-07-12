part of '../app_database.dart';

@DriftAccessor(tables: [MensalidadePagamentos])
class MensalidadePagamentosDao extends DatabaseAccessor<AppDatabase>
    with _$MensalidadePagamentosDaoMixin {
  MensalidadePagamentosDao(super.db);

  Future<void> inserir(MensalidadePagamentosCompanion p) =>
      into(mensalidadePagamentos).insert(p);

  /// Histórico local de um cliente (competência desc, mais recente primeiro).
  Future<List<MensalidadePagamento>> getByCliente(String clienteId) =>
      (select(mensalidadePagamentos)
            ..where((p) => p.clienteId.equals(clienteId))
            ..orderBy([
              (p) => OrderingTerm.desc(p.competencia),
              (p) => OrderingTerm.desc(p.pagoEmEpoch),
            ]))
          .get();

  /// Quantos pagamentos locais o cliente tem para uma competência
  /// (badge "em dia" + aviso de duplicidade). Só há registros do próprio app.
  Future<int> countByClienteCompetencia(
    String clienteId,
    String competencia,
  ) async {
    final n = countAll(
      filter: mensalidadePagamentos.clienteId.equals(clienteId) &
          mensalidadePagamentos.competencia.equals(competencia),
    );
    final q = selectOnly(mensalidadePagamentos)..addColumns([n]);
    final row = await q.getSingle();
    return row.read(n) ?? 0;
  }

  /// Todos os pagamentos locais do pátio (para os badges da lista, sem N+1).
  Future<List<MensalidadePagamento>> getByOperacao(String operacaoId) =>
      (select(mensalidadePagamentos)
            ..where((p) => p.operacaoId.equals(operacaoId)))
          .get();

  Future<List<MensalidadePagamento>> getPendentesSync() =>
      (select(mensalidadePagamentos)
            ..where((p) => p.syncStatus.equals('pendente')))
          .get();

  Future<void> marcarSincronizado(String id) =>
      (update(mensalidadePagamentos)..where((p) => p.id.equals(id))).write(
        const MensalidadePagamentosCompanion(
          syncStatus: Value('sincronizado'),
        ),
      );
}
