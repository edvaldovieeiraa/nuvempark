import 'package:drift/drift.dart';

class CaixaSessoes extends Table {
  TextColumn get id => text()();
  TextColumn get operacaoId => text()();
  TextColumn get operadorId => text()();
  TextColumn get operadorNome => text()();
  RealColumn get fundoCaixa => real()();
  RealColumn get totalEntradas => real().withDefault(const Constant(0.0))();
  RealColumn get totalSangrias => real().withDefault(const Constant(0.0))();
  RealColumn get totalFechamento => real().nullable()();
  // 'aberta' | 'fechada'
  TextColumn get status => text().withDefault(const Constant('aberta'))();
  IntColumn get aberturaEpoch => integer()();
  IntColumn get fechamentoEpoch => integer().nullable()();
  TextColumn get observacaoFechamento => text().nullable()();
  TextColumn get syncStatus => text().withDefault(const Constant('pendente'))();

  @override
  Set<Column<Object>> get primaryKey => {id};
}
