part of '../app_database.dart';

@DriftAccessor(tables: [Estadias, EstadiaPagamentos])
class EstadiasDao extends DatabaseAccessor<AppDatabase> with _$EstadiasDaoMixin {
  EstadiasDao(super.db);

  Future<void> inserirEstadia(EstadiasCompanion e) => into(estadias).insert(e);

  Future<Estadia?> getEstadia(String id) =>
      (select(estadias)..where((e) => e.id.equals(id))).getSingleOrNull();

  Future<void> atualizarEstadia(String id, EstadiasCompanion c) =>
      (update(estadias)..where((e) => e.id.equals(id))).write(c);

  /// A estadia mais recente da placa no pátio (a de maior vencimento) — é ela
  /// que decide se o carro entra como hóspede.
  Future<Estadia?> ultimaPorPlaca(String operacaoId, String placa) =>
      (select(estadias)
            ..where((e) => e.operacaoId.equals(operacaoId) & e.placa.equals(placa))
            ..orderBy([(e) => OrderingTerm.desc(e.validaAteEpoch)])
            ..limit(1))
          .getSingleOrNull();

  /// Estadias do pátio que vencem a partir de [desdeEpoch] (válidas + janela
  /// de vencidas), mais recentes primeiro.
  Future<List<Estadia>> doPatioDesde(String operacaoId, int desdeEpoch) =>
      (select(estadias)
            ..where((e) =>
                e.operacaoId.equals(operacaoId) &
                e.validaAteEpoch.isBiggerOrEqualValue(desdeEpoch))
            ..orderBy([(e) => OrderingTerm.desc(e.validaAteEpoch)]))
          .get();

  Future<void> inserirPagamento(EstadiaPagamentosCompanion p) =>
      into(estadiaPagamentos).insert(p);

  Future<List<EstadiaPagamento>> pagamentosDa(String estadiaId) =>
      (select(estadiaPagamentos)
            ..where((p) => p.estadiaId.equals(estadiaId))
            ..orderBy([(p) => OrderingTerm.asc(p.pagoEmEpoch)]))
          .get();

  Future<void> marcarEstadiaSincronizada(String id) =>
      (update(estadias)..where((e) => e.id.equals(id)))
          .write(const EstadiasCompanion(syncStatus: Value('sincronizado')));

  Future<void> marcarPagamentoSincronizado(String id) =>
      (update(estadiaPagamentos)..where((p) => p.id.equals(id)))
          .write(const EstadiaPagamentosCompanion(syncStatus: Value('sincronizado')));
}
