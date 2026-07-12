-- ============================================================================
-- NuvemPark — Self-signup + Trial de 15 dias
-- Projeto: xrwrsswhoywzzhutzrjx · Idempotente.
--
-- Fluxo: cliente se cadastra pelo site -> assinatura nasce 'trial' com
-- trial_expira_em = now()+15d -> painel liberado automaticamente. Ao expirar,
-- vira 'atrasada' (gera 1ª fatura no módulo financeiro). Acesso só volta quando
-- 'ativa'. A REGRA DE OURO de acesso mora em fn_assinatura_libera() — web, API
-- e master leem a MESMA verdade.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Novos estados + expiração do trial
-- ----------------------------------------------------------------------------
alter table public.assinaturas
  add column if not exists trial_expira_em timestamptz;

-- Recria o CHECK do estado incluindo 'trial' e 'cancelada'
alter table public.assinaturas
  drop constraint if exists assinaturas_estado_check;
alter table public.assinaturas
  add constraint assinaturas_estado_check
  check (estado in ('trial','ativa','atrasada','suspensa','cancelada'));

-- marca de origem: veio do self-signup ou criada pelo master
alter table public.assinaturas
  add column if not exists origem text not null default 'master'
    check (origem in ('master','signup'));

-- ----------------------------------------------------------------------------
-- 2) REGRA DE OURO: a assinatura libera acesso?
--    ativa  -> sim
--    trial  -> sim enquanto não expirou
--    resto  -> não
-- ----------------------------------------------------------------------------
create or replace function public.fn_assinatura_libera(p_tenant uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.assinaturas a
    join public.tenants t on t.id = a.tenant_id
    where a.tenant_id = p_tenant
      and t.ativo = true
      and (
        a.estado = 'ativa'
        or (a.estado = 'trial'
            and a.trial_expira_em is not null
            and a.trial_expira_em > now())
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- 3) Dias restantes de trial (para exibição). Negativo/0 = expirado.
-- ----------------------------------------------------------------------------
create or replace function public.fn_trial_dias_restantes(p_tenant uuid)
returns int language sql stable as $$
  select case
    when a.estado <> 'trial' or a.trial_expira_em is null then null
    else greatest(0, ceil(extract(epoch from (a.trial_expira_em - now())) / 86400))::int
  end
  from public.assinaturas a
  where a.tenant_id = p_tenant;
$$;

-- ----------------------------------------------------------------------------
-- 4) Expira trials vencidos: 'trial' vencido -> 'atrasada'. Retorna afetados.
--    (o módulo financeiro gera a fatura; aqui só muda o estado)
-- ----------------------------------------------------------------------------
create or replace function public.fn_expirar_trials()
returns int language plpgsql as $$
declare afetadas int;
begin
  update public.assinaturas
     set estado = 'atrasada'
   where estado = 'trial'
     and trial_expira_em is not null
     and trial_expira_em <= now();
  get diagnostics afetadas = row_count;
  return afetadas;
end $$;

-- ----------------------------------------------------------------------------
-- 5) Recria fn_gerar_faturas_mes EXCLUINDO trials vigentes (não se cobra quem
--    está no teste grátis). Trials já expirados viram 'atrasada' via
--    fn_expirar_trials e AÍ entram na geração. Suspensas/canceladas também fora.
-- ----------------------------------------------------------------------------
create or replace function public.fn_gerar_faturas_mes(p_competencia date default date_trunc('month', current_date)::date)
returns int language plpgsql as $$
declare
  criadas int := 0;
  r record;
  v_qtd int;
  v_venc date;
begin
  for r in
    select a.tenant_id, a.valor_por_patio, a.dia_vencimento
      from public.assinaturas a
      join public.tenants t on t.id = a.tenant_id
     where a.estado in ('ativa','atrasada')   -- exclui trial/suspensa/cancelada
       and t.ativo = true
  loop
    select count(*) into v_qtd
      from public.patios p
     where p.tenant_id = r.tenant_id and p.ativo = true;

    v_venc := (date_trunc('month', p_competencia)
               + (least(r.dia_vencimento, 28) - 1) * interval '1 day')::date;

    insert into public.faturas
      (tenant_id, competencia, vencimento, valor, valor_por_patio, qtd_patios)
    values
      (r.tenant_id,
       date_trunc('month', p_competencia)::date,
       v_venc,
       coalesce(r.valor_por_patio,0) * v_qtd,
       coalesce(r.valor_por_patio,0),
       v_qtd)
    on conflict (tenant_id, competencia) do nothing;

    if found then
      criadas := criadas + 1;
    end if;
  end loop;

  return criadas;
end $$;

-- ============================================================================
-- Pronto. fn_expirar_trials() deve rodar diariamente (cron) OU é chamada de
-- forma oportunista pelo master/financeiro ao abrir. fn_assinatura_libera()
-- é o gate único usado pelo middleware web e pelo login da API.
-- ============================================================================
