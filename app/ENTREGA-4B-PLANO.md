# Entrega 4b — Mensalistas no app Flutter (plano de execução)

> Design já resolvido (exploração feita). Escopo: `app/` + `api/`. **NÃO tocar em `web/`.**
> Retomar com: "execute o Bloco 1 do pacote" — ir direto ao código, sem re-explorar.

## Regras cirúrgicas (as mais importantes do pacote)
- NÃO alterar as 3 estratégias de sync existentes (ticket, caixa_sessao, caixa_movimento),
  nem envelope, backoff, classificação de erros, motor de tarifa.
- `mensalidade_pagamento` entra como **4ª entidade**, estratégia IDÊNTICA ao `caixa_movimento`:
  create-only, servidor faz `upsert(row,{onConflict:'id',ignoreDuplicates:true})` (re-envio = no-op).
- Payload: `pago_em` em **epoch-ms**; `competencia` em **'YYYY-MM-01'**; **SEM operacao_id**
  (o envelope leva patio_id+tenant_id). Colunas Drift internas `operacaoId` = valor patio_id.
- Idempotência local: sync_log + flag da entidade na MESMA transação Drift.
- CHECK caixa_movimentos: tipo IN ('entrada','sangria','isencao'). Mensalidade recebida = 'entrada'
  (NUNCA 'receita').
- Zero `any`/analyze sujo. Migration Supabase já existe (db/12) — nada de migration nova no banco.

## 1A — api/src/routes/sync.ts (novo case, mirror de caixa_movimento)
Adicionar ao `switch (entidade)`:
```ts
case 'mensalidade_pagamento': {
  const row = compact({
    id: entidadeId,
    patio_id: patioId,
    tenant_id: tenantId,
    cliente_id: str(payload.cliente_id),
    plano_id: str(payload.plano_id),
    competencia: str(payload.competencia),          // 'YYYY-MM-01'
    valor: num(payload.valor) ?? 0,
    forma_pagamento: str(payload.forma_pagamento),
    pago_em: toIso(payload.pago_em) ?? agora,        // epoch-ms → iso
    origem: str(payload.origem) ?? 'app',
    registrado_por: str(payload.registrado_por) ?? operador.sub,
    registrado_por_nome: str(payload.registrado_por_nome),
    caixa_sessao_id: str(payload.caixa_sessao_id),
    caixa_movimento_id: str(payload.caixa_movimento_id),
    observacao: str(payload.observacao),
    sincronizado_em: agora,
  });
  // Imutável (create-only): re-envio é no-op.
  const res = await db
    .from('mensalidade_pagamentos')
    .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
  if (res.error) throw res.error;
  break;
}
```
**Não tocar** nos outros cases. Gate: `npm run typecheck`.

## 1B — api/src/routes/bootstrap.ts (planos.valor aditivo)
- `db.from('planos').select('id, nome, tipo')` → `'id, nome, tipo, valor'`.
- No `planosById`/`clientesOut`, o objeto `plano` passa a incluir `valor`. Resto intocado.

## 1C — app/ camada de dados
### Nova tabela — lib/database/tables/mensalidade_pagamentos_table.dart
```dart
import 'package:drift/drift.dart';

class MensalidadePagamentos extends Table {
  TextColumn get id => text()();
  TextColumn get operacaoId => text()();          // VALOR = patio_id
  TextColumn get clienteId => text()();
  TextColumn get clienteNome => text()();         // desnormalizado p/ histórico local
  TextColumn get planoId => text().nullable()();
  TextColumn get competencia => text()();         // 'YYYY-MM-01'
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
```
### Coluna nova em PatioClientes (patio_clientes_table.dart)
`RealColumn get planoValor => real().nullable()();`

### app_database.dart
- Importar a tabela; registrar `MensalidadePagamentos` em `tables:` e `MensalidadePagamentosDao` em `daos:`.
- `int get schemaVersion => 2;`
- `migration`: manter `onCreate` (createAll + _criarIndices) e ADICIONAR:
```dart
onUpgrade: (m, from, to) async {
  if (from < 2) {
    await m.createTable(mensalidadePagamentos);
    await m.addColumn(patioClientes, patioClientes.planoValor);
  }
},
```
- Em `_criarIndices` acrescentar (idempotente):
  `CREATE INDEX IF NOT EXISTS idx_menspag_cliente ON mensalidade_pagamentos(cliente_id, competencia)`
  `CREATE INDEX IF NOT EXISTS idx_menspag_sync ON mensalidade_pagamentos(sync_status)`
  (na v2, criar esses índices dentro do onUpgrade também, após createTable).
- **Rodar codegen:** `C:/src/flutter/bin/flutter.bat pub run build_runner build --delete-conflicting-outputs`

### DAO — lib/database/daos/mensalidade_pagamentos_dao.dart
`part of '../app_database.dart';` + `@DriftAccessor(tables:[MensalidadePagamentos])`. Métodos:
- `inserir(MensalidadePagamentosCompanion)`
- `getByCliente(String clienteId)` → order competencia desc, pagoEmEpoch desc
- `Future<int> countByClienteCompetencia(String clienteId, String competencia)`
- `getPendentesSync()` → syncStatus == 'pendente'
- `marcarSincronizado(String id)` → syncStatus 'sincronizado'
Registrar `part 'daos/mensalidade_pagamentos_dao.dart';` no app_database.dart.

### bootstrap_repository.dart (gravar planoValor)
No `PatioClientesCompanion`, adicionar:
`planoValor: Value((plano?['valor'] as num?)?.toDouble())`

### sync_engine.dart (_marcarEntidadeSincronizada)
Adicionar:
```dart
case 'mensalidade_pagamento':
  await db.mensalidadePagamentosDao.marcarSincronizado(entidadeId);
```
(NÃO mexer em mais nada do engine.)

### Repositório — lib/features/mensalistas/data/mensalidade_repository.dart
`registrarPagamento({patioId, clienteId, clienteNome, planoId?, competencia, valor,
formaPagamento, caixaSessaoId, operadorId, operadorNome, observacao?})` — numa transação:
```dart
final pagamentoId = const Uuid().v4();
final movimentoId = const Uuid().v4();
final agora = DateTime.now().millisecondsSinceEpoch;

final pagamentoPayload = jsonEncode({
  'id': pagamentoId, 'cliente_id': clienteId, 'plano_id': planoId,
  'competencia': competencia, 'valor': valor, 'forma_pagamento': formaPagamento,
  'pago_em': agora, 'origem': 'app', 'registrado_por': operadorId,
  'registrado_por_nome': operadorNome, 'caixa_sessao_id': caixaSessaoId,
  'caixa_movimento_id': movimentoId, 'observacao': observacao,
});
final movimentoPayload = jsonEncode({
  'id': movimentoId, 'caixa_sessao_id': caixaSessaoId, 'tipo': 'entrada',
  'valor': valor, 'descricao': 'Mensalidade — $clienteNome',
  'forma_pagamento': formaPagamento, 'criado_em': agora,
});

await db.transaction(() async {
  await db.mensalidadePagamentosDao.inserir(MensalidadePagamentosCompanion(
    id: Value(pagamentoId), operacaoId: Value(patioId), clienteId: Value(clienteId),
    clienteNome: Value(clienteNome), planoId: Value(planoId),
    competencia: Value(competencia), valor: Value(valor),
    formaPagamento: Value(formaPagamento), pagoEmEpoch: Value(agora),
    origem: const Value('app'), registradoPor: Value(operadorId),
    caixaSessaoId: Value(caixaSessaoId), caixaMovimentoId: Value(movimentoId),
    observacao: Value(observacao), syncStatus: const Value('pendente'),
    criadoEm: Value(agora),
  ));
  await db.caixaDao.inserirMovimento(CaixaMovimentosCompanion(
    id: Value(movimentoId), caixaSessaoId: Value(caixaSessaoId),
    tipo: const Value('entrada'), valor: Value(valor),
    descricao: Value('Mensalidade — $clienteNome'),
    formaPagamento: Value(formaPagamento), criadoEm: Value(agora),
    syncStatus: const Value('pendente'),
  ));
  final row = await db.caixaDao.getSessaoById(caixaSessaoId);
  if (row != null) {
    await db.caixaDao.atualizarSessao(caixaSessaoId, CaixaSessoesCompanion(
      totalEntradas: Value(row.totalEntradas + valor),
      syncStatus: const Value('pendente'),
    ));
  }
  await db.syncDao.enqueue(SyncLogCompanion(
    entidade: const Value('mensalidade_pagamento'), entidadeId: Value(pagamentoId),
    operacao: const Value('create'), payload: Value(pagamentoPayload),
    criadoEm: Value(agora),
  ));
  await db.syncDao.enqueue(SyncLogCompanion(
    entidade: const Value('caixa_movimento'), entidadeId: Value(movimentoId),
    operacao: const Value('create'), payload: Value(movimentoPayload),
    criadoEm: Value(agora),
  ));
});
```

## 1C — app/ UI
- Provider: `mensalidadeRepositoryProvider = Provider((ref) => MensalidadeRepository(db: ref.read(appDatabaseProvider)))`.
- Rota: `Routes.mensalistas = '/mensalistas'` em app_router.dart + `GoRoute`.
- Home (home_screen.dart): adicionar uma ação "Mensalistas" (ícone `Icons.badge_outlined`),
  navegando `context.push(Routes.mensalistas)`. Seguir o padrão visual de `_acao`/cards.
- Tela `MensalistasScreen` (ConsumerStatefulWidget):
  - Lista clientes do pátio via `clientesDao` (adicionar método `getClientes(operacaoId)` se preciso).
  - Busca por nome/placa (placa via `patioClientePlacas`).
  - Badge por cliente (a partir do Drift): EM DIA se há pagamento na competência corrente
    (`countByClienteCompetencia`>0); senão VENCE EM X DIAS (dia de `vencimentoEpoch`, fallback 10)
    ou ATRASADO; `planoTipo=='credenciado'` → badge neutro "Credenciado" (sem status financeiro).
  - Tap no cliente → histórico local (`getByCliente`, competência desc) + botão "Registrar pagamento".
  - "Registrar pagamento" EXIGE caixa aberto: ler `caixaSessaoNotifierProvider`; se null →
    SnackBar + direciona `context.push(Routes.caixa)`. Com caixa → modal:
    competência (default mês corrente → grava dia 1 'YYYY-MM-01'), valor pré-preenchido de
    `planoValor` (editável), forma de pagamento (mesmas opções da cobrança de ticket),
    observação. Se `countByClienteCompetencia>0` → avisar duplicidade mas PERMITIR (B2).
  - Ao confirmar: `mensalidadeRepositoryProvider.registrarPagamento(...)` + `syncEngine.drain()`
    em microtask (como o caixa_provider faz).

## 1D — testes (flutter test)
Reusar `test/support/fakes.dart` (seedTicket, fakeDio, MemSecureStorage). Adicionar helper de caixa aberto.
1. Registrar com caixa aberto → cria mensalidade_pagamento + caixa_movimento amarrados
   (caixaMovimentoId == movimento.id) na mesma transação, e 2 itens de outbox
   (`entidade` 'mensalidade_pagamento' e 'caixa_movimento').
2. Sync da 4ª entidade: enfileirar item `mensalidade_pagamento`, fakeDio responde `{ok:true}`,
   `drain()` → sync_log 'sincronizado' + flag do pagamento 'sincronizado' (mesma transação);
   conferir envelope enviado (epoch-ms em pago_em, sem operacao_id) capturando o RequestOptions.
3. Sem caixa aberto → o fluxo de registro é bloqueado (testar a regra no repo/serviço, ou
   garantir que a UI não chama registrarPagamento sem sessão — testar no ponto de decisão).
4. Suíte antiga 100% verde SEM alterar testes antigos.

## Gate do Bloco 1
`flutter analyze` limpo + `flutter test` todo verde + `npm run typecheck` (api) ok.
Imprimir diff resumido de sync.ts e do sync engine. Commit único (da raiz):
`Entrega 4b: mensalistas no app + 4a entidade de sync`.
