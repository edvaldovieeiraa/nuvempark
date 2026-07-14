-- ============================================================================
-- 18 — Operador da SAÍDA no ticket
--
-- PROBLEMA: `tickets` guardava um operador só (`operador_id`), gravado no
-- REGISTRO DA ENTRADA. O fechamento nunca carimbava quem validou o veículo na
-- saída, então o painel não tinha como responder "quem liberou este carro?".
--
-- Derivar pelo caixa (caixa_movimentos.ticket_id -> caixa_sessoes.operador_id)
-- resolve só as saídas PAGAS: mensalista (livre passagem) e ISENÇÃO não geram
-- movimento de caixa — e isenção é justamente o que mais se quer auditar.
--
-- Aditivo e idempotente. Nulo nos tickets já fechados (o dado não existia); o
-- painel cobre esse passado derivando do caixa quando a coluna está vazia.
-- ============================================================================

alter table public.tickets
  add column if not exists operador_saida_id uuid;   -- join manual -> operadores.id

comment on column public.tickets.operador_id is
  'Operador que registrou a ENTRADA do veículo.';
comment on column public.tickets.operador_saida_id is
  'Operador que validou a SAÍDA (fechou o ticket). Nulo em ticket aberto e no histórico anterior a esta coluna.';

-- Consulta do painel filtra por pátio e ordena por entrada; a coluna é lida
-- junto do ticket, sem índice próprio (não há busca POR operador de saída hoje).

-- ============================================================================
-- VALIDAÇÃO (como gestor):
-- select placa, status, operador_id, operador_saida_id
--   from public.tickets where status = 'fechado' order by saida desc limit 5;
-- ============================================================================
