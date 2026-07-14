-- ============================================================================
-- 20 — Gateway de pagamento por tenant (subconta + split)
--
-- Cada tenant recebe o dinheiro na PRÓPRIA subconta do PSP; a plataforma retém
-- sua parte por split. Guardamos aqui a subconta, a chave de API dela (CIFRADA,
-- AES-256-GCM — ver api/src/pagamentos/crypto.ts) e a regra de split.
--
-- Idempotente. Aplicar MANUALMENTE no SQL Editor.
-- ============================================================================

create table if not exists public.tenant_gateways (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  gateway             text not null default 'asaas',
  subconta_id         text,                              -- id da subconta/wallet no PSP
  api_key_encrypted   text,                              -- chave da subconta, CIFRADA (nunca em claro)
  -- O Asaas EXIGE um `customer` para criar cobrança, mas quem paga o ticket é
  -- anônimo (não pedimos CPF a quem só quer sair do estacionamento). Usamos um
  -- cliente genérico "Pagamento avulso", criado uma vez na subconta do tenant e
  -- reutilizado em todas as cobranças. Ver api/src/pagamentos/asaas.ts.
  customer_padrao_id  text,
  split_percentual    numeric(5,2)  not null default 0,  -- % retido pela plataforma
  split_valor_fixo    numeric(10,2) not null default 0,  -- R$ fixo por transação
  ativo               boolean not null default false,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  unique (tenant_id, gateway)
);

create index if not exists idx_tenant_gateways_tenant on public.tenant_gateways(tenant_id);

drop trigger if exists trg_tenant_gateways_updated on public.tenant_gateways;
create trigger trg_tenant_gateways_updated before update on public.tenant_gateways
  for each row execute function public.fn_set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- NENHUMA policy para `authenticated` — nem SELECT. Esta tabela é INFRA DA
-- PLATAFORMA, não dado do gestor: guarda credencial de PSP e a margem que a
-- plataforma retém. Quem configura é o console master, via service_role — que é
-- o caso legítimo de uso dele (operação administrativa, sem tenant na sessão).
--
-- Com `force row level security` e zero policies, o gestor logado no painel não
-- lê nada daqui NEM POR ACIDENTE, mesmo que alguém escreva um select amanhã.
alter table public.tenant_gateways enable row level security;
alter table public.tenant_gateways force row level security;

comment on table public.tenant_gateways is
  'Infra da plataforma: subconta do PSP, chave cifrada e split por tenant. Sem RLS policy para authenticated — só service_role (console master).';
comment on column public.tenant_gateways.api_key_encrypted is
  'AES-256-GCM, formato iv:tag:ciphertext em base64. Cifrar com api/scripts/cifrar-api-key.ts. NUNCA guardar em claro.';

-- ============================================================================
-- VALIDAÇÃO (rodar 2x — deve passar as duas vezes):
-- select relrowsecurity, relforcerowsecurity from pg_class
--   where relname = 'tenant_gateways';                 -- t, t
-- select count(*) from pg_policy
--   where polrelid = 'public.tenant_gateways'::regclass;  -- 0
-- ============================================================================
