-- ============================================================================
-- NuvemPark — 14: Dia de vencimento do mensalista
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor DEPOIS do 12. Idempotente.
--
-- Adiciona clientes.dia_vencimento (1..28). Nullable:
--   - null  => ciclo de 30 dias a partir do pagamento;
--   - 1..28 => o vencimento cai sempre nesse dia (mês seguinte ao pagamento).
--
-- O AVANÇO do clientes.vencimento a cada pagamento é feito na APLICAÇÃO
-- (server action do painel, sync da API e app), NÃO por trigger — para manter
-- a idempotência create-only do sync (re-envio não pode avançar duas vezes).
-- Faixa 1..28 evita meses curtos (nunca "31 de fevereiro").
-- ============================================================================

alter table public.clientes
  add column if not exists dia_vencimento int
  check (dia_vencimento between 1 and 28);

comment on column public.clientes.dia_vencimento is
  'Dia fixo de vencimento da mensalidade (1..28). Null = ciclo de 30 dias a partir do pagamento.';

-- ============================================================================
-- VALIDAÇÃO RÁPIDA (deve retornar sem erro):
-- select id, nome, vencimento, dia_vencimento from public.clientes limit 1;
-- -- CHECK deve rejeitar (esperado: erro):
-- -- update public.clientes set dia_vencimento = 31 where id = (select id from public.clientes limit 1);
-- ============================================================================
