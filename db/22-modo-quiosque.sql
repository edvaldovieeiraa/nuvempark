-- ============================================================================
-- 22 — Modo quiosque do app (por pátio)
--
-- Parametrização do painel. Liga/desliga o Lock Task (screen pinning) do
-- Android: com ele, o app fica fixo na tela — barra de status, notificações e
-- botões home/recentes bloqueados. Default TRUE para preservar o comportamento
-- atual (o app hoje sempre entra em quiosque).
--
-- O app lê este valor pelo bootstrap e aplica no shell.
--
-- Idempotente. Aplicar MANUALMENTE no SQL Editor.
-- ============================================================================

alter table public.patios
  add column if not exists modo_quiosque boolean not null default true;

comment on column public.patios.modo_quiosque is
  'Modo quiosque (Lock Task / screen pinning) do app: liga/desliga por pátio.';
