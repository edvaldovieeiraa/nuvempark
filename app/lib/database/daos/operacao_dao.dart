part of '../app_database.dart';

@DriftAccessor(tables: [OperacaoCache, Tarifas])
class OperacaoDao extends DatabaseAccessor<AppDatabase> with _$OperacaoDaoMixin {
  OperacaoDao(super.db);

  Future<OperacaoCacheData?> getCacheByOperacaoId(String id) =>
      (select(operacaoCache)..where((t) => t.operacaoId.equals(id)))
          .getSingleOrNull();

  Future<void> upsertCache(OperacaoCacheCompanion c) =>
      into(operacaoCache).insertOnConflictUpdate(c);

  Future<List<Tarifa>> getTarifasByOperacaoId(String id) =>
      (select(tarifas)..where((t) => t.operacaoId.equals(id))).get();

  Future<void> replaceTarifas(
    String operacaoId,
    List<TarifasCompanion> items,
  ) =>
      transaction(() async {
        await (delete(tarifas)..where((t) => t.operacaoId.equals(operacaoId)))
            .go();
        if (items.isNotEmpty) {
          await batch((b) => b.insertAll(tarifas, items));
        }
      });
}
