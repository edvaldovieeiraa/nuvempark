-- ============================================================================
-- ParkFlow — Fase 0: Seed de 2 tenants + Teste de isolamento RLS
-- Rodar DEPOIS do schema e do RLS.
-- Prova que o tenant A nunca enxerga dado do tenant B.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) SEED: dois tenants com um pátio e um ticket cada
-- ----------------------------------------------------------------------------
do $$
declare
  ta uuid; tb uuid;
  pa uuid; pb uuid;
begin
  -- Tenant A
  insert into public.tenants (nome, codigo) values ('Rede Alpha', public.fn_gerar_codigo_tenant())
    returning id into ta;
  insert into public.patios (tenant_id, nome, qtd_vagas) values (ta, 'Alpha Centro', 50)
    returning id into pa;
  insert into public.assinaturas (tenant_id, valor_por_patio, estado) values (ta, 199.00, 'ativa');
  insert into public.tickets (id, patio_id, tenant_id, placa, entrada)
    values ('tkt-alpha-1', pa, ta, 'AAA1A11', now());

  -- Tenant B
  insert into public.tenants (nome, codigo) values ('Rede Beta', public.fn_gerar_codigo_tenant())
    returning id into tb;
  insert into public.patios (tenant_id, nome, qtd_vagas) values (tb, 'Beta Sul', 80)
    returning id into pb;
  insert into public.assinaturas (tenant_id, valor_por_patio, estado) values (tb, 249.00, 'ativa');
  insert into public.tickets (id, patio_id, tenant_id, placa, entrada)
    values ('tkt-beta-1', pb, tb, 'BBB2B22', now());

  raise notice 'SEED OK — Tenant A=% (patio %), Tenant B=% (patio %)', ta, pa, tb, pb;
end $$;

-- ----------------------------------------------------------------------------
-- 2) TESTE DE ISOLAMENTO
-- Simula a sessão de um gestor do tenant A definindo o claim tenant_id
-- e verifica que só linhas do A aparecem.
-- ----------------------------------------------------------------------------
do $$
declare
  ta uuid;
  tb uuid;
  visiveis_a int;
  visiveis_b int;
  total_bypass int;
begin
  select id into ta from public.tenants where nome = 'Rede Alpha';
  select id into tb from public.tenants where nome = 'Rede Beta';

  -- Baseline: como owner/service_role (RLS bypass), vê os 2 tickets
  select count(*) into total_bypass from public.tickets;
  raise notice 'BYPASS (service_role) vê % tickets (esperado >= 2)', total_bypass;

  -- Assume o papel 'authenticated' + injeta o JWT claim do tenant A
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('tenant_id', ta::text, 'role', 'authenticated')::text,
    true
  );

  select count(*) into visiveis_a from public.tickets where tenant_id = ta;
  select count(*) into visiveis_b from public.tickets where tenant_id = tb;

  raise notice 'Como Tenant A: vê % ticket(s) do A (esperado 1), % do B (esperado 0)',
    visiveis_a, visiveis_b;

  -- volta ao role normal
  perform set_config('role', 'postgres', true);

  if visiveis_a = 1 and visiveis_b = 0 then
    raise notice '✅ ISOLAMENTO OK — Tenant A não enxerga dado do Tenant B.';
  else
    raise exception '❌ FALHA DE ISOLAMENTO — A viu % do A e % do B (esperado 1 e 0)',
      visiveis_a, visiveis_b;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 3) LIMPEZA do seed de teste (comente se quiser inspecionar os dados)
-- ----------------------------------------------------------------------------
-- delete from public.tenants where nome in ('Rede Alpha','Rede Beta');
-- (cascata remove patios, tickets, assinaturas)
