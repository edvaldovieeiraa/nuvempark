part of '../app_database.dart';

@DriftAccessor(tables: [LiberacoesCache])
class LiberacoesDao extends DatabaseAccessor<AppDatabase>
    with _$LiberacoesDaoMixin {
  LiberacoesDao(super.db);

  /// Troca a cópia local inteira pela do servidor, numa transação.
  ///
  /// Substituir e não mesclar é o que faz o CANCELAMENTO chegar: uma liberação
  /// cancelada no painel some do payload do bootstrap, e só o `delete` prévio
  /// a remove daqui. Mesclando, ela sobreviveria para sempre no aparelho e o
  /// operador daria desconto que o gestor já tinha cortado.
  Future<void> substituir(
    String operacaoId,
    List<LiberacoesCacheCompanion> linhas,
  ) async {
    await transaction(() async {
      await (delete(liberacoesCache)
            ..where((t) => t.operacaoId.equals(operacaoId)))
          .go();
      if (linhas.isEmpty) return;
      await batch((b) => b.insertAll(liberacoesCache, linhas));
    });
  }

  Future<LiberacoesCacheData?> porTicket(String ticketId) =>
      (select(liberacoesCache)..where((t) => t.ticketId.equals(ticketId)))
          .getSingleOrNull();
}
