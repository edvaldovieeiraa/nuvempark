-- ============================================================================
-- NuvemPark — Desempenho do console master
-- Projeto: xrwrsswhoywzzhutzrjx
--
-- Tira do caminho de render do painel os laços que hoje viram dezenas de idas
-- e voltas ao banco. Cada função aqui substitui um N+1 que vivia no Node.
--
-- Idempotente: pode rodar de novo sem quebrar.
--
--   1) idx_tickets_entrada          → o dashboard varria a tickets inteira
--   2) fn_master_resumo_hoje        → contagem/soma do dia em SQL, não em JS
--   3) fn_garantir_faturas_trials   → 3N idas e voltas viram 1
--   4) fn_master_kpis_financeiro    → KPIs sem trazer 5.000 faturas ao Node
--   5) fn_master_receita_por_mes    → série do gráfico agregada no banco
--   6) fn_dispositivos_cobraveis_por_tenant → 1 query no lugar de 1 RPC/tenant
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) tickets.entrada sem índice: `where entrada >= :inicio` (dashboard master,
--    fn_master_resumo_hoje) fazia Seq Scan na tabela de TODA a plataforma.
--
--    Os índices de db/01-schema.sql são todos prefixados por patio_id ou
--    tenant_id — nenhum serve para uma varredura global por data.
--
--    INCLUDE (status, valor_cobrado) permite index-only scan: o resumo do dia
--    nem toca no heap.
--
--    ⚠️ Em tabela grande e com o pátio operando, rode a versão CONCURRENTLY
--    (fora de bloco de transação — no SQL Editor, sozinha na aba):
--
--      create index concurrently if not exists idx_tickets_entrada
--        on public.tickets (entrada desc) include (status, valor_cobrado);
-- ----------------------------------------------------------------------------
create index if not exists idx_tickets_entrada
  on public.tickets (entrada desc)
  include (status, valor_cobrado);


-- ----------------------------------------------------------------------------
-- 2) Resumo do dia da plataforma (card "Saúde da carteira" do /master).
--
--    Antes: select de até 10.000 linhas de tickets para contar e somar no Node.
--    Agora: uma linha. O corte do dia é em America/Sao_Paulo — "hoje" para o
--    operador do pátio é o dia dele, não o UTC.
-- ----------------------------------------------------------------------------
create or replace function public.fn_master_resumo_hoje()
returns table (tickets bigint, faturamento numeric)
language sql
stable
set search_path = public
as $$
  select
    count(*)::bigint,
    coalesce(sum(t.valor_cobrado) filter (where t.status = 'fechado'), 0)::numeric
  from public.tickets t
  where t.entrada >= (date_trunc('day', now() at time zone 'America/Sao_Paulo')
                      at time zone 'America/Sao_Paulo');
$$;


-- ----------------------------------------------------------------------------
-- 3) Faturas das assinaturas em TRIAL — versão set-based.
--
--    Substitui `garantirFaturasTrials` (web/src/lib/faturas-trial.ts), que
--    fazia, EM SÉRIE, 3 consultas por tenant em teste: reler a assinatura,
--    contar os pátios e procurar a fatura existente. Com 20 trials eram 60
--    idas e voltas antes do primeiro byte de /master/assinaturas.
--
--    A regra é a mesma, verbatim, do TS que ela aposenta:
--      competência = mês em que o trial expira (em UTC, como o Date do Node);
--      vencimento  = dia configurado nesse mês, nunca antes do fim do teste;
--      valor       = valor_por_patio × pátios ativos;
--      só gera quando há o que cobrar (valor > 0 e ≥ 1 pátio ativo).
--
--    O ON CONFLICT também fecha a corrida do check-then-insert antigo: duas
--    abas abrindo a página ao mesmo tempo não brigam mais pelo unique.
--
--    p_tenant = null (padrão) varre todos os trials — é o que a listagem usa.
--    p_tenant preenchido restringe a uma rede — é o que a tela de detalhe usa,
--    no lugar do antigo `garantirFaturaTrial(sb, tenantId)`.
-- ----------------------------------------------------------------------------
create or replace function public.fn_garantir_faturas_trials(
  p_tenant uuid default null
)
returns int
language plpgsql
set search_path = public
as $$
declare
  criadas int;
begin
  with trials as (
    select
      a.tenant_id,
      coalesce(a.valor_por_patio, 0) as valor_por_patio,
      -- clamp idêntico ao do TS: Math.min(28, Math.max(1, diaVenc || 10))
      greatest(1, least(28, coalesce(nullif(a.dia_vencimento, 0), 10))) as dia,
      -- o TS lê o mês com getUTCFullYear/getUTCMonth — casar o fuso aqui
      (a.trial_expira_em at time zone 'UTC') as expira_utc,
      (
        select count(*)
          from public.patios p
         where p.tenant_id = a.tenant_id
           and p.ativo = true
      ) as qtd_patios
    from public.assinaturas a
    where a.estado = 'trial'
      and a.trial_expira_em is not null
      and coalesce(a.valor_por_patio, 0) > 0
      and (p_tenant is null or a.tenant_id = p_tenant)
  ),
  calc as (
    select
      tenant_id,
      valor_por_patio,
      qtd_patios,
      date_trunc('month', expira_utc)::date as competencia,
      -- vencimento nunca antes do fim do teste
      greatest(
        (date_trunc('month', expira_utc) + (dia - 1) * interval '1 day')::date,
        expira_utc::date
      ) as vencimento
    from trials
    where qtd_patios > 0
  )
  insert into public.faturas
    (tenant_id, competencia, vencimento, valor, valor_por_patio, qtd_patios)
  select
    tenant_id,
    competencia,
    vencimento,
    valor_por_patio * qtd_patios,
    valor_por_patio,
    qtd_patios
  from calc
  on conflict (tenant_id, competencia) do nothing;

  get diagnostics criadas = row_count;
  return criadas;
end $$;


-- ----------------------------------------------------------------------------
-- 4) KPIs do /master/financeiro em uma linha.
--
--    Antes: `.limit(5000)` de faturas trafegadas para somar quatro números.
--    p_competencia = 1º dia do mês corrente por padrão.
--
--    O mês corrente é o de America/Sao_Paulo, não o do `current_date` (UTC no
--    Supabase). Entre 21:00 e 00:00 BRT do último dia do mês o UTC já virou, e
--    o painel mostraria "recebido no mês" do mês seguinte — zerado — enquanto
--    para quem olha a tela ainda é dia 31.
-- ----------------------------------------------------------------------------
create or replace function public.fn_master_kpis_financeiro(
  p_competencia date default date_trunc(
    'month', (now() at time zone 'America/Sao_Paulo')
  )::date
)
returns table (
  recebido_mes    numeric,
  previsto_mes    numeric,
  total_vencido   numeric,
  redes_vencidas  bigint,
  recebido_total  numeric
)
language sql
stable
set search_path = public
as $$
  select
    coalesce(sum(f.valor) filter (
      where f.competencia = date_trunc('month', p_competencia)::date
        and f.estado = 'paga'), 0)::numeric,
    coalesce(sum(f.valor) filter (
      where f.competencia = date_trunc('month', p_competencia)::date
        and f.estado <> 'cancelada'), 0)::numeric,
    coalesce(sum(f.valor) filter (where f.estado = 'vencida'), 0)::numeric,
    count(distinct f.tenant_id) filter (where f.estado = 'vencida')::bigint,
    coalesce(sum(f.valor) filter (where f.estado = 'paga'), 0)::numeric
  from public.faturas f;
$$;


-- ----------------------------------------------------------------------------
-- 5) Série do gráfico "Receita recebida (N meses)" — agregada no banco.
--    Devolve os meses SEM buraco (generate_series), inclusive os zerados, para
--    a tela não ter que preencher lacuna nenhuma.
-- ----------------------------------------------------------------------------
create or replace function public.fn_master_receita_por_mes(p_meses int default 6)
returns table (competencia date, valor numeric)
language sql
stable
set search_path = public
as $$
  select
    m.competencia::date,
    coalesce(sum(f.valor), 0)::numeric
  from generate_series(
         date_trunc('month', (now() at time zone 'America/Sao_Paulo'))
           - ((greatest(p_meses, 1) - 1) * interval '1 month'),
         date_trunc('month', (now() at time zone 'America/Sao_Paulo')),
         interval '1 month'
       ) as m(competencia)
  left join public.faturas f
    on f.competencia = m.competencia::date
   and f.estado = 'paga'
  group by m.competencia
  order by m.competencia;
$$;


-- ----------------------------------------------------------------------------
-- 6) Dispositivos extras cobráveis de TODOS os tenants, de uma vez.
--
--    /master/dispositivos chamava fn_contar_dispositivos_cobraveis uma vez por
--    tenant (Promise.all → fan-out sem limite no pooler). Mesma regra de
--    negócio da função por tenant (db/26), só que agrupada.
--
--    A função singular continua existindo — fn_gerar_faturas_mes usa ela.
-- ----------------------------------------------------------------------------
create or replace function public.fn_dispositivos_cobraveis_por_tenant()
returns table (tenant_id uuid, cobraveis int)
language sql
stable
set search_path = public
as $$
  select d.tenant_id, count(*)::int
    from public.dispositivos d
   where d.licenca = 'licenciado'
     and d.status in ('ativo', 'bloqueado')
   group by d.tenant_id;
$$;


-- ----------------------------------------------------------------------------
-- 7) PRIVILÉGIOS — estas funções são do CONSOLE MASTER, de mais ninguém.
--
--    `create function` concede EXECUTE a PUBLIC por padrão, e o PostgREST expõe
--    tudo que está em `public` como `POST /rest/v1/rpc/<nome>`. Sem o revoke
--    abaixo, um `anon` com a chave publicável chamaria fn_master_kpis_financeiro
--    e leria o faturamento da plataforma inteira — exatamente o que a RLS da
--    tabela `faturas` existe para impedir (db/10: "faturas são dados da
--    PLATAFORMA. O gestor NÃO deve ver").
--
--    Nenhuma delas é `security definer` de propósito: quem chama é sempre o
--    service_role, que já ignora RLS. Não há razão para elevar privilégio.
--
--    fn_contar_dispositivos_cobraveis fica DE FORA: fn_gerar_faturas_mes chama
--    ela por dentro e mexer nos privilégios dela é assunto de outra migration.
-- ----------------------------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.fn_master_resumo_hoje()',
    'public.fn_garantir_faturas_trials(uuid)',
    'public.fn_master_kpis_financeiro(date)',
    'public.fn_master_receita_por_mes(int)',
    'public.fn_dispositivos_cobraveis_por_tenant()'
  ]
  loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon', f);
    execute format('revoke all on function %s from authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;


-- ============================================================================
-- Verificações (rode manualmente depois de aplicar):
--
--   -- quem pode executar? só service_role deve aparecer:
--   select p.proname, p.proacl
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('fn_master_resumo_hoje','fn_garantir_faturas_trials',
--                        'fn_master_kpis_financeiro','fn_master_receita_por_mes',
--                        'fn_dispositivos_cobraveis_por_tenant');
--
--
--   -- o índice está sendo usado?
--   explain analyze select count(*), sum(valor_cobrado) from public.tickets
--   where entrada >= date_trunc('day', now());
--   -- deve aparecer "Index Only Scan using idx_tickets_entrada"
--
--   select * from public.fn_master_resumo_hoje();
--   select public.fn_garantir_faturas_trials();   -- idempotente: 2ª vez = 0
--   select * from public.fn_master_kpis_financeiro();
--   select * from public.fn_master_receita_por_mes(6);
--   select * from public.fn_dispositivos_cobraveis_por_tenant();
-- ============================================================================
