---
goal: Módulo Vouchers — liberação de tickets por parceiros externos, com regras genéricas, cota e faturamento
version: 1.0
date_created: 2026-08-09
last_updated: 2026-08-09
owner: NuvemPark
status: 'Planned'
tags: [feature, app, web, api, database, faturamento]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

O lojista vizinho ao estacionamento libera o ticket do cliente dele pelo próprio acesso, e o operador vê essa liberação na saída. O pátio cadastra as regras de desconto, quem pode usá-las e quanto cada parceiro pode gastar; no fim do mês, cobra de quem é faturado.

Escopo decidido em brainstorm (abordagem B — módulo completo, com faturamento desde o início). Este plano é a tradução direta daquelas decisões, ancorada nos padrões que já existem no repositório: migrações idempotentes em `db/NN-nome.sql` com RLS por `public.current_tenant_id()`, rotas Fastify em `api/src/routes/*.ts` montadas em `api/src/server.ts`, páginas de painel como `page.tsx` + `actions.ts`, e app Flutter offline-first com Drift + Riverpod.

A decisão de arquitetura que sustenta o custo baixo: **o `TarifaEngine` não muda e o sync engine não muda.** O desconto é uma transformação aplicada antes e depois do motor existente, e a liberação chega ao app por uma consulta pontual no momento do scan.

## 1. Requirements & Constraints

### Funcionais

- **REQ-001**: O pátio mantém um catálogo de regras de voucher, análogo às tabelas de preço. Cada regra é definida por três números: `abater_minutos` (int, ≥ 0), `desconto_percentual` (int, 0–100) e `desconto_valor` (numeric, ≥ 0).
- **REQ-002**: Os quatro casos de negócio declarados são expressos sem código novo: isenção de 2h = `abater_minutos=120`; 12h = `720`; 24h = `1440`; isenção total = `desconto_percentual=100`.
- **REQ-003**: O pátio cadastra parceiros. Cada parceiro tem `modo_custo` ∈ {`cortesia`, `faturado`}, `limite_quantidade` (int, nulo = ilimitado) e `limite_periodo` ∈ {`mes`, `total`}.
- **REQ-004**: Cada parceiro recebe acesso a um subconjunto do catálogo de regras. Um parceiro sem regras associadas não consegue liberar nada.
- **REQ-005**: Usuários do parceiro entram com e-mail e senha. Um parceiro pode ter mais de um usuário; toda liberação registra qual usuário a fez.
- **REQ-006**: O usuário do parceiro encontra o ticket de duas formas: busca por placa e leitura do QR do cupom pela câmera do próprio aparelho. As duas resolvem para o mesmo ticket e disparam a mesma ação.
- **REQ-007**: A liberação é recusada quando a cota do parceiro está esgotada, quando a regra não pertence ao parceiro, quando o ticket já está fechado ou quando já existe liberação ativa para aquele ticket.
- **REQ-008**: Na saída, o app consulta `GET /tickets/:id/liberacao` no momento do scan. Havendo liberação, o app aplica o desconto e exibe a origem (parceiro e regra) antes de o operador confirmar.
- **REQ-009**: Não conseguindo confirmar (offline, timeout, erro), o app **cobra a tarifa normal**. O operador não recebe nenhuma opção de liberar manualmente.
- **REQ-010**: No caso do REQ-009 o app precisa **exibir** que não conseguiu confirmar, antes da confirmação da saída. Cobrar em silêncio é violação de requisito.
- **REQ-011**: O painel lista tickets cobrados apesar de existir liberação registrada, para o gestor resolver caso a caso.
- **REQ-012**: O painel fecha competência mensal por parceiro faturado e exporta o extrato em CSV.
- **REQ-013**: O site institucional passa a apresentar a funcionalidade.

### Segurança

- **SEC-001**: O usuário do parceiro enxerga exclusivamente tickets do pátio ao qual o parceiro pertence, e apenas os campos necessários à liberação: identificador, placa, hora de entrada e situação. Valor, histórico, dados do cliente e qualquer outro ticket ficam fora da resposta.
- **SEC-002**: RLS obrigatória nas quatro tabelas novas, escopada por `public.current_tenant_id()`, seguindo `db/17-faturas-rls-gestor.sql`.
- **SEC-003**: O usuário do parceiro não recebe policy de `UPDATE` nem `DELETE` em `liberacoes`. Cancelamento de liberação é ação de gestor.
- **SEC-004**: A busca por placa é limitada a 20 requisições por minuto por usuário de parceiro, para não virar oráculo de consulta de placas.
- **SEC-005**: O endpoint `GET /tickets/:id/liberacao` autentica pelo mesmo mecanismo de dispositivo já usado por `api/src/routes/bootstrap.ts`. Não é rota pública.
- **SEC-006**: A cota é verificada e consumida na mesma transação que insere a liberação, com trava por parceiro. Duas abas do lojista não podem furar o limite.

### Restrições

- **CON-001**: `app/lib/features/tarifa/domain/tarifa_engine.dart` não pode ser modificado. O desconto é aplicado em volta dele.
- **CON-002**: `app/lib/features/sync/data/sync_engine.dart` e `sync_loop.dart` não podem ganhar direção de descida. A liberação chega por consulta pontual.
- **CON-003**: `valor_abatido` só é conhecido na saída, quando existe hora de saída. É gravado pelo app junto do fechamento do ticket, pelo outbox existente, e não no instante da liberação.
- **CON-004**: O cálculo autoritativo do desconto é o do app, em Dart. Qualquer implementação em TypeScript é para exibição e relatório, jamais para gravar valor cobrado.
- **CON-005**: Migrações são idempotentes e numeradas a partir de `db/31-`, sem renumerar as existentes.
- **CON-006**: TypeScript estrito, zero `any`. `npx tsc --noEmit` e `next build` passam limpos. No app, `flutter analyze` sem issues e a suíte verde.
- **CON-007**: A liberação não tem prazo de validade nesta versão — decisão explícita do brainstorm. Ver RISK-001.

### Guias e padrões

- **GUD-001**: Nomes de domínio em português, como no resto do repositório (`liberacoes`, `parceiros`, `abater_minutos`).
- **GUD-002**: Comentário de cabeçalho em cada migração explicando o porquê, no formato de `db/17-faturas-rls-gestor.sql`, incluindo o bloco de VALIDAÇÃO.
- **GUD-003**: Toda decisão não óbvia recebe comentário explicando a razão, não o efeito — o padrão do repositório.
- **PAT-001**: Página de painel = `web/src/app/painel/<area>/page.tsx` + `actions.ts`, como `web/src/app/painel/tarifas/`.
- **PAT-002**: Rota de API = `api/src/routes/<nome>.ts` exportando `<nome>Routes`, montada em `api/src/server.ts`.
- **PAT-003**: Motor de cálculo = classe `abstract final` com métodos estáticos puros, sem I/O, como `TarifaEngine`.
- **PAT-004**: Tabela Drift em `app/lib/database/tables/`, DAO em `app/lib/database/daos/`.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Esquema de banco, RLS e autenticação de parceiro, de forma que todo o resto tenha onde se apoiar.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Criar `db/31-vouchers-schema.sql`: tabelas `voucher_regras` (id uuid pk, tenant_id, patio_id, nome text, abater_minutos int not null default 0, desconto_percentual int not null default 0 check between 0 and 100, desconto_valor numeric(10,2) not null default 0, ativo bool default true, criado_em timestamptz), `parceiros` (id, tenant_id, patio_id, nome, documento text null, modo_custo text check in ('cortesia','faturado'), limite_quantidade int null, limite_periodo text check in ('mes','total'), ativo bool, criado_em), `parceiro_regras` (parceiro_id, regra_id, pk composta) e `liberacoes` (id, tenant_id, patio_id, ticket_id, parceiro_id, regra_id, usuario_parceiro_id, liberado_em timestamptz, cancelada_em timestamptz null, valor_abatido numeric(10,2) null, competencia text null). Índice único parcial em `liberacoes(ticket_id) where cancelada_em is null` — é ele que garante REQ-007 no banco, e não só no código. | ✅ | 2026-08-10 |
| TASK-002 | Criar `db/32-vouchers-rls.sql`: habilitar RLS nas quatro tabelas; policies de SELECT/INSERT/UPDATE/DELETE para `authenticated` escopadas em `tenant_id = public.current_tenant_id()` para o gestor; e policies restritas para o papel de parceiro conforme SEC-001 e SEC-003. Incluir bloco de VALIDAÇÃO com as consultas que provam o isolamento entre tenants. | ✅ | 2026-08-10 |
| TASK-003 | Criar `db/33-vouchers-usuarios-parceiro.sql`: tabela `usuarios_parceiro` (id, parceiro_id, tenant_id, email citext unique, auth_user_id uuid referenciando `auth.users`, nome, ativo, criado_em) e função `public.current_parceiro_id()` no mesmo espírito de `public.current_tenant_id()`, para as policies do parceiro se apoiarem nela. | ✅ | 2026-08-10 |
| TASK-004 | Criar `db/34-vouchers-cota.sql`: função `public.liberar_ticket(p_ticket_id uuid, p_regra_id uuid)` que, numa única transação e com `select ... for update` na linha do parceiro, valida cota (REQ-007), valida que a regra pertence ao parceiro, valida que o ticket está aberto e insere em `liberacoes`. Retorna a linha inserida ou levanta exceção nomeada por motivo. É esta função que satisfaz SEC-006. | ✅ | 2026-08-10 |
| TASK-005 | Criar `db/35-vouchers-competencia.sql`: coluna `competencia` preenchida no fechamento (`YYYY-MM`), tabela `parceiro_competencias` (parceiro_id, competencia, fechada_em, total_liberacoes int, total_abatido numeric) e índice em `liberacoes(parceiro_id, competencia)`. | ✅ | 2026-08-10 |

#### Notas de execução da Fase 1 (2026-08-09)

Os cinco arquivos foram escritos. Três desvios em relação ao planejado, todos por descoberta no código:

1. **`tickets.id` é `text`, não `uuid`** (gerado no cliente — ver `db/01-schema.sql:262`, porque o app registra entradas offline). `liberacoes.ticket_id` foi criado como `text`. O plano dizia `uuid`; estaria errado.
2. **`usuarios_parceiro` migrou de `db/33` para `db/31`.** `liberacoes` a referencia; criar depois exigiria FK adiantada ou `alter table` existindo só para consertar ordem de arquivo. `db/33` passou a se chamar `33-vouchers-parceiro-acesso.sql` e concentra `current_parceiro_id()` e as policies do parceiro.
3. **Duas funções de busca não previstas** (`buscar_tickets_parceiro`, `obter_ticket_parceiro`). Motivo: a RLS de `tickets` é por `current_tenant_id()`, que é **NULL** para usuário de parceiro — ele não lê nenhum ticket direto. Isso transformou SEC-001 numa garantia estrutural: o sigilo passa a ser imposto pela assinatura da função, que não tem valor nem dados de cliente no tipo de retorno, em vez de depender de a aplicação lembrar de filtrar colunas. TASK-018 fica mais simples por consequência.

Extras que couberam sem aumentar escopo: `consumo_cota_parceiro()` (a tela "38 de 50"), `cancelar_liberacao()` e `previa_competencia()` (conferir antes de gravar algo irreversível).

**Estado:** nenhuma migração foi executada. Não há Postgres local, Docker nem Supabase CLI nesta máquina, então a sintaxe não está validada. As tarefas só serão marcadas como concluídas depois de rodarem limpas.

### Implementation Phase 2

- GOAL-002: Motor de desconto em Dart, puro e testado, provando os quatro casos declarados antes de existir qualquer tela.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Criar `app/lib/features/vouchers/domain/voucher_regra.dart` com a classe imutável `VoucherRegra` (`abaterMinutos`, `descontoPercentual`, `descontoValor`, `nome`) e `fromJson`. | ✅ | 2026-08-10 |
| TASK-007 | Criar `app/lib/features/vouchers/domain/voucher_engine.dart` como `abstract final class VoucherEngine` (PAT-003), com `static FareComVoucher aplicar({required DateTime entrada, required DateTime saida, required TarifaConfig tarifa, required VoucherRegra regra})`. Implementação exata: `entradaEfetiva = entrada.add(Duration(minutes: regra.abaterMinutos))`; se `entradaEfetiva.isAfter(saida)` então `entradaEfetiva = saida` (evita violar o `assert` de `TarifaEngine.calcular`); chamar `TarifaEngine.calcular` com a entrada efetiva; aplicar percentual e depois valor fixo; travar o piso em `0.0`. Não modificar `tarifa_engine.dart` (CON-001). | ✅ | 2026-08-10 |
| TASK-008 | Criar `app/lib/features/vouchers/domain/fare_com_voucher.dart`: `valorOriginal`, `valorFinal`, `valorAbatido` (= original − final), `regraNome`, `parceiroNome`, e o `FareResult` original para a tela continuar mostrando duração e motivo. | ✅ | 2026-08-10 |
| TASK-009 | Criar `app/test/features/vouchers/voucher_engine_test.dart` cobrindo: os quatro casos de REQ-002; abatimento maior que a estadia (não pode dar valor negativo nem estourar o assert); percentual e valor fixo combinados; regra neutra (todos os campos zerados) devolvendo exatamente o valor do `TarifaEngine`; e interação com teto de diária e pernoite. | ✅ | 2026-08-10 |
| TASK-010 | Criar `web/src/lib/vouchers/calculo.ts` espelhando o motor **apenas para exibição** (estimativa na tela do parceiro e valores de relatório), com comentário de cabeçalho declarando CON-004 — que este arquivo nunca decide valor cobrado. | ✅ | 2026-08-10 |

### Implementation Phase 3

- GOAL-003: O gestor consegue cadastrar regras e parceiros no painel.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Criar `web/src/app/painel/vouchers/regras/page.tsx` e `actions.ts` (PAT-001): listar, criar, editar e desativar regras. O formulário oferece atalhos ("2 horas", "12 horas", "24 horas", "isenção total") que apenas preenchem os três números — sem tipo especial no banco, para não reintroduzir o que REQ-001 removeu. | ✅ | 2026-08-10 |
| TASK-012 | Criar `web/src/app/painel/vouchers/parceiros/page.tsx` e `actions.ts`: CRUD de parceiro com `modo_custo`, `limite_quantidade`, `limite_periodo` e seleção múltipla das regras permitidas. | ✅ | 2026-08-10 |
| TASK-013 | Criar `web/src/app/painel/vouchers/parceiros/[id]/page.tsx`: detalhe do parceiro com usuários (convidar, desativar), consumo da cota no período corrente e últimas liberações. | ✅ | 2026-08-10 |
| TASK-014 | Criar a ação de convite de usuário de parceiro em `web/src/app/painel/vouchers/parceiros/[id]/actions.ts`: cria o usuário no Supabase Auth, insere em `usuarios_parceiro` e dispara e-mail pelo mecanismo já existente em `web/src/lib/email.ts`. | ✅ | 2026-08-10 |
| TASK-015 | Adicionar "Vouchers" à navegação do painel em `web/src/app/painel/layout.tsx`, com os dois subitens (Regras, Parceiros). | ✅ | 2026-08-10 |

### Implementation Phase 4

- GOAL-004: O usuário do parceiro entra, acha o ticket e libera.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | Criar `web/src/app/parceiro/login/page.tsx` e `actions.ts`: autenticação por e-mail e senha via `@supabase/ssr`, resolvendo o `parceiro_id` a partir de `usuarios_parceiro`. | ✅ | 2026-08-10 |
| TASK-017 | Estender `web/src/middleware.ts` para proteger `/parceiro/*`: sessão válida **e** vínculo ativo em `usuarios_parceiro`. Alterar somente o escopo de rotas e este gate; não tocar na lógica de `redicionaPorHost` nem nos gates de `/painel` e `/master`. | ✅ | 2026-08-10 |
| TASK-018 | Criar `web/src/app/parceiro/page.tsx`: campo de busca por placa (REQ-006) devolvendo apenas os campos de SEC-001, com o limite de SEC-004 aplicado na server action. | ✅ | 2026-08-10 |
| TASK-019 | Criar `web/src/app/parceiro/scan/page.tsx`: leitura do QR do cupom pela câmera via `BarcodeDetector` quando disponível, com queda para entrada manual do código onde o navegador não suportar. Resolve para o mesmo destino da busca por placa. | ✅ | 2026-08-10 |
| TASK-020 | Criar `web/src/app/parceiro/ticket/[id]/page.tsx` e `actions.ts`: mostra placa e hora de entrada, lista as regras permitidas ao parceiro, exibe a estimativa de desconto (TASK-010, marcada como estimativa) e chama `public.liberar_ticket` (TASK-004). Traduzir cada exceção nomeada da função em mensagem específica — cota esgotada, ticket fechado, já liberado. | ✅ | 2026-08-10 |
| TASK-021 | Criar `web/src/app/parceiro/historico/page.tsx`: liberações do próprio parceiro, com consumo de cota do período. | ✅ | 2026-08-10 |

### Implementation Phase 5

- GOAL-005: O operador vê a liberação na saída, e vê quando não foi possível confirmar.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-022 | Criar `api/src/routes/liberacao.ts` exportando `liberacaoRoutes` (PAT-002) com `GET /tickets/:id/liberacao`, autenticado como em `api/src/routes/bootstrap.ts` (SEC-005). Responde `{ liberacao: null }` ou `{ liberacao: { parceiroNome, regra: { abaterMinutos, descontoPercentual, descontoValor, nome }, liberadoEm } }`. Montar em `api/src/server.ts`. | ✅ | 2026-08-10 |
| TASK-023 | Criar `app/lib/features/vouchers/data/liberacao_service.dart`: consulta o endpoint com timeout curto (3s) e devolve `LiberacaoConsulta.encontrada` / `.ausente` / `.naoConfirmada`. Os três estados são explícitos de propósito: `.naoConfirmada` não pode ser confundido com `.ausente`, e é essa distinção que sustenta REQ-010. | ✅ | 2026-08-10 |
| TASK-024 | Integrar em `app/lib/features/tickets/presentation/saida_screen.dart`: consultar ao abrir a tela; em `.encontrada`, calcular com `VoucherEngine` e exibir a origem (parceiro e regra) junto do valor; em `.ausente`, seguir como hoje. | ✅ | 2026-08-10 |
| TASK-025 | Implementar o estado `.naoConfirmada` na mesma tela: cobra o valor cheio (REQ-009) e exibe aviso persistente — não um toast — de que não foi possível verificar liberações. Sem nenhum controle que permita ao operador aplicar desconto (REQ-009). | ✅ | 2026-08-10 |
| TASK-026 | Estender o fechamento da saída para enviar `liberacaoId` e `valorAbatido` no payload do outbox existente (CON-003), e a rota `api/src/routes/sync.ts` para gravá-los em `liberacoes`. Sem alterar envelope, retry ou estratégia do `sync_engine`. | ✅ | 2026-08-10 |
| TASK-027 | Criar `app/test/features/vouchers/liberacao_saida_test.dart`: `.encontrada` aplica o desconto; `.ausente` cobra normal; `.naoConfirmada` cobra normal **e** marca o aviso; timeout do serviço resolve para `.naoConfirmada` e nunca para `.ausente`. | ✅ | 2026-08-10 |

### Implementation Phase 6

- GOAL-006: O gestor enxerga divergências e fecha o mês de quem é faturado.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-028 | Criar `web/src/app/painel/vouchers/divergencias/page.tsx` (REQ-011): tickets com liberação ativa cujo fechamento gravou `valor_abatido` nulo ou zero — ou seja, a saída ocorreu sem a liberação ter sido aplicada. Ação de cancelar a liberação, devolvendo a cota ao parceiro. | ✅ | 2026-08-13 |
| TASK-029 | Criar `web/src/app/painel/vouchers/faturamento/page.tsx`: por competência, um bloco por parceiro `faturado` com contagem, total abatido e situação (aberta/fechada). Parceiros `cortesia` aparecem numa seção informativa, sem valor a cobrar. | ✅ | 2026-08-13 |
| TASK-030 | Implementar o fechamento de competência em `web/src/app/painel/vouchers/faturamento/actions.ts`: carimba `competencia` nas liberações do período, grava `parceiro_competencias` e impede novo fechamento do mesmo par (parceiro, competência). Operação idempotente. | ✅ | 2026-08-13 |
| TASK-031 | Implementar a exportação CSV do extrato por parceiro e competência (REQ-012), com uma linha por liberação: data, ticket, placa, regra, valor abatido. | ✅ | 2026-08-13 |
| TASK-032 | Adicionar o uso de vouchers aos relatórios existentes em `web/src/app/painel/relatorios/`, para o total abatido aparecer ao lado da receita. | ✅ | 2026-08-13 |

### Implementation Phase 7

- GOAL-007: A funcionalidade existe no site institucional.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-033 | Adicionar a solução ao catálogo em `web/src/lib/solucoes.ts`, seguindo a estrutura dos itens existentes. | ✅ | 2026-08-13 |
| TASK-034 | Adicionar a seção de vouchers à home em `web/src/components/site/secoes.tsx`, com `id` e `data-sec` para o scroll-spy do `site-header.tsx` continuar funcionando. | ✅ | 2026-08-13 |
| TASK-035 | Refletir a novidade no documento em Markdown para agentes, em `web/src/lib/agentes/paginas.ts` — as três listas espelhadas descritas ali continuam tendo de andar juntas. | ✅ | 2026-08-13 |

## 3. Alternatives

- **ALT-001**: Voucher como código avulso entregue ao cliente, aplicado pelo operador na saída. Funcionaria offline e dispensaria a consulta online. Descartado no brainstorm: exige o cliente carregar o código, e o lojista prefere resolver sem intermediar papel.
- **ALT-002**: Bloquear a saída quando não é possível confirmar liberação. Elimina o erro de cobrança, mas quebra a promessa central do app de operar sem internet — o banner diz ao operador "pode operar normal". Descartado.
- **ALT-003**: Deixar o operador liberar manualmente quando offline. Descartado por decisão explícita: abre porta de fraude ("liberei para o amigo e disse que estava offline"). A regra virou "desconto só existe se veio do parceiro, pelo sistema", que é auditável.
- **ALT-004**: Linguagem de regras (condições compostas, faixas de horário, dia da semana). Descartado: três números cobrem os quatro casos declarados e ainda percentual e abatimento fixo. A linguagem seria muito mais cara sem comprar nada hoje.
- **ALT-005**: Reaproveitar `patio_clientes` (mensalistas e credenciados) para representar parceiros. Descartado após inspeção: aquela tabela identifica cliente por placa, com plano e vencimento; parceiro não tem placa, tem login e cota. Seria forçar semântica.
- **ALT-006**: Adicionar direção de descida ao sync engine para as liberações chegarem sozinhas. Descartado: uma consulta pontual no scan resolve o mesmo problema sem mexer na peça mais delicada do app.
- **ALT-007**: Acesso do parceiro por link assinado, sem senha. Mais barato e melhor para balconista que troca com frequência, mas não rastreia qual pessoa liberou e não atende parceiro faturado com o mesmo rigor. Descartado na escolha da abordagem B.

## 4. Dependencies

- **DEP-001**: Supabase Auth — usuários de parceiro no mesmo projeto do gestor, com papel distinto.
- **DEP-002**: `@supabase/ssr`, já em uso no painel.
- **DEP-003**: `public.current_tenant_id()`, já existente e usada pelas policies atuais.
- **DEP-004**: Outbox e `api/src/routes/sync.ts`, para `valor_abatido` subir junto do fechamento.
- **DEP-005**: `web/src/lib/email.ts`, para o convite de usuário de parceiro.
- **DEP-006**: `BarcodeDetector` do navegador para TASK-019, com queda para entrada manual — a cobertura ainda é irregular e a alternativa não é opcional.

## 5. Files

- **FILE-001**: `db/31-vouchers-schema.sql` — quatro tabelas novas.
- **FILE-002**: `db/32-vouchers-rls.sql` — RLS e policies.
- **FILE-003**: `db/33-vouchers-usuarios-parceiro.sql` — usuários de parceiro e `current_parceiro_id()`.
- **FILE-004**: `db/34-vouchers-cota.sql` — `liberar_ticket()` transacional.
- **FILE-005**: `db/35-vouchers-competencia.sql` — competência e fechamento.
- **FILE-006**: `app/lib/features/vouchers/domain/{voucher_regra,voucher_engine,fare_com_voucher}.dart` — motor puro.
- **FILE-007**: `app/lib/features/vouchers/data/liberacao_service.dart` — consulta com três estados.
- **FILE-008**: `app/lib/features/tickets/presentation/saida_screen.dart` — integração da liberação e do aviso.
- **FILE-009**: `api/src/routes/liberacao.ts` e `api/src/server.ts` — endpoint e montagem.
- **FILE-010**: `api/src/routes/sync.ts` — gravação de `valor_abatido`.
- **FILE-011**: `web/src/app/painel/vouchers/**` — regras, parceiros, divergências, faturamento.
- **FILE-012**: `web/src/app/parceiro/**` — login, busca, scan, liberação, histórico.
- **FILE-013**: `web/src/middleware.ts` — gate de `/parceiro/*`.
- **FILE-014**: `web/src/lib/vouchers/calculo.ts` — espelho de exibição.
- **FILE-015**: `web/src/lib/solucoes.ts`, `web/src/components/site/secoes.tsx`, `web/src/lib/agentes/paginas.ts` — site.

## 6. Testing

- **TEST-001**: `VoucherEngine` — os quatro casos de REQ-002 produzem os valores esperados sobre uma `TarifaConfig` conhecida.
- **TEST-002**: `VoucherEngine` — abatimento maior que a estadia devolve zero e não dispara o `assert` de `TarifaEngine.calcular`.
- **TEST-003**: `VoucherEngine` — regra neutra devolve exatamente o valor do `TarifaEngine`, provando que o motor não foi alterado (CON-001).
- **TEST-004**: `VoucherEngine` — percentual e valor fixo combinados nunca produzem valor negativo.
- **TEST-005**: `liberacao_service` — timeout resolve para `.naoConfirmada`, jamais para `.ausente`.
- **TEST-006**: `saida_screen` — `.naoConfirmada` cobra o valor cheio e exibe o aviso; nenhum controle de desconto é oferecido ao operador (REQ-009, REQ-010).
- **TEST-007**: SQL — `liberar_ticket()` recusa a segunda chamada concorrente quando resta uma unidade de cota (SEC-006).
- **TEST-008**: SQL — o índice único parcial recusa segunda liberação ativa para o mesmo ticket (REQ-007).
- **TEST-009**: SQL — usuário de parceiro do tenant A não enxerga ticket nem liberação do tenant B (SEC-002).
- **TEST-010**: SQL — usuário de parceiro não consegue `UPDATE` nem `DELETE` em `liberacoes` (SEC-003).
- **TEST-011**: Fechamento de competência é idempotente: executar duas vezes não duplica nem altera totais.
- **TEST-012**: `npx tsc --noEmit` e `next build` limpos; `flutter analyze` sem issues e suíte do app verde (CON-006).

## 7. Risks & Assumptions

- **RISK-001**: Sem validade da liberação (CON-007), "isenção total" é ilimitada no tempo: liberada às 9h, o carro que sair à meia-noite sai de graça. As regras de N horas se protegem sozinhas. Mitigação barata quando doer: `validade_minutos` na regra, comparado em `VoucherEngine.aplicar`.
- **RISK-002**: A liberação existe antes de o valor existir. A cota conta unidades, não dinheiro, então um parceiro com cota de 10 pode abater R$ 50 ou R$ 500 no mesmo limite. Consequência aceita ao escolher limite por quantidade.
- **RISK-003**: A consulta no scan adiciona latência ao caminho crítico da saída. Timeout de 3s (TASK-023) limita o pior caso, mas o operador sentirá numa rede ruim. Medir antes de aumentar o timeout.
- **RISK-004**: Divergência entre o cálculo em Dart e o espelho em TypeScript. Mitigado por CON-004 (o TS nunca decide valor cobrado) e por a tela do parceiro rotular o número como estimativa.
- **RISK-005**: Duas implementações de leitura de QR — a do app (ML Kit) e a do parceiro (navegador). São contextos diferentes e não compartilham código; a do navegador precisa da queda manual de DEP-006.
- **ASSUMPTION-001**: O QR do cupom já contém identificador estável e resolvível do ticket, conforme `TICKET_PUBLIC_BASE_URL` e a rota `web/src/app/t/[id]`. Confirmar antes de TASK-019.
- **ASSUMPTION-002**: Um ticket recebe no máximo uma liberação ativa. Rateio entre dois lojistas não está no escopo.
- **ASSUMPTION-003**: O parceiro pertence a um único pátio. Rede de lojas atravessando pátios não está no escopo.
- **ASSUMPTION-004**: O volume de liberações por pátio cabe numa consulta simples por competência, sem agregação materializada.

## 8. Related Specifications / Further Reading

- `app/lib/features/tarifa/domain/tarifa_engine.dart` — motor de tarifa que este módulo envolve sem alterar
- `db/17-faturas-rls-gestor.sql` — padrão de migração idempotente com RLS por tenant
- `web/src/app/painel/tarifas/` — padrão de página de painel (`page.tsx` + `actions.ts`)
- `api/src/routes/bootstrap.ts` — padrão de autenticação de dispositivo para o endpoint de liberação
- `app/lib/features/sync/data/sync_engine.dart` — outbox por onde `valor_abatido` sobe
- `web/AGENT-READINESS.md` — as três listas espelhadas que TASK-035 precisa manter em sincronia
