# NuvemPark — Plano de Execução

> Deriva de [BRAINSTORM.md](./BRAINSTORM.md) (17 decisões travadas).
> Base factual: schema real do E-Park + mapa do app leve-patio (mapeados no brainstorm).

---

## 0. Arquitetura-alvo (recap)

```
Supabase novo (projeto NuvemPark)
├── tenants (empresa/rede que assina; código 4 dígitos único)
│   └── patios (estacionamentos)              [= antigo operacao_id]
│         ├── tickets, caixa_sessoes, caixa_movimentos
│         ├── tarifas, planos, clientes, cliente_veiculos
│         ├── dispositivos, config
│         └── operadores (via tabela de acesso operador↔patio)
└── assinaturas (por tenant: valor_por_patio, estado)

App Flutter (NuvemPark)  ──HTTP──►  nuvempark-api (Node+Fastify)  ──►  Supabase
Painel gestor + super-admin ────►  nuvempark-web (Next.js)      ──►  (RLS por tenant)
```

**DECISÃO DE ARQUITETURA (revisada): DOIS serviços separados.**
- **`nuvempark-api`** — Node + Fastify + TypeScript. API pura que o app Flutter consome
  (auth/login, refresh, bootstrap, sync, foto, dispositivo, app-config). Deploy independente.
- **`nuvempark-web`** — Next.js App Router. Painel do gestor (Supabase Auth) + super-admin.
- **`nuvempark-app`** — Flutter (Fase 2+).

Localização: `C:\VibeCoding\NuvemPark\{api,web,app}`. O Leve segue intocado — greenfield.

> ⚠️ **Regra de ouro do backend (não repetir o erro do E-Park):** o E-Park roda 100% no
> `service_role` (fura RLS) e a ÚNICA autorização é o check em código
> `operador.operacao_ids.includes(operacao_id)`. No NuvemPark: manter esse check E fazer o
> backend **assumir a identidade do tenant** ao falar com o Supabase (RLS como 2ª camada).
> service_role só para o super-admin e operações administrativas explícitas.

---

## FASE 0 — Fundação (schema + tenancy + RLS)

**Objetivo:** o banco multi-tenant existir, com RLS real, antes de qualquer código.

### 0.1 Formalizar o schema (inclui as 4 tabelas fantasma)
Todo `patio_*` do E-Park vira tabela NuvemPark com `tenant_id` + `patio_id`. Recriar **como CREATE TABLE versionado** (no E-Park 4 delas não existem em migração):

| Tabela NuvemPark | Origem | Atenção |
|---|---|---|
| `tenants` | **nova** | id, nome, `codigo` (4 díg único, gerado), criado_em |
| `patios` | = `operacoes` (só o subset de pátio) | id, tenant_id, nome, codigo, qtd_vagas |
| `assinaturas` | **nova** | tenant_id, valor_por_patio, estado (`ativa\|atrasada\|suspensa`), vencimento |
| `operadores` | `patio_operadores` | trocar `operacao_ids UUID[]` por tabela de junção `operador_patios` |
| `operador_sessoes` | `patio_operador_sessoes` | refresh tokens |
| `patio_config` | `patio_operacao_config` | ⚠️ incluir as 3 colunas ocultas: `patio_ativo`, `ticket_cabecalho`, `ticket_rodape` |
| `tarifas` | `patio_tarifas` (+v2) | 19 colunas; precedência é lógica de app (ver Fase 3) |
| `planos` | `patio_planos` | mensalista/credenciado |
| `clientes` | `patio_clientes` | livre-passagem/mensalista |
| `cliente_veiculos` | `patio_cliente_veiculos` | unique(patio_id, placa) |
| `tickets` | ⚠️ **fantasma** | id client-gen (PK upsert), `entrada` NOT NULL, campos Stone, foto_entrada_path |
| `caixa_sessoes` | ⚠️ **fantasma** | fundo_caixa, total_fechamento, status |
| `caixa_movimentos` | ⚠️ **fantasma** | imutável (create-only), tipo entrada/sangria |
| `dispositivos` | ⚠️ **fantasma** | device_uuid UNIQUE, status ativo/revogado |

> Coluna discriminadora hoje = `operacao_id`. Vira `patio_id` (FK real → `patios`), e `patios.tenant_id` (FK → `tenants`). **Toda** tabela operacional carrega `tenant_id` desnormalizado pra RLS barata.

### 0.2 RLS real (o maior salto de segurança sobre o E-Park)
- Hoje: toda tabela tem `USING (FALSE)` + tudo passa por `service_role` (fura RLS). **Isso não vai pro NuvemPark.**
- NuvemPark: policies por `tenant_id`. Painel do gestor opera com a **sessão do usuário** (RLS ativa), nunca admin client.
- Tickets/caixa/dispositivos: joins manuais **sem FK rígida** entre eles (tolerar sync fora de ordem) — mas `tenant_id`/`patio_id` são FK reais e RLS-protegidos.
- ⚠️ **Realtime respeitando RLS:** subscription do tenant A não recebe evento do B. Testar isolamento.

### 0.3 Teste de isolamento (gate da fase)
Seed 2 tenants; provar por teste automatizado que A nunca lê linha de B em nenhuma tabela, nem via API nem via Realtime. **Fase 0 não fecha sem isso.**

---

## FASE 1 — Backend + Auth multi-tenant

**Objetivo:** API mobile e identidade funcionando com tenant.

### 1.1 API mobile (portar do E-Park, +tenant)
Endpoints `/api/mobile/v1/patio/*` do E-Park → NuvemPark, cada um passa a resolver e exigir `tenant_id`:
`auth/login`, `auth/logout`, `auth/refresh`, `bootstrap`, `sync`, `foto`, `dispositivo`, `app-config`.

### 1.2 Auth do operador (decisão #8 + #17)
- Login = **código do tenant (4 díg) + usuário + senha** + device_uuid.
- O código resolve o tenant ANTES do login (isola usuários entre clientes).
- Manter: JWT access+refresh, device binding (vincular/revogar), single-flight refresh, "erro de rede nunca revoga sessão local".
- JWT carrega `tenant_id` + `patio_id` no claim.

### 1.3 Gate de assinatura (decisão #11)
- `bootstrap`/`login` retornam o estado da assinatura.
- App: `ativa` → normal; `atrasada` → banner + opera; `suspensa` → **modo restrito** (só registrar entrada/saída, sem relatórios).
- Painel do gestor: bloqueia em `atrasada`/`suspensa`.

---

## FASE 2 — App Flutter: fundação + porte do núcleo

**Objetivo:** app novo rodando com o núcleo validado portado com fidelidade.
**Ordem dependência-a-dependência** (do mapa do leve-patio):

1. **`leve_core`** → renomear/portar como pacote base (Dio, SecureStorage, ApiException, widgets). Tudo depende dele.
2. **`lib/core`** → `env.dart` **parametrizado** (base URL/prefix/appId/branding via `--dart-define`), theme/cores (trocar `#E30613` por branding NuvemPark), DI, interceptors (bearer+refresh), router, beep channel.
3. **Drift DB** → tables + DAOs + migrações. `schemaVersion` recomeça. Renomear `leve_patio.db` → `nuvempark.db`, prefixo de chaves `patio_*` → `parkflow_*`.
4. **Auth** → token storage, login (com código do tenant), device binding, refresh.
5. **Operacao/bootstrap** → cache de config + tarifas; provê `TarifaConfig` + `patio_id`.
6. **Sync engine** → ⚠️ **portar com fidelidade cirúrgica** (ver Fase 3).
7. **Tarifa engine** → ⚠️ **portar verbatim + testes** (ver Fase 3).
8. **Tickets** → entrada/saída/cobrança + OCR de placa.
9. **Caixa** → sessões/movimentos/fechamento.
10. **Printing** → térmica ESC/POS + QR scanner + QR gen.
11. **Home/Patio/Ajustes** → shells de UI.
12. **~~pagamento_stone~~** → **NÃO portar no MVP** (decisão: Pix é o principal). Manter a arquitetura de adaptador de pagamento pro Pix entrar no lugar. Stone fica atrás de flag pra futuro.

### Desacoplar do Leve (parametrizar)
Cor `#E30613`, nome "Leve Pátio" (main.dart:27 + 4 telas), namespaces `br.com.levemobilidade.patio/*` (som + stone), assets, `leve_patio.db`, prefixo `patio_*`, API base/prefix/appId.

---

## FASE 3 — Lógica load-bearing (copiar sem "melhorar")

> Estas são as partes caras e sutis. Portar **idêntico** e cobrir com testes. Não refatorar por gosto.

### 3.1 Motor de tarifa — precedência EXATA
1. **Tolerância**: `duracao <= tolerancia` → R$ 0 (inclusive `<=`)
2. **Pernoite**: janela D→D+1 (`pernoiteHoraFim + 24`); só se a estadia cobre **inteira** ao menos uma noite (`entrada <= início` E `saída >= fim`, inclusive)
3. **Frações**: `<= fracaoInicial` → valor inicial; senão `ceil(adicionais/fracaoAdicional)` (**sempre arredonda pra cima**) × valor adicional + inicial
4. **Teto diária**: `valorNormal >= teto` → teto (inclusive `>=`)

Engine é Dart puro (`abstract final class`, static `calcular`). Caller escolhe a tarifa (vigência/tipo veículo), engine só calcula. **Portar os testes unitários junto.**

### 3.2 Sync engine — garantias a preservar
- Envelope: `{app_id, tenant_id, patio_id, entidade, entidade_id, operacao, payload}` (+`tenant_id`/`patio_id` novos)
- Idempotência: marcar sync_log **e** flag da entidade na **mesma transação Drift**
- `entidade_id` = UUID client-gen → servidor deduplica replay
- Backoff exponencial capado 60min; máx 10 tentativas → `falhou` (nunca deleta)
- HTTP permanente (400/404/409/410/422) → `falhou` imediato; transiente (401/408/425/429/5xx) → retry
- Offline fail-fast: quebra o loop sem queimar tentativa
- Foto de entrada: passe multipart best-effort separado

### 3.3 OCR de placa
Nunca autoritativo (máx 1 correção, prefere maior/mais à esquerda, desempate Mercosul). Só pré-preenche.

### 3.4 Refresh interceptor
Single-flight + guarda anti-deadlock de duplo-retry + "erro de rede nunca revoga sessão local".

---

## FASE 4 — Pix dinâmico (o diferencial de venda)

**Objetivo:** cobrança Pix na saída, com fallback offline.

- **Camada de adaptador** de pagamento: interface única (`gerarCobranca`, `consultarStatus`, webhook), PSP trocável.
- **Asaas** como primeiro provedor: subconta por tenant, **split** (você retém taxa).
- Fluxo: saída → gera QR Pix dinâmico → cliente paga → webhook confirma → ticket fecha.
- **Fallback offline:** sem internet, cai pro registro manual (dinheiro/pix manual) que o fluxo atual já faz. Pix exige online.
- Onboarding: tenant conecta a subconta Asaas (self-service futuro; manual no 1º cliente).

---

## FASE 5 — Painel do gestor + dashboard (requisito dia 1, cliente = rede)

**Objetivo:** o dono da rede vê e configura tudo pela web.

- **Dashboard de faturamento**: faturamento do dia, ocupação, ticket médio, por operador, **agregado da rede** (seletor de pátio + visão consolidada — decisão #14).
- **Realtime (Supabase)**: cada ticket pago aparece na hora (push). ⚠️ RLS nas subscriptions.
- **Config por pátio**: tarifas, tipos de veículo, formas de pagamento, cabeçalho/rodapé do ticket.
- **Operadores**: criar/editar, vincular a pátios (tabela de junção).
- **Clientes/mensalistas**: planos + clientes + placas (livre-passagem).
- Portar do admin E-Park (`src/app/(dashboard)/admin/patio/*`), repaginado + multi-tenant + RLS por sessão.

---

## FASE 6 — Super-admin + billing (pós-1º cliente, enxuto)

**Objetivo:** você operar o SaaS. Começa mínimo.

- Criar tenant (gera código 4 díg único automático — decisão #17).
- Ativar/bloquear assinatura; ver estado por tenant.
- **Billing MVP = manual** (você cria o tenant e cobra por fora). Webhook de PSP pra automatizar depois.
- Uso por cliente (nº pátios, faturamento) — bem simples no início.

---

## Ordem de execução recomendada

```
Fase 0 (schema+RLS+isolamento)  ──► trava tudo, faz primeiro
   │
   ├─► Fase 1 (backend+auth+tenant)
   │        │
   │        └─► Fase 2 (app: fundação+núcleo)  ──► Fase 3 embutida (fidelidade)
   │                 │
   │                 ├─► Fase 4 (Pix)           ┐
   │                 └─► Fase 5 (painel+dash)   ┘ MVP dia 1 = 0+1+2+3+4+5
   │
   └─► Fase 6 (super-admin/billing)  ──► logo após 1º cliente
```

**MVP vendável = Fases 0→5.** Fase 6 pode ser manual no comecinho.

---

## Riscos & cuidados (registrados)

1. **RLS mal configurada = vazamento entre clientes pagantes** — risco de negócio, não só técnico. Gate de isolamento na Fase 0.
2. **Portar sync/tarifa "melhorando"** = perder sutileza validada em produção. Copiar + testes.
3. **Schema fantasma** (`tickets`, `caixa_*`, `dispositivos`) — recriar formalmente, atenção a `entrada NOT NULL`, `device_uuid UNIQUE`, movimentos imutáveis.
4. **Realtime furando RLS** nas subscriptions — testar isolamento de canal.
5. **Pix depende de online** — fallback manual obrigatório, senão trava saída offline.

---

## Decisões que ainda são comerciais (não travam código)
- Valor R$ da mensalidade por pátio (decide ao vender)
- Provedor PSP definitivo (Asaas assumido; adaptador deixa trocável)
