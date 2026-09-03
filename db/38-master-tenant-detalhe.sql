-- ============================================================================
-- NuvemPark — 38: Ficha da rede no console master (/master/tenants/<id>)
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor. Idempotente.
--
-- A ficha responde, numa tela só: quem é o cliente, onde ele está, quem entra
-- no painel, se o app foi instalado e se a operação está VIVA. As três últimas
-- perguntas são agregações sobre tickets/dispositivos — e o jeito errado de
-- respondê-las é trazer as linhas para o Node e contar lá.
--
-- Este arquivo segue a mesma linha do db/37: cada função abaixo existe para
-- que a página faça UMA ida ao banco no lugar de um laço.
--
--   1) fn_master_tenant_uso       → uso consolidado da rede (1 linha)
--   2) fn_master_tenant_patio_uso → o mesmo por pátio (1 linha por pátio)
--   3) idx_tickets_tenant_entrada → sustenta as duas
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Índice de apoio.
--
--    `idx_tickets_tenant` (db/01) é só (tenant_id) e `idx_tickets_entrada`
--    (db/37) é global por data. Nenhum dos dois serve para "os tickets DESTA
--    rede nos últimos 30 dias" sem ler o heap linha a linha. O composto
--    (tenant_id, entrada desc) resolve as duas funções abaixo, e o INCLUDE
--    permite index-only scan nas contagens/somas.
--
--    ⚠️ Com a tabela grande e pátio operando, rode a versão CONCURRENTLY
--    sozinha numa aba (fora de bloco de transação):
--
--      create index concurrently if not exists idx_tickets_tenant_entrada
--        on public.tickets (tenant_id, entrada desc)
--        include (status, valor_cobrado, patio_id);
-- ----------------------------------------------------------------------------
create index if not exists idx_tickets_tenant_entrada
  on public.tickets (tenant_id, entrada desc)
  include (status, valor_cobrado, patio_id);


-- ----------------------------------------------------------------------------
-- 2) fn_master_tenant_uso — a rede está viva?
--
--    Uma varredura só de tickets, com os recortes em FILTER. Faturamento conta
--    apenas ticket 'fechado' (mesma regra de fn_master_resumo_hoje, db/37):
--    aberto ainda não cobrou, removido/cancelado não vale.
--
--    A janela de 30 dias é corrida (now() - 30d), não mês civil — a pergunta
--    aqui é "mexeu recentemente?", não "quanto faturou em agosto".
-- ----------------------------------------------------------------------------
create or replace function public.fn_master_tenant_uso(p_tenant uuid)
returns table (
  tickets_total        bigint,
  tickets_30d          bigint,
  tickets_abertos      bigint,
  faturamento_total    numeric,
  faturamento_30d      numeric,
  primeiro_ticket      timestamptz,
  ultimo_ticket        timestamptz,
  patios_com_movimento bigint
)
language sql
stable
set search_path = public
as $$
  select
    count(*)::bigint,
    count(*) filter (where t.entrada >= now() - interval '30 days')::bigint,
    count(*) filter (where t.status = 'aberto')::bigint,
    coalesce(sum(t.valor_cobrado) filter (where t.status = 'fechado'), 0)::numeric,
    coalesce(sum(t.valor_cobrado) filter (
      where t.status = 'fechado' and t.entrada >= now() - interval '30 days'
    ), 0)::numeric,
    min(t.entrada),
    max(t.entrada),
    count(distinct t.patio_id)::bigint
  from public.tickets t
  where t.tenant_id = p_tenant;
$$;


-- ----------------------------------------------------------------------------
-- 3) fn_master_tenant_patio_uso — o mesmo recorte, por pátio.
--
--    Devolve SÓ os pátios que já tiveram movimento. O Node casa isso com a
--    lista de pátios (que ele já tem) — pátio ausente daqui é pátio que nunca
--    emitiu ticket, e essa é justamente a informação comercial interessante.
-- ----------------------------------------------------------------------------
create or replace function public.fn_master_tenant_patio_uso(p_tenant uuid)
returns table (
  patio_id      uuid,
  tickets       bigint,
  tickets_30d   bigint,
  faturamento   numeric,
  ultimo_ticket timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    t.patio_id,
    count(*)::bigint,
    count(*) filter (where t.entrada >= now() - interval '30 days')::bigint,
    coalesce(sum(t.valor_cobrado) filter (where t.status = 'fechado'), 0)::numeric,
    max(t.entrada)
  from public.tickets t
  where t.tenant_id = p_tenant
  group by t.patio_id;
$$;


-- ============================================================================
-- VALIDAÇÃO (rode à mão, trocando o uuid):
--   select * from public.fn_master_tenant_uso('<tenant_id>');
--   select * from public.fn_master_tenant_patio_uso('<tenant_id>');
--   explain analyze select * from public.fn_master_tenant_uso('<tenant_id>');
--   -- deve usar idx_tickets_tenant_entrada
-- ============================================================================
