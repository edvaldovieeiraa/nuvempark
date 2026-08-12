-- ============================================================================
-- NuvemPark — 33: Vouchers, acesso do PARCEIRO
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor. Idempotente.
--
-- O usuário do parceiro entra pelo mesmo Supabase Auth do gestor, mas NÃO tem
-- a claim `tenant_id`. Consequência que decide o desenho desta migração:
-- `public.current_tenant_id()` devolve NULL para ele, e portanto ele não lê
-- UMA LINHA sequer de `tickets`, `patios` ou qualquer tabela do tenant.
--
-- Isso é a garantia que queremos, não um obstáculo. A busca de ticket passa a
-- ser uma função de escopo fixo, que devolve só placa, entrada e situação —
-- e nunca valor, cliente, histórico ou ticket de outro pátio. O sigilo fica
-- garantido pela ASSINATURA da função, e não pela disciplina de quem escreve
-- a consulta na aplicação.
-- ============================================================================

-- ── Quem é o parceiro da sessão ─────────────────────────────────────────────
-- SECURITY DEFINER por necessidade: as policies abaixo chamam esta função, e
-- ela lê `usuarios_parceiro` — que tem policy. Sem o DEFINER, avaliar a policy
-- de `usuarios_parceiro` chamaria a função, que leria a tabela, que avaliaria a
-- policy: recursão infinita. O DEFINER roda como dono e ignora RLS.
create or replace function public.current_parceiro_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select up.parceiro_id
    from public.usuarios_parceiro up
    join public.parceiros p on p.id = up.parceiro_id
   where up.auth_user_id = (select auth.uid())
     and up.ativo
     and p.ativo
   limit 1
$$;

revoke all on function public.current_parceiro_id() from public;
grant execute on function public.current_parceiro_id() to authenticated;

-- ── O parceiro enxerga a si mesmo ───────────────────────────────────────────
drop policy if exists parceiro_select_proprio_usuario on public.usuarios_parceiro;
create policy parceiro_select_proprio_usuario on public.usuarios_parceiro
  for select to authenticated
  using (auth_user_id = (select auth.uid()));

drop policy if exists parceiro_select_proprio on public.parceiros;
create policy parceiro_select_proprio on public.parceiros
  for select to authenticated
  using (id = (select public.current_parceiro_id()));

-- ── ... e só as regras que lhe foram concedidas ─────────────────────────────
drop policy if exists parceiro_select_vinculos on public.parceiro_regras;
create policy parceiro_select_vinculos on public.parceiro_regras
  for select to authenticated
  using (parceiro_id = (select public.current_parceiro_id()));

drop policy if exists parceiro_select_regras on public.voucher_regras;
create policy parceiro_select_regras on public.voucher_regras
  for select to authenticated
  using (
    ativo
    and exists (
      select 1 from public.parceiro_regras pr
       where pr.regra_id = voucher_regras.id
         and pr.parceiro_id = (select public.current_parceiro_id())
    )
  );

-- ── ... e o próprio histórico ───────────────────────────────────────────────
drop policy if exists parceiro_select_liberacoes on public.liberacoes;
create policy parceiro_select_liberacoes on public.liberacoes
  for select to authenticated
  using (parceiro_id = (select public.current_parceiro_id()));

-- SEM policy de INSERT/UPDATE/DELETE em `liberacoes` para o parceiro. Criar é
-- pela função de db/34, que valida cota na mesma transação; cancelar é do
-- gestor. Um parceiro que pudesse dar UPDATE zeraria o próprio consumo.

-- ── Busca de ticket, com o escopo cravado na função ─────────────────────────
-- Devolve SOMENTE o necessário para decidir a liberação. Não existe caminho
-- por onde valor, forma de pagamento ou dados do cliente escapem: eles não
-- estão no tipo de retorno.
--
-- `p_placa` casa por sufixo além de igualdade porque o balconista digita o que
-- o cliente fala, e o cliente costuma falar os quatro últimos caracteres.
create or replace function public.buscar_tickets_parceiro(p_placa text)
returns table (
  ticket_id  text,
  placa      text,
  entrada    timestamptz,
  ja_liberado boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id,
         t.placa,
         t.entrada,
         exists (
           select 1 from public.liberacoes l
            where l.ticket_id = t.id and l.cancelada_em is null
         )
    from public.tickets t
    join public.parceiros p
      on p.id = (select public.current_parceiro_id())
     and p.patio_id = t.patio_id
   where t.status = 'aberto'
     and length(coalesce(p_placa, '')) >= 3
     and (
       upper(t.placa) = upper(p_placa)
       or upper(t.placa) like '%' || upper(p_placa)
     )
   order by t.entrada desc
   limit 20
$$;

revoke all on function public.buscar_tickets_parceiro(text) from public;
grant execute on function public.buscar_tickets_parceiro(text) to authenticated;

-- Mesma coisa pela leitura do QR do cupom: o parceiro tem o id em mãos e
-- precisa confirmar que o ticket é do pátio dele e ainda está aberto.
create or replace function public.obter_ticket_parceiro(p_ticket_id text)
returns table (
  ticket_id  text,
  placa      text,
  entrada    timestamptz,
  ja_liberado boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id,
         t.placa,
         t.entrada,
         exists (
           select 1 from public.liberacoes l
            where l.ticket_id = t.id and l.cancelada_em is null
         )
    from public.tickets t
    join public.parceiros p
      on p.id = (select public.current_parceiro_id())
     and p.patio_id = t.patio_id
   where t.id = p_ticket_id
     and t.status = 'aberto'
$$;

revoke all on function public.obter_ticket_parceiro(text) from public;
grant execute on function public.obter_ticket_parceiro(text) to authenticated;

-- ============================================================================
-- VALIDAÇÃO (logado COMO USUÁRIO DE PARCEIRO)
--
-- 1) A função identifica o parceiro:
-- select public.current_parceiro_id();          -- não pode ser null
--
-- 2) O parceiro NÃO lê tickets direto (deve retornar 0):
-- select count(*) from public.tickets;
--
-- 3) A busca funciona e só traz o pátio dele:
-- select * from public.buscar_tickets_parceiro('1D23');
--
-- 4) Só as regras concedidas aparecem:
-- select nome from public.voucher_regras;
--
-- 5) Ele não consegue inserir nem alterar liberação (ambos devem falhar):
-- insert into public.liberacoes (tenant_id, patio_id, ticket_id, parceiro_id, regra_id)
--   values ('...','...','...', public.current_parceiro_id(), '...');
-- update public.liberacoes set cancelada_em = now();
--
-- 6) Ticket de OUTRO pátio não é encontrado nem pelo id exato:
-- select * from public.obter_ticket_parceiro('<id de outro patio>');  -- 0 linhas
-- ============================================================================
