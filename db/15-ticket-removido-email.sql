-- ============================================================================
-- NuvemPark — 15: E-mail do autor da remoção de ticket
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor. Idempotente.
--
-- A página "Tickets removidos" lê da tabela tickets, que só guardava
-- removido_por_nome (sem e-mail). Adiciona removido_por_email desnormalizado
-- para exibir "nome — email" sem join em auth.users (que a RLS do tenant não
-- alcança). Nullable: cancelamentos vindos do app não preenchem.
-- ============================================================================

alter table public.tickets
  add column if not exists removido_por_email text;

comment on column public.tickets.removido_por_email is
  'E-mail do autor da remoção (gestor no painel). Null em cancelamentos do app.';

-- ============================================================================
-- VALIDAÇÃO: select removido_por_nome, removido_por_email from public.tickets
--            where status = 'removido' limit 1;
-- ============================================================================
