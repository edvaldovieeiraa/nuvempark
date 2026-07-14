-- ============================================================================
-- 19 — Pagamento online do ticket (QR no cupom → página pública → Pix)
--
-- O cliente escaneia o QR do cupom, cai numa página pública e paga a estadia
-- antes de sair. O TICKET NÃO GANHA ESTADO NOVO: continua 'aberto' até a saída
-- física no pátio. O pagamento vive em tabela própria + três campos espelho no
-- ticket (o operador precisa ver "já pagou" na hora da saída, sem join).
--
-- Um ticket pode ter N cobranças (a primeira expirou, o cliente gerou outra),
-- por isso tabela dedicada em vez de mais colunas.
--
-- Idempotente. Aplicar MANUALMENTE no SQL Editor.
-- ============================================================================

-- ── Espelho no ticket: o que o operador precisa saber na saída ──────────────
alter table public.tickets add column if not exists pago_online_em timestamptz;
alter table public.tickets add column if not exists pagamento_online_id uuid;
alter table public.tickets add column if not exists valor_pago_online numeric(10,2);

comment on column public.tickets.pago_online_em is
  'Quando o cliente pagou a estadia online. Nulo = não pagou pelo QR.';
comment on column public.tickets.pagamento_online_id is
  'Pagamento vigente (join manual -> pagamentos_online.id).';
comment on column public.tickets.valor_pago_online is
  'Valor efetivamente pago online — pode divergir da tarifa da saída se o cliente demorar.';

-- ── Cobranças ───────────────────────────────────────────────────────────────
create table if not exists public.pagamentos_online (
  id                   uuid primary key default gen_random_uuid(),
  ticket_id            text not null,              -- join manual -> tickets.id (padrão do projeto)
  patio_id             uuid not null references public.patios(id) on delete cascade,
  tenant_id            uuid not null references public.tenants(id) on delete cascade,
  valor                numeric(10,2) not null,
  status               text not null default 'pendente'
                       check (status in ('pendente','pago','expirado','cancelado')),
  gateway              text not null default 'asaas',
  gateway_cobranca_id  text,
  pix_copia_cola       text,
  pix_qrcode_base64    text,
  calculado_em         timestamptz not null default now(),  -- quando a tarifa foi calculada
  pago_em              timestamptz,
  expira_em            timestamptz,                         -- validade da cobrança Pix
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now()
);

create index if not exists idx_pag_online_ticket  on public.pagamentos_online(ticket_id);
create index if not exists idx_pag_online_tenant  on public.pagamentos_online(tenant_id);
create index if not exists idx_pag_online_status  on public.pagamentos_online(status);
create index if not exists idx_pag_online_gateway on public.pagamentos_online(gateway_cobranca_id);

drop trigger if exists trg_pag_online_updated on public.pagamentos_online;
create trigger trg_pag_online_updated before update on public.pagamentos_online
  for each row execute function public.fn_set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Gestor LÊ os pagamentos do próprio tenant. NÃO escreve: quem escreve é o
-- fluxo da api (webhook do PSP + geração de cobrança), por um repo de escopo
-- estreito. Sem policy de insert/update/delete para `authenticated` — a
-- ausência é a regra.
alter table public.pagamentos_online enable row level security;
alter table public.pagamentos_online force row level security;

drop policy if exists pag_online_select_gestor on public.pagamentos_online;
create policy pag_online_select_gestor on public.pagamentos_online
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

-- Realtime: a página pública do cliente escuta a própria cobrança virar 'pago'
-- sem ficar batendo de 5 em 5 segundos.
do $$
begin
  alter publication supabase_realtime add table public.pagamentos_online;
exception when duplicate_object then
  null;
end $$;

-- ============================================================================
-- VALIDAÇÃO (rodar 2x — deve passar as duas vezes):
-- select column_name from information_schema.columns
--   where table_name = 'tickets' and column_name like '%online%';
-- select relrowsecurity, relforcerowsecurity from pg_class
--   where relname = 'pagamentos_online';
-- select polname, polcmd from pg_policy
--   where polrelid = 'public.pagamentos_online'::regclass;  -- só SELECT
-- ============================================================================
