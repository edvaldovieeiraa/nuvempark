-- ============================================================================
-- 21 — Modo de impressão da foto do veículo no recibo (por pátio)
--
-- Parametrização do painel (Configurações → Parametrização). Define se a foto
-- tirada na entrada sai impressa no recibo do cliente. Por PÁTIO:
--   'ativada'     → imprime sempre;
--   'operador'    → o operador decide na entrada (checkbox);
--   'desativada'  → nunca imprime (padrão — opt-in seguro).
--
-- O app lê este valor pelo bootstrap e respeita no fluxo de entrada.
--
-- Idempotente. Aplicar MANUALMENTE no SQL Editor.
-- ============================================================================

alter table public.patios
  add column if not exists foto_recibo_modo text not null default 'desativada';

do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'patios' and constraint_name = 'patios_foto_recibo_modo_chk'
  ) then
    alter table public.patios
      add constraint patios_foto_recibo_modo_chk
      check (foto_recibo_modo in ('ativada', 'operador', 'desativada'));
  end if;
end $$;

comment on column public.patios.foto_recibo_modo is
  'Impressão da foto do veículo no recibo: ativada | operador | desativada.';
