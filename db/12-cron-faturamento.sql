-- ============================================================================
-- NuvemPark — Cron diário de faturamento (pg_cron do Supabase)
-- Projeto: xrwrsswhoywzzhutzrjx
--
-- Roda dentro do próprio banco (não depende da VPS). Todo dia de madrugada:
--   1) expira trials vencidos  (trial -> atrasada)
--   2) gera faturas do mês      (inclui os trials recém-expirados)
--   3) marca faturas vencidas   (aberta -> vencida)
--
-- Horário: 06:00 UTC = 03:00 America/Sao_Paulo (madrugada, sem uso).
-- Idempotente: pode rodar este SQL mais de uma vez (recria o schedule).
-- ============================================================================

-- 1) Habilita a extensão pg_cron (no Supabase vive no schema 'cron').
create extension if not exists pg_cron;

-- 2) Função única que encadeia as 3 rotinas (facilita o agendamento e o log).
create or replace function public.fn_rotina_diaria_faturamento()
returns text language plpgsql
security definer            -- roda com privilégios do dono (acessa as tabelas)
set search_path = public
as $$
declare
  v_expirados int;
  v_geradas int;
  v_vencidas int;
begin
  v_expirados := public.fn_expirar_trials();
  v_geradas   := public.fn_gerar_faturas_mes();
  v_vencidas  := public.fn_marcar_faturas_vencidas();
  return format(
    'trials_expirados=%s faturas_geradas=%s faturas_vencidas=%s',
    v_expirados, v_geradas, v_vencidas
  );
end $$;

-- 3) (Re)agenda o job. unschedule primeiro para idempotência.
do $$
begin
  perform cron.unschedule('nuvempark-faturamento-diario')
  where exists (
    select 1 from cron.job where jobname = 'nuvempark-faturamento-diario'
  );
end $$;

select cron.schedule(
  'nuvempark-faturamento-diario',
  '0 6 * * *',                                   -- todo dia às 06:00 UTC (03:00 BRT)
  $$ select public.fn_rotina_diaria_faturamento(); $$
);

-- ============================================================================
-- Verificações úteis (rode manualmente quando quiser):
--
--   -- ver o job agendado:
--   select jobid, jobname, schedule, active from cron.job
--   where jobname = 'nuvempark-faturamento-diario';
--
--   -- ver as últimas execuções (status + retorno):
--   select job_pid, status, return_message, start_time, end_time
--   from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname='nuvempark-faturamento-diario')
--   order by start_time desc limit 10;
--
--   -- testar a rotina agora, sem esperar a madrugada:
--   select public.fn_rotina_diaria_faturamento();
-- ============================================================================
