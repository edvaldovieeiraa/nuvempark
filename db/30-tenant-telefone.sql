-- ============================================================================
-- NuvemPark — 30: Telefone de contato da rede
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor. Idempotente.
--
-- Capturado no self-signup (/cadastro) e editável pelo gestor na seção
-- "Sua rede" (Configurações) via policy tenant_self_update (db/02-rls.sql).
-- Guarda SÓ dígitos (10 = fixo, 11 = celular, ambos com DDD); a máscara e a
-- validação ficam no client (web/src/lib/telefone.ts) + no server action.
-- ============================================================================

alter table public.tenants add column if not exists telefone text;

comment on column public.tenants.telefone is
  'Telefone/WhatsApp de contato da rede — somente dígitos com DDD (10 ou 11).';

-- ============================================================================
-- VALIDAÇÃO: select nome, telefone from public.tenants limit 1;
-- ============================================================================
