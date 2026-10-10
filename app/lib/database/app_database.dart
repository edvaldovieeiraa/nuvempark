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
import 'tables/mensalidade_pagamentos_table.dart';
import 'tables/liberacoes_cache_table.dart';
import 'tables/estadias_table.dart';
import 'tables/estadia_pagamentos_table.dart';

part 'app_database.g.dart';
part 'daos/operacao_dao.dart';
part 'daos/tickets_dao.dart';
part 'daos/caixa_dao.dart';
part 'daos/sync_dao.dart';
part 'daos/clientes_dao.dart';
part 'daos/mensalidade_pagamentos_dao.dart';
part 'daos/liberacoes_dao.dart';
part 'daos/estadias_dao.dart';

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
    MensalidadePagamentos,
    LiberacoesCache,
    Estadias,
    EstadiaPagamentos,
  ],
  daos: [
    OperacaoDao,
    TicketsDao,
    CaixaDao,
    SyncDao,
    ClientesDao,
    MensalidadePagamentosDao,
    LiberacoesDao,
    EstadiasDao,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());
  AppDatabase.forTesting(super.executor);

  // v2: mensalidade_pagamentos + planos.valor (Entrega 4b).
  // v3: patio_clientes.dia_vencimento (dia fixo de vencimento do mensalista).
  @override
  // v4: liberacoes_cache — copia local dos vouchers ativos, para a saida
  // offline honrar um desconto ja sincronizado.
  // v5: estadia de hóspede — tabelas estadias/estadia_pagamentos; colunas de
  // diária em tarifas; estadia_id em tickets; estadia_pagamento_id no caixa.
  int get schemaVersion => 5;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) async {
          await m.createAll();
          await _criarIndices(m);
        },
        onUpgrade: (m, from, to) async {
          if (from < 2) {
            await m.createTable(mensalidadePagamentos);
            await m.addColumn(patioClientes, patioClientes.planoValor);
            await _criarIndicesMensalidade(m);
          }
          if (from < 3) {
            await m.addColumn(patioClientes, patioClientes.diaVencimento);
          }
          if (from < 4) {
            await m.createTable(liberacoesCache);
          }
          if (from < 5) {
            await m.createTable(estadias);
            await m.createTable(estadiaPagamentos);
            await m.addColumn(tarifas, tarifas.modalidade);
            await m.addColumn(tarifas, tarifas.diariaValor);
            await m.addColumn(tarifas, tarifas.diariaHoras);
            await m.addColumn(tarifas, tarifas.tarifaAtrasoId);
            await m.addColumn(tickets, tickets.estadiaId);
            await m.addColumn(caixaMovimentos, caixaMovimentos.estadiaPagamentoId);
            await _criarIndicesEstadias(m);
          }
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
    await _criarIndicesMensalidade(m);
    await _criarIndicesEstadias(m);
  }

  /// Índices da estadia de hóspede (usados no onCreate e no onUpgrade v5).
  Future<void> _criarIndicesEstadias(Migrator m) async {
    await m.database.customStatement(
      'CREATE INDEX IF NOT EXISTS idx_estadias_op_placa ON estadias(operacao_id, placa)',
    );
    await m.database.customStatement(
      'CREATE INDEX IF NOT EXISTS idx_estpag_estadia ON estadia_pagamentos(estadia_id)',
    );
    await m.database.customStatement(
      'CREATE INDEX IF NOT EXISTS idx_tickets_estadia ON tickets(estadia_id)',
    );
  }

  /// Índices da tabela de mensalidades (usados no onCreate e no onUpgrade v2).
  Future<void> _criarIndicesMensalidade(Migrator m) async {
    await m.database.customStatement(
      'CREATE INDEX IF NOT EXISTS idx_menspag_cliente ON mensalidade_pagamentos(cliente_id, competencia)',
    );
    await m.database.customStatement(
      'CREATE INDEX IF NOT EXISTS idx_menspag_sync ON mensalidade_pagamentos(sync_status)',
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
