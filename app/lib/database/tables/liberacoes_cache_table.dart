import 'package:drift/drift.dart';

/// Cópia local das liberações de voucher ativas do pátio.
///
/// Baixada no bootstrap (que roda a cada 30s no `sync_loop`), junto dos
/// cadastros. Serve a UM caso: a saída OFFLINE.
///
/// Com rede, a saída consulta `GET /tickets/:id/liberacao`, que é a fonte
/// fresca — pega a liberação que o lojista fez há dez segundos, e nenhuma
/// cópia local pegaria essa. Sem rede, a regra do produto é cobrar cheio; esta
/// tabela é o que evita cobrar cheio de quem JÁ tinha voucher no último sync.
///
/// Só carrega o que o cálculo precisa: os três números da regra e os nomes
/// para a tela. Nada de valor, cliente ou dados do parceiro além do nome.
class LiberacoesCache extends Table {
  /// Chave: um ticket tem no máximo uma liberação ativa (índice único parcial
  /// em db/31 garante isso do lado do servidor).
  TextColumn get ticketId => text()();
  TextColumn get operacaoId => text()();
  TextColumn get parceiroNome => text()();
  TextColumn get regraNome => text()();
  IntColumn get abaterMinutos => integer().withDefault(const Constant(0))();
  IntColumn get descontoPercentual => integer().withDefault(const Constant(0))();
  RealColumn get descontoValor => real().withDefault(const Constant(0))();
  IntColumn get liberadoEmEpoch => integer()();

  @override
  Set<Column<Object>> get primaryKey => {ticketId};
}
