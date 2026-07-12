import 'package:drift/drift.dart';

class SyncLog extends Table {
  // autoIncrement() cria a PK automaticamente
  IntColumn get id => integer().autoIncrement()();
  TextColumn get entidade => text()();
  TextColumn get entidadeId => text()();
  // 'create' | 'update'
  TextColumn get operacao => text()();
  TextColumn get payload => text()();
  // 'pendente' | 'sincronizado' | 'falhou'
  TextColumn get status => text().withDefault(const Constant('pendente'))();
  IntColumn get tentativas => integer().withDefault(const Constant(0))();
  IntColumn get proximaTentativaEpoch => integer().nullable()();
  TextColumn get erroUltimaTentativa => text().nullable()();
  IntColumn get criadoEm => integer()();
}
