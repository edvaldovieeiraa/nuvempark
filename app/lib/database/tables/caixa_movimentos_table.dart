import 'package:drift/drift.dart';

class CaixaMovimentos extends Table {
  TextColumn get id => text()();
  TextColumn get caixaSessaoId => text()();
  // 'entrada' | 'sangria' | 'isencao'
  TextColumn get tipo => text()();
  RealColumn get valor => real()();
  TextColumn get descricao => text()();
  TextColumn get ticketId => text().nullable()();
  TextColumn get formaPagamento => text().nullable()();
  IntColumn get criadoEm => integer()();
  TextColumn get syncStatus => text().withDefault(const Constant('pendente'))();

  @override
  Set<Column<Object>> get primaryKey => {id};
}
