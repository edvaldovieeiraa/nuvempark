-- ============================================================================
-- NuvemPark — 09: Avarias registradas na entrada do veículo
-- O operador registra danos pré-existentes (com fotos) ao dar entrada.
-- As fotos vão para o bucket nuvempark-entradas em avarias/<ticket_id>/<n>.jpg
-- Idempotente.
-- ============================================================================

create table if not exists public.avarias (
  id             text primary key,                 -- client-generated (sync)
  ticket_id      text not null,                     -- join manual -> tickets.id
  patio_id       uuid not null references public.patios(id) on delete cascade,
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  placa          text not null default '—',
  descricao      text not null,                     -- "risco na porta esquerda"
  fotos          jsonb not null default '[]'::jsonb, -- paths no bucket privado
  operador_id    uuid,
  criado_em      timestamptz not null default now(),
  sincronizado_em timestamptz
);
create index if not exists idx_avarias_ticket on public.avarias(ticket_id);
create index if not exists idx_avarias_patio on public.avarias(patio_id);
create index if not exists idx_avarias_tenant on public.avarias(tenant_id);

-- RLS: isolada por tenant (mesmo padrão das demais tabelas)
alter table public.avarias enable row level security;

drop policy if exists avarias_select on public.avarias;
create policy avarias_select on public.avarias
  for select using (tenant_id = public.current_tenant_id());

drop policy if exists avarias_all on public.avarias;
create policy avarias_all on public.avarias
  for all using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- Realtime opcional (aparece no painel ao vivo)
do $$
begin
  alter publication supabase_realtime add table public.avarias;
exception when duplicate_object then
  null;
end $$;
