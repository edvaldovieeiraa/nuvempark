import 'package:drift/drift.dart';

/// Fila durável das fotos a enviar — de entrada e de avaria.
///
/// Antes as fotos de entrada subiam dentro do `SyncEngine.drain()` (segurando
/// a trava dos dados) e as de avaria subiam em memória, sem nada gravado: com
/// o app fechado ou sem sinal, a de avaria se perdia. Aqui toda foto nasce na
/// mesma transação do registro e só sai do estado `pendente` com a resposta do
/// servidor (spec fila-fotos-sync).
///
/// O id é determinístico — `entrada-<ticketId>` ou
/// `avaria-<avariaId>-<indice>` — para enfileirar duas vezes não duplicar e o
/// backfill da migração ser SQL puro.
@DataClassName('FotoEnvio')
class FotosEnvio extends Table {
  TextColumn get id => text()();
  TextColumn get tipo => text()(); // 'entrada' | 'avaria'
  TextColumn get operacaoId => text()(); // VALOR = patio_id
  TextColumn get ticketId => text()(); // avaria: o ticket dela (limpeza)
  TextColumn get avariaId => text().nullable()();
  IntColumn get indice => integer().nullable()();
  TextColumn get caminhoLocal => text()();
  // 0 = ainda não medido (backfill da migração); o uploader preenche.
  IntColumn get bytes => integer().withDefault(const Constant(0))();
  // 'pendente' | 'enviada' | 'falhou' | 'descartada'
  TextColumn get status => text().withDefault(const Constant('pendente'))();
  IntColumn get tentativas => integer().withDefault(const Constant(0))();
  IntColumn get proximaTentativaEpoch =>
      integer().withDefault(const Constant(0))();
  TextColumn get erro => text().nullable()(); // texto para gente
  // 'sem_arquivo' | 'http_permanente' | 'tentativas' — o reenvio filtra por
  // aqui, nunca pelo texto.
  TextColumn get erroCodigo => text().nullable()();
  IntColumn get criadoEm => integer()();
  IntColumn get enviadoEmEpoch => integer().nullable()();
  IntColumn get arquivoApagadoEmEpoch => integer().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}
