-- ============================================================================
-- NuvemPark — Fase 5 (painel web do gestor)
-- 1) current_tenant_id() passa a ler também app_metadata.tenant_id
--    (Supabase Auth coloca claims customizados em app_metadata, não no topo).
-- 2) Habilita Realtime na tabela tickets (dashboard ao vivo).
-- Rodar no SQL Editor do projeto xrwrsswhoywzzhutzrjx. Idempotente.
-- ============================================================================

-- 1) tenant_id: topo do JWT (backend/app) OU app_metadata (gestor Supabase Auth)
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id',
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id',
      ''
    ),
    ''
  )::uuid
$$;

-- 2) Realtime: dashboard escuta INSERT/UPDATE em tickets (respeita RLS).
do $$
begin
  alter publication supabase_realtime add table public.tickets;
exception when duplicate_object then
  null; -- já adicionada
end $$;

-- ============================================================================
-- Fim.
-- ============================================================================
