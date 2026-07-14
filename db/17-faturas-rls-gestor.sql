-- ============================================================================
-- NuvemPark — 17: Gestor lê as próprias faturas (RLS SELECT)
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor. Idempotente.
--
-- db/10 habilitou RLS em faturas SEM policy para authenticated (só master via
-- service_role lia). Para a página /painel/assinatura mostrar as faturas do
-- gestor SEM service_role, adicionamos SOMENTE SELECT, escopado ao tenant.
-- Gestor não cria/edita/cancela fatura — isso é do master/webhook (Asaas).
-- ============================================================================

alter table public.faturas enable row level security;

drop policy if exists faturas_select_gestor on public.faturas;
create policy faturas_select_gestor on public.faturas
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

-- SEM policy de INSERT/UPDATE/DELETE para authenticated => gestor só lê.
-- (service_role continua bypassando a RLS para o console master.)

-- ============================================================================
-- VALIDAÇÃO (logado como gestor, deve retornar só as faturas do próprio tenant):
-- select competencia, vencimento, valor, estado from public.faturas
--   order by competencia desc limit 5;
-- ============================================================================
