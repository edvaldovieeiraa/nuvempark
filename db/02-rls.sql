-- ============================================================================
-- ParkFlow — Fase 0: RLS (Row Level Security) multi-tenant
-- Rodar DEPOIS de parkflow-fase0-schema.sql.
-- Modelo: gestor via Supabase Auth com tenant_id em custom claim do JWT.
--         RLS isola por current_tenant_id(). service_role fura tudo (super-admin/backend).
-- Idempotente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: tenant_id do JWT atual.
-- Espera o claim 'tenant_id' no JWT (setado no login do gestor via Supabase Auth,
-- e injetado pelo backend quando ele assume a identidade do tenant p/ o app).
-- Retorna NULL se não houver (então nenhuma linha é visível — fail-closed).
-- ----------------------------------------------------------------------------
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id',
      ''
    ),
    ''
  )::uuid
$$;

-- ----------------------------------------------------------------------------
-- Ativa RLS em TODAS as tabelas e cria policy tenant-scoped.
-- Padrão: SELECT/INSERT/UPDATE/DELETE só onde tenant_id = current_tenant_id().
-- service_role ignora RLS por padrão (bypass nativo do Postgres para o role).
-- ----------------------------------------------------------------------------

-- Bloco genérico para tabelas que têm coluna tenant_id
do $$
declare
  t text;
  tabelas text[] := array[
    'patios','assinaturas','operadores','operador_patios','operador_sessoes',
    'patio_config','tarifas','planos','clientes','cliente_veiculos',
    'tickets','caixa_sessoes','caixa_movimentos','dispositivos'
  ];
begin
  foreach t in array tabelas loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);

    -- limpa policies antigas (idempotência)
    execute format('drop policy if exists %I on public.%I;', 'tenant_select_'||t, t);
    execute format('drop policy if exists %I on public.%I;', 'tenant_insert_'||t, t);
    execute format('drop policy if exists %I on public.%I;', 'tenant_update_'||t, t);
    execute format('drop policy if exists %I on public.%I;', 'tenant_delete_'||t, t);

    execute format($f$
      create policy %I on public.%I
        for select to authenticated
        using (tenant_id = public.current_tenant_id());
    $f$, 'tenant_select_'||t, t);

    execute format($f$
      create policy %I on public.%I
        for insert to authenticated
        with check (tenant_id = public.current_tenant_id());
    $f$, 'tenant_insert_'||t, t);

    execute format($f$
      create policy %I on public.%I
        for update to authenticated
        using (tenant_id = public.current_tenant_id())
        with check (tenant_id = public.current_tenant_id());
    $f$, 'tenant_update_'||t, t);

    execute format($f$
      create policy %I on public.%I
        for delete to authenticated
        using (tenant_id = public.current_tenant_id());
    $f$, 'tenant_delete_'||t, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- tenants: caso especial — a própria linha do tenant.
-- O gestor só vê/edita o SEU tenant (id = current_tenant_id()).
-- Criação de tenant é só service_role (super-admin).
-- ----------------------------------------------------------------------------
alter table public.tenants enable row level security;
alter table public.tenants force row level security;

drop policy if exists tenant_self_select on public.tenants;
drop policy if exists tenant_self_update on public.tenants;

create policy tenant_self_select on public.tenants
  for select to authenticated
  using (id = public.current_tenant_id());

create policy tenant_self_update on public.tenants
  for update to authenticated
  using (id = public.current_tenant_id())
  with check (id = public.current_tenant_id());

-- NOTA: sem policy de INSERT/DELETE para authenticated em tenants.
-- Só service_role (super-admin) cria/remove tenant.

-- ============================================================================
-- Fim do RLS.
-- ============================================================================
