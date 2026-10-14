-- ============================================================================
-- NuvemPark — 44: Tarifa por contrato (motor v2)
-- Projeto: xrwrsswhoywzzhutzrjx · Idempotente. Aplicar MANUALMENTE no SQL Editor.
-- Teste: db/44-tarifa-contrato-teste.sql (roda em BEGIN … ROLLBACK).
--
-- Spec: .planning/specs/tarifa-contrato.md
--
--   tarifas   ganha a modalidade 'contrato' e a coluna `contrato` (jsonb) com
--             as regras, faixas e frações do contrato. Com modalidade
--             'contrato', as colunas de fração, teto, pernoite e tolerância
--             são ignoradas pelo motor.
--
-- Nada lê esta modalidade ainda: o bootstrap só a entrega a quem pedir
-- `?modalidades=contrato` e a página do QR a ignora. Pode ser aplicada a
-- qualquer momento. O conteúdo do contrato é validado no código
-- (`validar` do motor); o banco só garante que é um objeto.
-- ============================================================================

alter table public.tarifas add column if not exists contrato jsonb;

alter table public.tarifas drop constraint if exists tarifas_modalidade_check;
alter table public.tarifas add constraint tarifas_modalidade_check
  check (modalidade in ('avulso', 'hospede', 'contrato'));

alter table public.tarifas drop constraint if exists tarifas_contrato_campos_check;
alter table public.tarifas add constraint tarifas_contrato_campos_check
  check (
    modalidade <> 'contrato'
    or (contrato is not null and jsonb_typeof(contrato) = 'object')
  );

comment on column public.tarifas.modalidade is
  'avulso = cobra pelo tempo na saída; hospede = diárias pagas na contratação; contrato = cobra pelo contrato (motor v2)';
comment on column public.tarifas.contrato is
  'Contrato do motor v2 (regras, faixas, fração, diária). Só com modalidade = contrato.';
