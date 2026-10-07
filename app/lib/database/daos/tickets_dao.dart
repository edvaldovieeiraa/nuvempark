part of '../app_database.dart';

@DriftAccessor(tables: [Tickets])
class TicketsDao extends DatabaseAccessor<AppDatabase> with _$TicketsDaoMixin {
  TicketsDao(super.db);

  Future<void> inserir(TicketsCompanion t) => into(tickets).insert(t);

  Future<Ticket?> getById(String id) =>
      (select(tickets)..where((t) => t.id.equals(id))).getSingleOrNull();

  Future<List<Ticket>> getAbertos(String operacaoId) =>
      (select(tickets)
            ..where(
              (t) => t.operacaoId.equals(operacaoId) & t.status.equals('aberto'),
            )
            ..orderBy([(t) => OrderingTerm.desc(t.entradaEpoch)]))
          .get();

  /// Todos os movimentos recentes do pátio (qualquer status) para o histórico
  /// no app. Limitado — o histórico completo vive no painel web.
  Future<List<Ticket>> getRecentes(String operacaoId, {int limit = 200}) =>
      (select(tickets)
            ..where((t) => t.operacaoId.equals(operacaoId))
            ..orderBy([(t) => OrderingTerm.desc(t.entradaEpoch)])
            ..limit(limit))
          .get();

  Future<Ticket?> getAbertoByPlaca(String operacaoId, String placa) =>
      (select(tickets)
            ..where(
              (t) =>
                  t.operacaoId.equals(operacaoId) &
                  t.placa.equals(placa) &
                  t.status.equals('aberto'),
            )
            // Pode haver mais de um aberto com a mesma placa (dados antigos) —
            // sem o limit, getSingleOrNull lança "Too many elements".
            ..orderBy([(t) => OrderingTerm.desc(t.entradaEpoch)])
            ..limit(1))
          .getSingleOrNull();

  Future<void> atualizar(String id, TicketsCompanion c) =>
      (update(tickets)..where((t) => t.id.equals(id))).write(c);

  /// Fecho CONDICIONAL e atômico: aplica [c] só se o ticket ainda estiver
  /// 'aberto'. Retorna quantas linhas mudaram — 1 = este chamador efetuou a
  /// saída; 0 = já estava fechado (ou não existe). É a barreira que impede
  /// saída/pagamento em duplicidade sob duplo-toque ou concorrência: o SQLite
  /// serializa a escrita, então só um chamador vê a linha 'aberto'.
  Future<int> fecharSeAberto(String id, TicketsCompanion c) =>
      (update(tickets)
            ..where((t) => t.id.equals(id) & t.status.equals('aberto')))
          .write(c);

  /// Quantos veículos do cliente estão no pátio agora (tickets abertos).
  Future<int> contarAbertosPorCliente(
    String operacaoId,
    String clienteId,
  ) async {
    final rows = await (select(tickets)
          ..where((t) =>
              t.operacaoId.equals(operacaoId) &
              t.clienteId.equals(clienteId) &
              t.status.equals('aberto')))
        .get();
    return rows.length;
  }

  Future<List<Ticket>> getPendentesSync() =>
      (select(tickets)..where((t) => t.syncStatus.equals('pendente'))).get();

  Future<void> marcarSincronizado(String id) =>
      (update(tickets)..where((t) => t.id.equals(id)))
          .write(const TicketsCompanion(syncStatus: Value('sincronizado')));

  /// Tickets já sincronizados com foto local ainda não enviada.
  Future<List<Ticket>> getFotosPendentes() =>
      (select(tickets)
            ..where((t) =>
                t.fotoEntradaPath.isNotNull() &
                t.fotoEntradaEnviada.equals(false) &
                t.syncStatus.equals('sincronizado')))
          .get();

  Future<void> marcarFotoEnviada(String id) =>
      (update(tickets)..where((t) => t.id.equals(id)))
          .write(const TicketsCompanion(fotoEntradaEnviada: Value(true)));

  /// Grava o ticket que veio do servidor só se ele ainda não existe aqui. Se
  /// existe, a cópia local manda: pode ter uma saída ainda não enviada.
  Future<void> inserirSeAusente(TicketsCompanion t) =>
      into(tickets).insert(t, mode: InsertMode.insertOrIgnore);

  /// Quais destes ids já existem aqui (qualquer status).
  Future<Set<String>> idsExistentes(List<String> ids) async {
    if (ids.isEmpty) return {};
    final query = selectOnly(tickets)
      ..addColumns([tickets.id])
      ..where(tickets.id.isIn(ids));
    return {for (final r in await query.get()) r.read(tickets.id)!};
  }

  /// Abertos deste pátio que o servidor já conhece e que podem ser apagados sem
  /// perder nada: nenhuma escrita pendente e nenhuma foto por enviar.
  Future<List<Ticket>> getAbertosSincronizados(String operacaoId) =>
      (select(tickets)
            ..where((t) =>
                t.operacaoId.equals(operacaoId) &
                t.status.equals('aberto') &
                t.syncStatus.equals('sincronizado') &
                (t.fotoEntradaPath.isNull() |
                    t.fotoEntradaEnviada.equals(true))))
          .get();

  /// Remove um ticket local — usado na convergência da Limpeza de Pátio
  /// (bootstrap ou resposta 'ignorado' do sync). A foto pendente daquele ticket
  /// deixa de existir junto (getFotosPendentes lê a própria tabela de tickets).
  Future<void> deletar(String id) =>
      (delete(tickets)..where((t) => t.id.equals(id))).go();
}
