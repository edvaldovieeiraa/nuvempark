import 'package:drift/drift.dart';

class Tickets extends Table {
  TextColumn get id => text()();
  TextColumn get operacaoId => text()();
  TextColumn get placa => text()();
  TextColumn get tipoVeiculo => text()();
  IntColumn get entradaEpoch => integer()();
  IntColumn get saidaEpoch => integer().nullable()();
  RealColumn get valorCalculado => real().nullable()();
  RealColumn get valorCobrado => real().nullable()();
  TextColumn get formaPagamento => text().nullable()();
  TextColumn get motivoIsencao => text().nullable()();
  // 'aberto' | 'fechado' | 'cancelado'
  TextColumn get status => text().withDefault(const Constant('aberto'))();
  TextColumn get operadorId => text()();
  TextColumn get caixaSessaoId => text().nullable()();
  TextColumn get tabelaPrecoId => text().nullable()();
  // Livre passagem: vínculo com cliente/plano. origem 'avulso' | 'plano'
  TextColumn get clienteId => text().nullable()();
  TextColumn get planoId => text().nullable()();
  TextColumn get origem => text().withDefault(const Constant('avulso'))();
  // Transação de cartão/PIX. Nulos em dinheiro/plano/isenção.
  // cardPan corresponde a card_pan no backend (chave do payload: 'pan').
  TextColumn get atk => text().nullable()();
  TextColumn get itk => text().nullable()();
  TextColumn get authorizationCode => text().nullable()();
  TextColumn get brand => text().nullable()();
  TextColumn get cardPan => text().nullable()();
  IntColumn get installments => integer().nullable()();
  TextColumn get paymentProcessor => text().nullable()();
  // Foto da entrada (feature foto + OCR de placa).
  TextColumn get fotoEntradaPath => text().nullable()();
  BoolColumn get fotoEntradaEnviada => boolean().withDefault(const Constant(false))();
  TextColumn get syncStatus => text().withDefault(const Constant('pendente'))();
  IntColumn get criadoEm => integer()();
  IntColumn get atualizadoEm => integer()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}
