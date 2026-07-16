-- ============================================================================
-- NuvemPark — Heartbeat do app visível no painel
--
-- PROPÓSITO: até aqui o app só falava com o servidor quando havia dado novo
-- para sincronizar. Num pátio parado (sem entrada/saída), o gestor não tinha
-- como distinguir "app aberto e ocioso" de "app fechado / tablet sem energia".
--
-- O app passa a bater um heartbeat periódico (POST /heartbeat, 60s) que carimba
-- dispositivos.ultimo_acesso. Para o painel enxergar esse carimbo SEM F5, a
-- tabela precisa estar na publication do Realtime — é só isso que este arquivo
-- faz. A RLS (tenant_select_dispositivos, db/02) já restringe os eventos ao
-- tenant da sessão do gestor: cada um só recebe os seus dispositivos.
--
-- Nenhuma coluna nova: `ultimo_acesso` já existe em dispositivos (db/01).
--
-- Rodar no SQL Editor do projeto xrwrsswhoywzzhutzrjx. Idempotente.
-- ============================================================================

-- Realtime: sidebar do painel escuta UPDATE em dispositivos (respeita RLS).
do $$
begin
  alter publication supabase_realtime add table public.dispositivos;
exception when duplicate_object then
  null; -- já adicionada
end $$;

-- ============================================================================
-- Fim.
-- ============================================================================
