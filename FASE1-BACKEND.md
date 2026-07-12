# NuvemPark — Fase 1: Backend API (nuvempark-api)

> Node + Fastify + TypeScript. Porta a lógica do E-Park mobile com camada de tenant.
> Base factual: código real extraído do E-Park (auth, jwt, login, refresh, bootstrap, sync, device).

## Serviço: `nuvempark-api`

### Endpoints (paridade com E-Park + tenant)
| Rota | Origem E-Park | Mudança NuvemPark |
|---|---|---|
| `POST /auth/login` | `auth/login/route.ts` | + `codigo_tenant` (4 díg) resolve tenant ANTES do login; usuário único por tenant |
| `POST /auth/refresh` | `auth/refresh/route.ts` | rotação in-place, one-time-use, bound a device_uuid (idêntico) |
| `POST /auth/logout` | `auth/logout` | limpa sessão |
| `GET /bootstrap` | `bootstrap/route.ts` | config+tarifas+clientes escopados a patio_id; + estado da assinatura |
| `POST /sync` | `sync/route.ts` | ⚠️ 3 estratégias de idempotência (ver abaixo) + tenant_id no envelope |
| `POST /foto` | `foto` | upload foto entrada (bucket privado) |
| `GET /dispositivo` | `dispositivo/route.ts` | device binding (ativo/revogado) + synthetic-uuid fallback |
| `GET /app-config` | `app-config` | versão mínima, flags |

### JWT (portar de patio-jwt.ts)
- **Access token:** `jose` SignJWT, HS256, **8h**. Claims NuvemPark:
  `{ sub (operador uuid), usuario, nome, tenant_id, patio_ids[] }`.
  ⚠️ **Adicionar `tenant_id` no claim** (não existia no E-Park) — é o que o RLS lê.
- **Refresh token:** UUID opaco (`randomUUID`), servidor guarda só SHA-256 hash em `operador_sessoes`.
  Expiry 30d pela coluna `expires_at`. Rotação in-place = one-time-use. Bound a `device_uuid`.
- **Secret:** env `NUVEMPARK_JWT_SECRET` (renomeado de PATIO_JWT_SECRET).

### Auth do operador (decisão #8 + #17)
Login recebe `{ codigo_tenant, usuario, senha, device_uuid }`:
1. Resolve `tenant` pelo `codigo` (4 díg). Não achou → 401.
2. Busca operador por `(tenant_id, usuario)` — usuário único DENTRO do tenant.
3. bcrypt.compare(senha, senha_hash). `!ativo` → 403.
4. Carrega patios do operador via junção `operador_patios` (só patios ativos do tenant).
5. Assina access token (com `tenant_id` no claim) + refresh (delete-then-insert sessão por device).
6. Retorna `{ access_token, refresh_token, user, patios[], assinatura_estado }`.

### Gate de assinatura (decisão #11)
- `login` e `bootstrap` retornam `assinatura.estado` (`ativa|atrasada|suspensa`).
- App decide: `ativa`→normal; `atrasada`→banner+opera; `suspensa`→modo restrito.

### ⚠️ SYNC — 3 estratégias de idempotência (PRESERVAR EXATO do E-Park)
Envelope: `{ app_id, tenant_id, patio_id, entidade, entidade_id, operacao, payload }`.
Um item por request (não batch). Autorização: `operador.patio_ids.includes(patio_id)` **E** `tenant_id` do claim == envelope.

1. **`ticket`** — read-then-write: `select id ... maybeSingle()` → update se existe, senão insert
   com **fallbacks NOT-NULL** (`entrada=agora, placa='—', tipo_veiculo='carro'`) pra tolerar
   update fora de ordem. `operador_id ?? operador.sub`. Stamp `patio_id`+`tenant_id`.
2. **`caixa_sessao`** — mesmo read-then-write, sem fallbacks extras.
3. **`caixa_movimento`** — IMUTÁVEL: `upsert(row, { onConflict: 'id', ignoreDuplicates: true })`.
   Re-envio = no-op.

Helper `compact()` (strip undefined) = mecanismo de update parcial. `toIso()`/`num()`/`str()` coerção.

### Device binding (portar de dispositivo/route.ts)
- Header `X-Device-Id`. Match exato → senão synthetic-uuid (`<8hex>-0000-4000-8000-...`).
- `status='revogado'` → 403. Qualquer outro passa. Fire-and-forget `ultimo_acesso`.
- 2 conceitos independentes: sessão-device (login/refresh) vs allow-list hardware (dispositivos).

### ⚠️ Regra de ouro (RLS)
E-Park = 100% service_role, autorização só no check em código. NuvemPark:
- Manter o check `patio_ids.includes(patio_id)`.
- **Backend assume identidade do tenant** ao falar com Supabase (JWT com tenant_id → RLS ativa
  como 2ª camada). service_role só pra super-admin/admin explícito.

## Estrutura nuvempark-api
```
nuvempark-api/
├── src/
│   ├── server.ts            → Fastify bootstrap
│   ├── env.ts               → env vars validadas
│   ├── supabase.ts          → cliente (tenant-scoped + admin)
│   ├── auth/
│   │   ├── jwt.ts           → sign/verify (porta patio-jwt)
│   │   ├── middleware.ts    → withAuth (porta withPatioAuth) + injeta operador
│   │   └── routes.ts        → login, refresh, logout
│   ├── routes/
│   │   ├── bootstrap.ts
│   │   ├── sync.ts          → ⚠️ as 3 estratégias
│   │   ├── foto.ts
│   │   ├── dispositivo.ts
│   │   └── app-config.ts
│   └── lib/
│       ├── coerce.ts        → toIso/num/str/compact
│       └── formas-pagamento.ts → normalize
├── package.json
├── tsconfig.json
└── .env.example
```
