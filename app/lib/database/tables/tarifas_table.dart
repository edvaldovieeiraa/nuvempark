import 'package:drift/drift.dart';

class Tarifas extends Table {
  TextColumn get id => text()();
  TextColumn get operacaoId => text()();
  TextColumn get nome => text().withDefault(const Constant('Padrão'))();
  TextColumn get tipoVeiculo => text()();
  IntColumn get ordem => integer().withDefault(const Constant(0))();
  BoolColumn get visivelOperador => boolean().withDefault(const Constant(true))();
  IntColumn get fracaoInicialMinutos => integer()();
  RealColumn get fracaoInicialValor => real()();
  IntColumn get fracaoAdicionalMinutos => integer()();
  RealColumn get fracaoAdicionalValor => real()();
  RealColumn get tetoDiaria => real()();
  IntColumn get toleranciaMinutos => integer()();
  RealColumn get pernoiteValor => real()();
  IntColumn get pernoiteHoraInicio => integer()();
  IntColumn get pernoiteHoraFim => integer()();
  IntColumn get vigenciaInicioEpoch => integer()();
  IntColumn get vigenciaFimEpoch => integer().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}
