-- ============================================================================
-- NuvemPark — 34: Vouchers, liberação com cota
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor. Idempotente.
--
-- Toda a validação da liberação vive AQUI, e não na aplicação, por um motivo
-- que não é preferência: o balconista abre duas abas. Duas requisições
-- simultâneas que leem "9 de 10 usadas" e ambas inserem deixam o parceiro em
-- 11. Validar no Node e inserir depois é exatamente esse bug.
--
-- Duas travas, para duas corridas diferentes:
--
--   `select ... for update` na linha do parceiro  -> serializa a CONTAGEM.
--                                                    A segunda transação espera
--                                                    a primeira e recontará 10.
--   índice único parcial em liberacoes(ticket_id) -> impede DUAS liberações no
--   (db/31)                                          mesmo ticket, mesmo que
--                                                    venham de parceiros
--                                                    diferentes ao mesmo tempo.
--
-- SECURITY DEFINER porque o parceiro não tem policy de INSERT em `liberacoes`
-- (db/33) — de propósito: o único caminho para criar uma liberação é este, com
-- as validações junto. `tenant_id` e `patio_id` saem do parceiro da sessão e
-- nunca do argumento: cliente não escolhe em que pátio grava.
--
-- ERROS (a aplicação traduz pelo SQLSTATE, não pela mensagem):
--   NPV01  cota esgotada
--   NPV02  regra não concedida a este parceiro
--   NPV03  ticket inexistente, fechado, ou de outro pátio
--   NPV04  ticket já tem liberação ativa
--   NPV05  sessão não é de um parceiro ativo
-- ============================================================================

create or replace function public.liberar_ticket(
  p_ticket_id text,
  p_regra_id  uuid
)
returns public.liberacoes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parceiro    public.parceiros;
  v_usuario_id  uuid;
  v_usadas      integer;
  v_inicio      timestamptz;
  v_ticket      record;
  v_liberacao   public.liberacoes;
begin
  -- ── Quem está pedindo ─────────────────────────────────────────────────────
  select up.id into v_usuario_id
    from public.usuarios_parceiro up
   where up.auth_user_id = auth.uid() and up.ativo;

  if v_usuario_id is null then
    raise exception 'parceiro_inativo' using errcode = 'NPV05';
  end if;

  -- A TRAVA. Tudo daqui para baixo, para este parceiro, acontece em fila.
  select p.* into v_parceiro
    from public.parceiros p
    join public.usuarios_parceiro up on up.parceiro_id = p.id
   where up.id = v_usuario_id and p.ativo
     for update of p;

  if v_parceiro.id is null then
    raise exception 'parceiro_inativo' using errcode = 'NPV05';
  end if;

  -- ── A regra é dele? ───────────────────────────────────────────────────────
  if not exists (
    select 1
      from public.parceiro_regras pr
      join public.voucher_regras vr on vr.id = pr.regra_id
     where pr.parceiro_id = v_parceiro.id
       and pr.regra_id = p_regra_id
       and vr.ativo
  ) then
    raise exception 'regra_nao_permitida' using errcode = 'NPV02';
  end if;

  -- ── O ticket é do pátio dele e está aberto? ───────────────────────────────
  select t.id, t.patio_id, t.tenant_id into v_ticket
    from public.tickets t
   where t.id = p_ticket_id
     and t.status = 'aberto'
     and t.patio_id = v_parceiro.patio_id;

  if v_ticket.id is null then
    raise exception 'ticket_indisponivel' using errcode = 'NPV03';
  end if;

  -- Checagem explícita além do índice único: dá mensagem específica em vez de
  -- deixar estourar violação de constraint. O índice continua sendo a garantia
  -- real — este `if` perde a corrida às vezes, e tudo bem.
  if exists (
    select 1 from public.liberacoes l
     where l.ticket_id = p_ticket_id and l.cancelada_em is null
  ) then
    raise exception 'ja_liberado' using errcode = 'NPV04';
  end if;

  -- ── Cota ──────────────────────────────────────────────────────────────────
  -- limite_quantidade nulo = sem limite (db/31 garante que período acompanha).
  if v_parceiro.limite_quantidade is not null then
    -- Fuso explícito: `date_trunc('month', now())` usaria o fuso da sessão, que
    -- no Supabase é UTC. A virada do mês aconteceria às 21h do dia 30 no
    -- horário de Brasília, e o lojista veria a cota renovar antes da hora.
    v_inicio := case v_parceiro.limite_periodo
      when 'mes' then date_trunc('month', now() at time zone 'America/Sao_Paulo')
                       at time zone 'America/Sao_Paulo'
      else '-infinity'::timestamptz
    end;

    -- Canceladas não contam: devolver a cota é justamente o efeito de cancelar.
    select count(*) into v_usadas
      from public.liberacoes l
     where l.parceiro_id = v_parceiro.id
       and l.cancelada_em is null
       and l.liberado_em >= v_inicio;

    if v_usadas >= v_parceiro.limite_quantidade then
      raise exception 'cota_esgotada' using errcode = 'NPV01';
    end if;
  end if;

  -- ── Grava ─────────────────────────────────────────────────────────────────
  insert into public.liberacoes (
    tenant_id, patio_id, ticket_id, parceiro_id, regra_id, usuario_parceiro_id
  ) values (
    v_parceiro.tenant_id, v_parceiro.patio_id, p_ticket_id,
    v_parceiro.id, p_regra_id, v_usuario_id
  )
  returning * into v_liberacao;

  return v_liberacao;
end $$;

revoke all on function public.liberar_ticket(text, uuid) from public;
grant execute on function public.liberar_ticket(text, uuid) to authenticated;

-- ── Consumo da cota, para a tela do parceiro mostrar "38 de 50" ─────────────
create or replace function public.consumo_cota_parceiro()
returns table (
  limite_quantidade integer,
  limite_periodo    text,
  usadas            integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.limite_quantidade,
         p.limite_periodo,
         (select count(*)::integer
            from public.liberacoes l
           where l.parceiro_id = p.id
             and l.cancelada_em is null
             and l.liberado_em >= case p.limite_periodo
                   when 'mes' then date_trunc('month', now() at time zone 'America/Sao_Paulo')
                                    at time zone 'America/Sao_Paulo'
                   else '-infinity'::timestamptz
                 end)
    from public.parceiros p
   where p.id = public.current_parceiro_id()
$$;

revoke all on function public.consumo_cota_parceiro() from public;
grant execute on function public.consumo_cota_parceiro() to authenticated;

-- ── Cancelamento, do lado do gestor ─────────────────────────────────────────
-- Devolve a cota (a contagem ignora canceladas) e preserva o histórico.
create or replace function public.cancelar_liberacao(
  p_liberacao_id uuid,
  p_motivo       text
)
returns public.liberacoes
language plpgsql
security invoker
set search_path = ''
as $$
declare v_liberacao public.liberacoes;
begin
  update public.liberacoes
     set cancelada_em = now(),
         cancelada_motivo = p_motivo
   where id = p_liberacao_id
     and cancelada_em is null
  returning * into v_liberacao;

  if v_liberacao.id is null then
    raise exception 'liberacao_inexistente_ou_ja_cancelada' using errcode = 'NPV06';
  end if;
  return v_liberacao;
end $$;

-- SECURITY INVOKER de propósito: o cancelamento tem de passar pela policy de
-- UPDATE do gestor (db/32), que já escopa por tenant. Um DEFINER aqui deixaria
-- qualquer autenticado cancelar liberação de qualquer tenant.
revoke all on function public.cancelar_liberacao(uuid, text) from public;
grant execute on function public.cancelar_liberacao(uuid, text) to authenticated;

-- ============================================================================
-- VALIDAÇÃO
--
-- 1) Cota, com parceiro de limite 1 (a segunda deve falhar com NPV01):
-- select public.liberar_ticket('<ticket A>', '<regra>');
-- select public.liberar_ticket('<ticket B>', '<regra>');
--
-- 2) Corrida real — em DUAS sessões, com 1 de cota restante. Sessão 1:
--      begin; select public.liberar_ticket('<ticket A>', '<regra>');
--    Sessão 2 (vai BLOQUEAR no for update):
--      begin; select public.liberar_ticket('<ticket B>', '<regra>');
--    Sessão 1: commit;  -> sessão 2 destrava e falha com NPV01. Correto.
--
-- 3) Mesmo ticket duas vezes -> NPV04:
-- select public.liberar_ticket('<ticket A>', '<regra>');
--
-- 4) Regra de outro parceiro -> NPV02.
-- 5) Ticket de outro pátio -> NPV03.
-- 6) Cancelar devolve a cota:
-- select public.cancelar_liberacao('<id>', 'teste');
-- select * from public.consumo_cota_parceiro();   -- usadas diminuiu
-- ============================================================================
