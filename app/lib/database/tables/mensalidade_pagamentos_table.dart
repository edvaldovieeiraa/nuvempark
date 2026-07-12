import 'package:drift/drift.dart';

/// Pagamentos de mensalidade registrados pelo OPERADOR no app (offline-first).
/// 4ª entidade de sync (estratégia create-only, igual caixa_movimento).
/// `operacaoId` mantém o nome de coluna do leve-patio — o VALOR é o patio_id.
class MensalidadePagamentos extends Table {
  TextColumn get id => text()(); // uuid client-gen
  TextColumn get operacaoId => text()(); // VALOR = patio_id
  TextColumn get clienteId => text()();
  TextColumn get clienteNome => text()(); // desnormalizado p/ histórico local
  TextColumn get planoId => text().nullable()();
  TextColumn get competencia => text()(); // 'YYYY-MM-01'
  RealColumn get valor => real()();
  TextColumn get formaPagamento => text().nullable()();
  IntColumn get pagoEmEpoch => integer()();
  TextColumn get origem => text().withDefault(const Constant('app'))();
  TextColumn get registradoPor => text().nullable()();
  TextColumn get caixaSessaoId => text().nullable()();
  TextColumn get caixaMovimentoId => text().nullable()();
  TextColumn get observacao => text().nullable()();
  TextColumn get syncStatus => text().withDefault(const Constant('pendente'))();
  IntColumn get criadoEm => integer()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}
