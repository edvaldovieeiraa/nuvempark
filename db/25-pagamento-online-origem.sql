-- ============================================================================
-- 25 — Origem da cobrança Pix (publico x app)
--
-- Distingue quem GEROU a cobrança:
--   • 'publico' — o cliente escaneou o QR do cupom e pagou pela página pública.
--                 Continua fora do caixa do operador (dinheiro cai no Asaas do
--                 tenant) e aparece na listagem de Pix online do painel.
--   • 'app'     — o operador gerou o Pix DINÂMICO na saída, no aparelho. Como a
--                 operação passou pela mão do operador, entra no CAIXA dele
--                 (movimento 'pix') e é EXCLUÍDA da listagem de Pix online do
--                 painel — senão o mesmo pagamento apareceria nos dois lugares.
--
-- Linhas existentes recebem 'publico' (o default) — todas elas nasceram do QR
-- público, que era o único caminho que carimbava esta tabela até aqui.
--
-- Idempotente. Aplicar MANUALMENTE no SQL Editor.
-- ============================================================================

alter table public.pagamentos_online
  add column if not exists origem text not null default 'publico'
  check (origem in ('publico', 'app'));

comment on column public.pagamentos_online.origem is
  'Quem gerou a cobrança: publico (cliente pelo QR do cupom) ou app (Pix dinâmico do operador na saída). Pix dinâmico entra no caixa do operador e é excluído da listagem de Pix online do painel.';
