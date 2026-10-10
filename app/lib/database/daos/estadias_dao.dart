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

  Future<List<Estadia>> porIds(Iterable<String> ids) {
    final lista = ids.toList();
    if (lista.isEmpty) return Future.value(const []);
    return (select(estadias)..where((e) => e.id.isIn(lista))).get();
  }

  Future<void> inserirPagamento(EstadiaPagamentosCompanion p) =>
      into(estadiaPagamentos).insert(p);

  Future<List<EstadiaPagamento>> pagamentosDa(String estadiaId) =>
      (select(estadiaPagamentos)
            ..where((p) => p.estadiaId.equals(estadiaId))
            ..orderBy([(p) => OrderingTerm.asc(p.pagoEmEpoch)]))
          .get();

  /// Estadias com escrita local ainda não enviada — a própria estadia ou um
  /// pagamento dela: a cópia do servidor é mais velha e não pode sobrescrevê-la.
  Future<Set<String>> idsComEscritaPendente() async {
    final pagamentos = selectOnly(estadiaPagamentos, distinct: true)
      ..addColumns([estadiaPagamentos.estadiaId])
      ..where(estadiaPagamentos.syncStatus.equals('pendente'));
    final proprias = selectOnly(estadias)
      ..addColumns([estadias.id])
      ..where(estadias.syncStatus.equals('pendente'));
    return {
      for (final r in await pagamentos.get()) r.read(estadiaPagamentos.estadiaId)!,
      for (final r in await proprias.get()) r.read(estadias.id)!,
    };
  }

  /// Grava a estadia do servidor. Já existindo, atualiza só o que a renovação
  /// muda (vencimento, diárias, total). Devolve true se algo mudou.
  Future<bool> aplicarDoServidor(EstadiasCompanion e) async {
    final atual = await getEstadia(e.id.value);
    if (atual == null) {
      await into(estadias).insert(e);
      return true;
    }
    if (atual.validaAteEpoch == e.validaAteEpoch.value &&
        atual.diarias == e.diarias.value &&
        atual.valorTotal == e.valorTotal.value &&
        atual.syncStatus == 'sincronizado') {
      return false;
    }
    await atualizarEstadia(
      atual.id,
      EstadiasCompanion(
        validaAteEpoch: e.validaAteEpoch,
        diarias: e.diarias,
        valorTotal: e.valorTotal,
        syncStatus: const Value('sincronizado'),
      ),
    );
    return true;
  }

  /// Pagamento do servidor; se já existe aqui, nada. Devolve true se inseriu.
  /// (Não dá para usar o retorno do insertOrIgnore: quando ignora, o SQLite
  /// devolve o rowid do insert ANTERIOR.)
  Future<bool> inserirPagamentoSeAusente(EstadiaPagamentosCompanion p) async {
    final existe = await (select(estadiaPagamentos)
          ..where((x) => x.id.equals(p.id.value)))
        .getSingleOrNull();
    if (existe != null) return false;
    await into(estadiaPagamentos).insert(p);
    return true;
  }

  Future<void> marcarEstadiaSincronizada(String id) =>
      (update(estadias)..where((e) => e.id.equals(id)))
          .write(const EstadiasCompanion(syncStatus: Value('sincronizado')));

  Future<void> marcarPagamentoSincronizado(String id) =>
      (update(estadiaPagamentos)..where((p) => p.id.equals(id)))
          .write(const EstadiaPagamentosCompanion(syncStatus: Value('sincronizado')));
}
