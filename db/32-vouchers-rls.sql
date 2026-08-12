-- ============================================================================
-- NuvemPark — 32: Vouchers, RLS do GESTOR
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor. Idempotente.
--
-- Escopo por tenant, no mesmo molde de db/02-rls.sql e db/17-faturas-rls-gestor.
-- As policies do PARCEIRO ficam em db/33: elas dependem de
-- `public.current_parceiro_id()`, que nasce lá.
--
-- Nem toda tabela ganha CRUD completo, e a assimetria é o ponto:
--
--   liberacoes             gestor LÊ e CANCELA, não cria.
--                          Criar libera desconto — é ato do parceiro, pelo
--                          fluxo com cota. Um gestor inserindo à mão fura o
--                          limite e some do rastro de quem pediu.
--   parceiro_competencias  gestor só LÊ. Os totais saem da função de
--                          fechamento (db/35); editar à mão é reescrever uma
--                          cobrança já emitida.
--
-- ⚠️ `(select public.current_tenant_id())` e não `public.current_tenant_id()`
-- direto. Sem o `select` em volta, o planejador chama a função UMA VEZ POR
-- LINHA avaliada; com ele, o resultado é calculado uma vez e reaproveitado. A
-- diferença é de 5–10× em tabela grande, e `liberacoes` é a que mais cresce
-- aqui. As policies antigas do projeto (db/02, db/17) ainda usam a forma sem
-- `select` — vale uma migração de acerto, fora do escopo desta.
-- ============================================================================

alter table public.voucher_regras        enable row level security;
alter table public.parceiros             enable row level security;
alter table public.parceiro_regras       enable row level security;
alter table public.usuarios_parceiro     enable row level security;
alter table public.liberacoes            enable row level security;
alter table public.parceiro_competencias enable row level security;

-- ── CRUD completo para o gestor ─────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'voucher_regras', 'parceiros', 'parceiro_regras', 'usuarios_parceiro'
  ] loop
    execute format($f$
      drop policy if exists %I on public.%I;
      create policy %I on public.%I
        for select to authenticated
        using (tenant_id = (select public.current_tenant_id()));
    $f$, 'gestor_select_'||t, t, 'gestor_select_'||t, t);

    execute format($f$
      drop policy if exists %I on public.%I;
      create policy %I on public.%I
        for insert to authenticated
        with check (tenant_id = (select public.current_tenant_id()));
    $f$, 'gestor_insert_'||t, t, 'gestor_insert_'||t, t);

    execute format($f$
      drop policy if exists %I on public.%I;
      create policy %I on public.%I
        for update to authenticated
        using (tenant_id = (select public.current_tenant_id()))
        with check (tenant_id = (select public.current_tenant_id()));
    $f$, 'gestor_update_'||t, t, 'gestor_update_'||t, t);

    execute format($f$
      drop policy if exists %I on public.%I;
      create policy %I on public.%I
        for delete to authenticated
        using (tenant_id = (select public.current_tenant_id()));
    $f$, 'gestor_delete_'||t, t, 'gestor_delete_'||t, t);
  end loop;
end $$;

-- ── liberacoes: lê e cancela; não cria, não apaga ───────────────────────────
drop policy if exists gestor_select_liberacoes on public.liberacoes;
create policy gestor_select_liberacoes on public.liberacoes
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

-- O UPDATE existe para o cancelamento (tela de divergências). O `with check`
-- repete o escopo para impedir que uma linha seja movida para outro tenant.
drop policy if exists gestor_update_liberacoes on public.liberacoes;
create policy gestor_update_liberacoes on public.liberacoes
  for update to authenticated
  using (tenant_id = (select public.current_tenant_id()))
  with check (tenant_id = (select public.current_tenant_id()));

-- SEM policy de INSERT/DELETE para authenticated: liberação nasce do parceiro
-- (db/34) e nunca é apagada — cancelar preserva o histórico.

-- ── parceiro_competencias: somente leitura ──────────────────────────────────
drop policy if exists gestor_select_competencias on public.parceiro_competencias;
create policy gestor_select_competencias on public.parceiro_competencias
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

-- ============================================================================
-- VALIDAÇÃO
--
-- 1) RLS ligada nas seis (deve retornar 6 linhas com rowsecurity = true):
-- select relname, relrowsecurity from pg_class
--  where relname in ('voucher_regras','parceiros','parceiro_regras',
--                    'usuarios_parceiro','liberacoes','parceiro_competencias');
--
-- 2) liberacoes NÃO pode ter policy de insert/delete para authenticated
--    (deve retornar 0 linhas):
-- select policyname, cmd from pg_policies
--  where tablename = 'liberacoes' and cmd in ('INSERT','DELETE');
--
-- 3) Logado como gestor do tenant A, nenhuma linha do tenant B aparece:
-- select count(*) from public.parceiros;      -- só os do próprio tenant
-- select count(*) from public.liberacoes;     -- idem
--
-- 4) Gestor não consegue inserir liberação à mão (deve falhar por RLS):
-- insert into public.liberacoes (tenant_id, patio_id, ticket_id, parceiro_id, regra_id)
--   values (public.current_tenant_id(), '...', '...', '...', '...');
--   -- espera-se: new row violates row-level security policy
-- ============================================================================
