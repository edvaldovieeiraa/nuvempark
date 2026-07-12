import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import 'tables/operacao_cache_table.dart';
import 'tables/tarifas_table.dart';
import 'tables/tickets_table.dart';
import 'tables/caixa_sessoes_table.dart';
import 'tables/caixa_movimentos_table.dart';
import 'tables/sync_log_table.dart';
import 'tables/patio_clientes_table.dart';
import 'tables/patio_cliente_placas_table.dart';

part 'app_database.g.dart';
part 'daos/operacao_dao.dart';
part 'daos/tickets_dao.dart';
part 'daos/caixa_dao.dart';
part 'daos/sync_dao.dart';
part 'daos/clientes_dao.dart';

@DriftDatabase(
  tables: [
    OperacaoCache,
    Tarifas,
    Tickets,
    CaixaSessoes,
    CaixaMovimentos,
    SyncLog,
    PatioClientes,
    PatioClientePlacas,
  ],
  daos: [
    OperacaoDao,
    TicketsDao,
    CaixaDao,
    SyncDao,
    ClientesDao,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());
  AppDatabase.forTesting(super.executor);

  // App novo: schema final já completo em v1 (sem migrações históricas).
  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) async {
          await m.createAll();
          await _criarIndices(m);
        },
      );

  /// Índices de hot-query (idempotentes).
  Future<void> _criarIndices(Migrator m) async {
    await m.database.customStatement(
      'CREATE INDEX IF NOT EXISTS idx_tickets_op_status ON tickets(operacao_id, status)',
    );
    await m.database.customStatement(
      'CREATE INDEX IF NOT EXISTS idx_tickets_op_placa_status ON tickets(operacao_id, placa, status)',
    );
    await m.database.customStatement(
      'CREATE INDEX IF NOT EXISTS idx_tickets_sync_status ON tickets(sync_status)',
    );
    await m.database.customStatement(
      'CREATE INDEX IF NOT EXISTS idx_synclog_status_prox ON sync_log(status, proxima_tentativa_epoch)',
    );
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'nuvempark.db'));
    return NativeDatabase.createInBackground(file);
  });
}
