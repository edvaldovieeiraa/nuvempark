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

  /// Todos os clientes do pátio (tela Mensalistas), ordenados por nome.
  Future<List<PatioCliente>> getClientes(String operacaoId) =>
      (select(patioClientes)
            ..where((t) => t.operacaoId.equals(operacaoId))
            ..orderBy([(t) => OrderingTerm.asc(t.nome)]))
          .get();

  /// Um cliente por id (para ler o vencimento atual antes de avançá-lo).
  Future<PatioCliente?> getClienteById(String id) =>
      (select(patioClientes)..where((t) => t.id.equals(id))).getSingleOrNull();

  /// Avança o vencimento local do cliente (reflexo imediato do pagamento no
  /// app; o servidor reconcilia no próximo bootstrap).
  Future<void> atualizarVencimento(String id, int vencimentoEpoch) =>
      (update(patioClientes)..where((t) => t.id.equals(id))).write(
        PatioClientesCompanion(vencimentoEpoch: Value(vencimentoEpoch)),
      );

  /// Placas do pátio (para busca por placa na tela Mensalistas).
  Future<List<PatioClientePlaca>> getPlacas(String operacaoId) =>
      (select(patioClientePlacas)
            ..where((t) => t.operacaoId.equals(operacaoId)))
          .get();

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
