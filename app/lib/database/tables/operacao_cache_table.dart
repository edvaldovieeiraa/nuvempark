import 'package:drift/drift.dart';

/// Cache local da config do pátio (baixada no bootstrap).
/// Mantemos o nome "operacao" internamente = patio no backend NuvemPark.
class OperacaoCache extends Table {
  TextColumn get operacaoId => text()();
  TextColumn get nome => text()();
  TextColumn get codigo => text()();
  IntColumn get qtdVagas => integer()();
  TextColumn get configJson => text()();
  IntColumn get sincronizadoEm => integer()();

  @override
  Set<Column<Object>> get primaryKey => {operacaoId};
}
