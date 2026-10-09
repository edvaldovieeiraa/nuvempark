import 'package:drift/drift.dart';

/// Estadia de hóspede (diárias pagas na contratação). Nasce no app e sobe pela
/// outbox como create-only; o vencimento só muda por pagamento de renovação,
/// que o servidor aplica sob trava (db/41). A cópia local é atualizada pelo
/// ciclo de tickets abertos, que traz o vencimento do servidor.
/// `operacaoId` mantém o nome de coluna do leve-patio — o VALOR é o patio_id.
class Estadias extends Table {
  TextColumn get id => text()(); // uuid client-gen
  TextColumn get operacaoId => text()(); // VALOR = patio_id
  TextColumn get placa => text()();
  TextColumn get tipoVeiculo => text()();
  TextColumn get tarifaId => text()();
  RealColumn get diariaValor => real()(); // congelado na contratação
  IntColumn get diariaHoras => integer()(); // congelado na contratação
  IntColumn get inicioEpoch => integer()();
  IntColumn get validaAteEpoch => integer()();
  IntColumn get diarias => integer()();
  RealColumn get valorTotal => real()();
  TextColumn get operadorId => text().nullable()();
  TextColumn get syncStatus => text().withDefault(const Constant('pendente'))();
  IntColumn get criadoEm => integer()();
  IntColumn get atualizadoEm => integer()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}
