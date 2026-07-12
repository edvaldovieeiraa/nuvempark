import 'package:drift/drift.dart';

/// Índice placa → cliente para lookup offline na entrada.
/// Placa é única por pátio (PK composta operacaoId+placa).
class PatioClientePlacas extends Table {
  TextColumn get operacaoId => text()();
  TextColumn get placa => text()();
  TextColumn get clienteId => text()();
  TextColumn get descricao => text().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {operacaoId, placa};
}
