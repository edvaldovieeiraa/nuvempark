import 'package:drift/drift.dart';

/// Cache local de clientes de livre passagem (mensalista/credenciado).
/// Baixado no bootstrap; usado para reconhecer a placa offline na entrada.
class PatioClientes extends Table {
  TextColumn get id => text()();
  TextColumn get operacaoId => text()();
  TextColumn get nome => text()();
  TextColumn get planoId => text().nullable()();
  TextColumn get planoNome => text().nullable()();
  TextColumn get planoTipo => text().nullable()(); // 'mensalista' | 'credenciado'
  RealColumn get planoValor => real().nullable()(); // valor mensal do plano
  IntColumn get vagas => integer().withDefault(const Constant(1))();
  IntColumn get vencimentoEpoch => integer().nullable()();
  IntColumn get diaVencimento => integer().nullable()(); // dia fixo 1..28 | null
  BoolColumn get bloqueado => boolean().withDefault(const Constant(false))();

  @override
  Set<Column<Object>> get primaryKey => {id};
}
