part of '../app_database.dart';

@DriftAccessor(tables: [PatioClientes, PatioClientePlacas])
class ClientesDao extends DatabaseAccessor<AppDatabase> with _$ClientesDaoMixin {
  ClientesDao(super.db);

  /// Substitui o cache de clientes+placas de um pátio (chamado no bootstrap).
  Future<void> replaceClientes(
    String operacaoId,
    List<PatioClientesCompanion> clientes,
    List<PatioClientePlacasCompanion> placas,
  ) =>
      transaction(() async {
        await (delete(patioClientePlacas)
              ..where((t) => t.operacaoId.equals(operacaoId)))
            .go();
        await (delete(patioClientes)
              ..where((t) => t.operacaoId.equals(operacaoId)))
            .go();
        if (clientes.isNotEmpty) {
          await batch((b) => b.insertAll(patioClientes, clientes));
        }
        if (placas.isNotEmpty) {
          await batch((b) => b.insertAll(patioClientePlacas, placas));
        }
      });

  /// Lookup offline: retorna o cliente dono da placa, se houver.
  Future<PatioCliente?> getClienteByPlaca(
    String operacaoId,
    String placa,
  ) async {
    final vinculo = await (select(patioClientePlacas)
          ..where((t) =>
              t.operacaoId.equals(operacaoId) & t.placa.equals(placa)))
        .getSingleOrNull();
    if (vinculo == null) return null;

    return (select(patioClientes)..where((t) => t.id.equals(vinculo.clienteId)))
        .getSingleOrNull();
  }
}
