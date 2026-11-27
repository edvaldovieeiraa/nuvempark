-- ============================================================================
-- 52 — Regras de horário na tabela de preço
--
-- Spec: .planning/specs/regras-horario-tarifa.md
--
--   tarifas.regras_horario → lista JSON de regras (horário, dias, degraus,
--       adicional, "cobrar do início", requer). '[]' = sem regras = cobrança
--       de hoje. Só o painel grava, validado na server action; a API e o app
--       só leem. Horários no relógio de Brasília.
--
--   dispositivos.suporta_regras_horario → o aparelho declarou
--       `regras_horario_v1` no último bootstrap. O painel lista os aparelhos
--       ativos sem suporte antes de deixar salvar uma tabela com regras.
--       O bootstrap só grava quando o valor muda (ele roda a cada 30 s por
--       aparelho e `dispositivos` alimenta o realtime do painel).
--
-- A API nova funciona com ou sem esta migração (lê `tarifas` com `*` e tem
-- retorno para a coluna de dispositivos ausente), mas o painel com regras
-- precisa dela. Aplicar ANTES do deploy da API e do painel.
--
-- Idempotente. Aplicar MANUALMENTE (npx supabase db query --remote).
-- ============================================================================

alter table public.tarifas
  add column if not exists regras_horario jsonb not null default '[]'::jsonb;

comment on column public.tarifas.regras_horario is
  'Regras de horário da tabela avulsa (lista JSON; [] = sem regras). Horários em Brasília. Validado pelo painel.';

alter table public.dispositivos
  add column if not exists suporta_regras_horario boolean not null default false;

comment on column public.dispositivos.suporta_regras_horario is
  'O aparelho declarou regras_horario_v1 no último bootstrap (gravado só quando muda).';
