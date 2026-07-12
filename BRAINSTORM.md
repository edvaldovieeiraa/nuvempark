# NuvemPark — Documento de Brainstorm

> SaaS de gestão de estacionamento, mobile-first e offline-first, derivado do
> Leve Pátio (app Flutter) + módulo E-Park (Leve ERP). O Leve passa a ser
> apenas mais um tenant.

---

## 1. Visão

Plataforma vendida por **assinatura mensal por estacionamento**, com três superfícies:

| Superfície | Quem usa | O que faz |
|---|---|---|
| **APK operacional** | Operador do pátio | Entrada, saída, caixa, tickets, OCR de placa, Pix |
| **Painel web do gestor** | Dono/gerente | Faturamento em tempo real, tarifas, operadores, config |
| **Super-admin** | Você (dono do SaaS) | Cria tenants, gate de assinatura, uso por cliente |

---

## 2. Decisões travadas (deste brainstorm)

| # | Tema | Decisão |
|---|---|---|
| 1 | Multi-tenancy | **Um banco, isolado por tenant** via RLS real (Supabase) |
| 2 | Modelo de venda | **Assinatura mensal por estacionamento** |
| 3 | Backend | **Próprio e separado do ERP** — Leve vira mais um tenant |
| 4 | Superfícies | APK + painel do gestor + super-admin |
| 5 | Abordagem técnica | **A: Supabase-nativo, RLS por `tenant_id`** |
| 6 | Estratégia de código | **Re-plataformizar**: portar núcleo validado, decidir por módulo |
| 7 | Hierarquia | **Empresa/rede = tenant**, com N **pátios** dentro |
| 8 | Login do operador | **Código do tenant + usuário + senha** |
| 9 | Pagamento principal | **Pix dinâmico no ticket via PSP**, fallback manual offline |
| 10 | PSP | **Split/subconta (ex: Asaas)** — via camada de adaptador trocável |
| 11 | Gate de assinatura | **Bloqueia painel; app opera em modo restrito** na graça. Estados: `ativa → atrasada → suspensa` |
| 12 | Escopo dia 1 | Núcleo portado + Pix + painel/dashboard. Super-admin/billing = pós-1º cliente |
| 13 | Estratégia de app | **Repo novo, portar módulo a módulo** (sync + tarifa portados com fidelidade cirúrgica) |
| 14 | Cliente-alvo 1º pagante | **Rede pequena (2-5 pátios)** → hierarquia + dashboard consolidado são requisito dia 1 |
| 15 | Base de cobrança | **Valor fixo por pátio/mês** (`valor_por_patio` × pátios ativos do tenant) |
| 16 | Realtime dashboard | **Supabase Realtime** (push). Cuidado: reconexão + RLS nas subscriptions |
| 17 | Código do tenant | **4 dígitos numéricos, gerado automaticamente e único** no super-admin |

---

## 3. Arquitetura (Abordagem A)

Projeto **Supabase novo e dedicado** ao NuvemPark.

```
tenants (empresa/rede que assina)
  └── patios (estacionamentos)          [= antigo operacao_id]
        ├── tickets
        ├── caixa_sessoes / caixa_movimentos
        ├── tarifas
        ├── clientes / cliente_veiculos  (mensalistas/livre-passagem)
        ├── dispositivos                 (device binding)
        └── operadores
assinaturas (por tenant, com estado)
```

- **Toda** tabela operacional carrega `tenant_id` + `patio_id`.
- **RLS real** por `tenant_id` — isolamento no banco, não no código.
- **Identidade:** gestor via Supabase Auth; operador via JWT com `tenant_id`/`patio_id` no claim.
- **Billing:** tabela `assinaturas` + webhook do PSP; gate lê estado no login/bootstrap.
- **Pagamento:** camada de adaptador (interface única, PSP trocável); Asaas como primeiro provedor, split por subconta.

---

## 4. Ativo a portar (não reinventar)

Do Leve Pátio, o núcleo caro e já validado em produção:

- **Motor de tarifa** (Dart puro): tolerância → pernoite → fração inicial/adicional → teto diária
- **Sync offline-first** (Drift + outbox): backoff exponencial, idempotência, nunca perde dado
- **Caixa**: abertura/fechamento/movimentos, troca de operador
- **OCR de placa** on-device (ML Kit): Mercosul + antiga, correção conservadora
- **Tickets** + foto de entrada + impressão térmica ESC/POS + QR
- **Device binding** (vincular/revogar) + version gate + refresh de token

---

## 5. Construir do zero (camada nova de plataforma)

- Hierarquia `tenant → patio` real + **RLS** (hoje é só filtro por `operacao_id` no código)
- **Desacoplar do Leve**: URL/prefixo de API, appId, namespace Stone, branding `#E30613`, "E-Park", roles
- **Billing/assinatura** + estados + gate (não existe hoje)
- **Pix via PSP** (adaptador + Asaas) — integração nova
- **Onboarding + branding por cliente** (logo, cor, nome no ticket)
- **Super-admin** (enxuto no início)

---

## 6. Ideias de mercado (backlog priorizado)

**⭐ = candidato a diferencial de venda forte**

- ⭐ Pix dinâmico no ticket *(no MVP)*
- ⭐ Dashboard de faturamento em tempo real *(no MVP)*
- ⭐ Mensalistas / livre-passagem (reconhecimento por placa) — base já existe
- ⭐ Fechamento de caixa à prova de fraude (conferência cega, quebra, auditoria)
- ⭐ Branding por cliente + onboarding self-service
- Relatórios/exportação (DRE simples, por forma de pagamento)
- Cancelamento/estorno com motivo + autorização (trilha de auditoria)
- Totem de autoatendimento / saída rápida *(futuro)*
- Multi-pátio por cliente (rede) — a hierarquia já contempla

---

## 7. Débitos técnicos a resolver cedo (achados no mapeamento)

1. **Schema não-versionado**: `patio_tickets`, `patio_caixa_sessoes`,
   `patio_caixa_movimentos`, `patio_dispositivos` são load-bearing (o endpoint
   de sync escreve neles) mas **não têm `CREATE TABLE` versionado** — foram
   criados direto no Supabase. No NuvemPark nascem já com `tenant_id` + RLS.
2. **Banir `service_role` do caminho multi-tenant**: o E-Park usa
   `createAdminClient()` (fura RLS) em tudo. O painel do gestor tem que operar
   com a sessão do usuário e RLS ativa.

---

## 8. Escopo do MVP (dia 1 — primeiro cliente pagante)

**Entra:**
- Núcleo operacional portado (multi-tenant)
- Pix dinâmico no ticket + fallback manual offline
- Painel do gestor + dashboard de faturamento em tempo real

**Fica pra depois do 1º cliente:**
- Super-admin completo + billing self-service (no início: cria tenant na mão)
- Demais ideias do backlog (seção 6)

---

## 9. Perguntas em aberto — RESOLVIDAS

- ~~Base de cobrança~~ → **valor fixo por pátio/mês** (decisão #15)
- ~~Cliente-alvo primário~~ → **rede pequena 2-5 pátios** (decisão #14)
- ~~Slug/código do tenant~~ → **4 dígitos gerado automático** (decisão #17)
- ~~App novo vs fork~~ → **repo novo, portar módulo a módulo** (decisão #13)
- ~~Realtime do dashboard~~ → **Supabase Realtime** (decisão #16)

### Ainda pra decidir no plano (detalhe de implementação, não de produto)
- Valor R$ da assinatura por pátio (comercial — decide na hora de vender)
- Provedor PSP definitivo (Asaas assumido; adaptador deixa trocável)
- Portar sync/tarifa: fidelidade cirúrgica — copiar precedência da tarifa
  (tolerância→pernoite→fração→teto) e garantias do sync (backoff/idempotência)
  sem "melhorar" e perder sutileza validada em produção
