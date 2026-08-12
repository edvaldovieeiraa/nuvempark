-- ============================================================================
-- NuvemPark — 35: Vouchers, fechamento de competência
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor. Idempotente.
--
-- Fecha o mês de um parceiro faturado: carimba as liberações, soma o que foi
-- abatido e grava o total que vira cobrança.
--
-- O CRITÉRIO NÃO É "liberações do mês", e essa é a decisão que evita perder
-- dinheiro. Um carro liberado em 31/janeiro que sai em 02/fevereiro só tem
-- `valor_abatido` em fevereiro — o desconto é conhecido na SAÍDA, não na
-- liberação. Fechar janeiro por data de liberação deixaria esse valor fora de
-- janeiro; e fevereiro, filtrando por data de liberação, também não o pegaria.
-- Ele sumiria para sempre.
--
-- Então o critério é: toda liberação AINDA NÃO CARIMBADA que já tem valor
-- conhecido e foi liberada antes do fim desta competência. O retardatário de
-- janeiro entra no fechamento de fevereiro, que é quando se soube quanto foi.
-- A conta se autocorrige e nada escapa.
-- ============================================================================

create or replace function public.fechar_competencia(
  p_parceiro_id uuid,
  p_competencia text
)
returns public.parceiro_competencias
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parceiro   public.parceiros;
  v_existente  public.parceiro_competencias;
  v_fim        timestamptz;
  v_resultado  public.parceiro_competencias;
begin
  if p_competencia !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'competencia_invalida' using errcode = 'NPV10';
  end if;

  -- DEFINER exige checar o tenant à mão: a função ignora RLS, então sem isto
  -- um gestor fecharia a competência de parceiro de outro cliente.
  select p.* into v_parceiro
    from public.parceiros p
   where p.id = p_parceiro_id
     and p.tenant_id = public.current_tenant_id()
     for update of p;

  if v_parceiro.id is null then
    raise exception 'parceiro_inexistente' using errcode = 'NPV11';
  end if;

  -- Já fechada: devolve o que existe, sem recalcular nem duplicar. Idempotente
  -- de propósito — um duplo clique no botão não pode emitir duas cobranças, e
  -- erro aqui obrigaria a tela a distinguir "falhou" de "já estava feito".
  select * into v_existente
    from public.parceiro_competencias
   where parceiro_id = p_parceiro_id and competencia = p_competencia;

  if v_existente.id is not null then
    return v_existente;
  end if;

  -- Início do mês SEGUINTE à competência, no fuso de Brasília (mesmo motivo do
  -- cálculo de cota em db/34: a sessão do Supabase é UTC).
  v_fim := ((p_competencia || '-01')::timestamp + interval '1 month')
             at time zone 'America/Sao_Paulo';

  -- Fechar mês que ainda não terminou produziria uma cobrança parcial que
  -- ninguém conseguiria completar depois — a competência já estaria gravada.
  if v_fim > now() then
    raise exception 'competencia_em_aberto' using errcode = 'NPV12';
  end if;

  update public.liberacoes
     set competencia = p_competencia
   where parceiro_id = p_parceiro_id
     and cancelada_em is null
     and competencia is null
     and valor_abatido is not null
     and liberado_em < v_fim;

  insert into public.parceiro_competencias (
    tenant_id, parceiro_id, competencia, total_liberacoes, total_abatido
  )
  select v_parceiro.tenant_id,
         p_parceiro_id,
         p_competencia,
         count(*)::integer,
         coalesce(sum(l.valor_abatido), 0)
    from public.liberacoes l
   where l.parceiro_id = p_parceiro_id
     and l.competencia = p_competencia
     and l.cancelada_em is null
  returning * into v_resultado;

  return v_resultado;
end $$;

revoke all on function public.fechar_competencia(uuid, text) from public;
grant execute on function public.fechar_competencia(uuid, text) to authenticated;

-- ── Prévia, para a tela mostrar antes de fechar ─────────────────────────────
-- Mesmo critério da função acima. Serve para o gestor conferir o número antes
-- de gravar algo que não se desfaz.
create or replace function public.previa_competencia(
  p_parceiro_id uuid,
  p_competencia text
)
returns table (
  total_liberacoes integer,
  total_abatido    numeric,
  ja_fechada       boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::integer
       from public.liberacoes l
       join public.parceiros p on p.id = l.parceiro_id
      where l.parceiro_id = p_parceiro_id
        and p.tenant_id = public.current_tenant_id()
        and l.cancelada_em is null
        and l.competencia is null
        and l.valor_abatido is not null
        and l.liberado_em < ((p_competencia || '-01')::timestamp + interval '1 month')
                              at time zone 'America/Sao_Paulo'),
    (select coalesce(sum(l.valor_abatido), 0)
       from public.liberacoes l
       join public.parceiros p on p.id = l.parceiro_id
      where l.parceiro_id = p_parceiro_id
        and p.tenant_id = public.current_tenant_id()
        and l.cancelada_em is null
        and l.competencia is null
        and l.valor_abatido is not null
        and l.liberado_em < ((p_competencia || '-01')::timestamp + interval '1 month')
                              at time zone 'America/Sao_Paulo'),
    exists (select 1 from public.parceiro_competencias pc
              where pc.parceiro_id = p_parceiro_id
                and pc.competencia = p_competencia)
$$;

revoke all on function public.previa_competencia(uuid, text) from public;
grant execute on function public.previa_competencia(uuid, text) to authenticated;

-- ============================================================================
-- VALIDAÇÃO
--
-- 1) Formato recusado -> NPV10:
-- select public.fechar_competencia('<parceiro>', '2026-13');
--
-- 2) Mês corrente recusado -> NPV12:
-- select public.fechar_competencia('<parceiro>', to_char(now(), 'YYYY-MM'));
--
-- 3) Fechamento normal e IDEMPOTÊNCIA (as duas devem devolver a MESMA linha,
--    com os mesmos totais):
-- select * from public.fechar_competencia('<parceiro>', '2026-07');
-- select * from public.fechar_competencia('<parceiro>', '2026-07');
--
-- 4) O retardatário: liberação de julho com saída em agosto NÃO entra em
--    julho (ainda sem valor) e entra no fechamento de agosto:
-- select competencia, valor_abatido from public.liberacoes
--  where parceiro_id = '<parceiro>' order by liberado_em;
--
-- 5) Prévia bate com o fechamento:
-- select * from public.previa_competencia('<parceiro>', '2026-07');
-- ============================================================================
