import 'package:drift/drift.dart';

/// Contratação e renovações de uma estadia. Imutável (create-only), como os
/// movimentos de caixa. `baseEpoch` é de onde a renovação conta — vencimento
/// atual ou "agora" — e vai ao servidor, que aplica a mesma fórmula sob trava.
class EstadiaPagamentos extends Table {
  TextColumn get id => text()(); // uuid client-gen
  TextColumn get operacaoId => text()(); // VALOR = patio_id
  TextColumn get estadiaId => text()();
  TextColumn get tipo => text()(); // 'contratacao' | 'renovacao'
  IntColumn get diarias => integer()();
  RealColumn get valor => real()();
  TextColumn get formaPagamento => text()();
  IntColumn get baseEpoch => integer().nullable()();
  TextColumn get operadorId => text().nullable()();
  TextColumn get caixaSessaoId => text().nullable()();
  TextColumn get caixaMovimentoId => text().nullable()();
  IntColumn get pagoEmEpoch => integer()();
  TextColumn get syncStatus => text().withDefault(const Constant('pendente'))();
  IntColumn get criadoEm => integer()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}
