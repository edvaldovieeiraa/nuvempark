-- ============================================================================
-- NuvemPark — 16: Dados fiscais da rede (CNPJ + Razão Social)
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor. Idempotente.
--
-- Campos editáveis pelo gestor na seção "Sua rede" (Configurações). O update
-- roda com a SESSÃO do gestor via policy tenant_self_update (db/02-rls.sql),
-- sem service_role. cnpj guarda SÓ dígitos (14); a máscara/validação é no client.
-- ============================================================================

alter table public.tenants add column if not exists cnpj text;
alter table public.tenants add column if not exists razao_social text;

comment on column public.tenants.cnpj is
  'CNPJ da rede — somente dígitos (14). Máscara e validação de DV no client.';
comment on column public.tenants.razao_social is
  'Razão social da rede (nome jurídico).';

-- ============================================================================
-- VALIDAÇÃO: select nome, cnpj, razao_social from public.tenants limit 1;
-- ============================================================================
