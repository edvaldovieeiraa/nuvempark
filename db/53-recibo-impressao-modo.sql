-- ============================================================================
-- 53 — Impressão automática dos recibos de pagamento (por pátio)
--
-- Parametrização do painel (Configurações → Parametrização → Impressão de
-- recibos). Um modo para cada papel que o app imprime sozinho depois de gravar:
--   recibo_saida_modo    → recibo da saída avulsa;
--   recibo_estadia_modo  → comprovantes de estadia (saída de hóspede,
--                          conversão e renovação sem entrada);
--   recibo_caixa_modo    → relatório do fechamento de caixa.
-- Valores:
--   'automatica' → imprime sem perguntar (padrão — o comportamento de sempre);
--   'perguntar'  → grava e mostra um aviso com o botão "Imprimir";
--   'desativada' → não imprime.
-- Reimprimir pela tela vale em qualquer modo.
--
-- O app lê pelo bootstrap a partir da 1.0.4 (build 3024). Aparelhos mais
-- antigos ignoram e continuam imprimindo.
--
-- APLICAR ANTES DA API: o bootstrap seleciona estas colunas.
-- Idempotente.
-- ============================================================================

alter table public.patios
  add column if not exists recibo_saida_modo text not null default 'automatica',
  add column if not exists recibo_estadia_modo text not null default 'automatica',
  add column if not exists recibo_caixa_modo text not null default 'automatica';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'patios_recibo_saida_modo_chk') then
    alter table public.patios add constraint patios_recibo_saida_modo_chk
      check (recibo_saida_modo in ('automatica', 'perguntar', 'desativada'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'patios_recibo_estadia_modo_chk') then
    alter table public.patios add constraint patios_recibo_estadia_modo_chk
      check (recibo_estadia_modo in ('automatica', 'perguntar', 'desativada'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'patios_recibo_caixa_modo_chk') then
    alter table public.patios add constraint patios_recibo_caixa_modo_chk
      check (recibo_caixa_modo in ('automatica', 'perguntar', 'desativada'));
  end if;
end $$;

comment on column public.patios.recibo_saida_modo is
  'Impressão do recibo da saída avulsa: automatica | perguntar | desativada.';
comment on column public.patios.recibo_estadia_modo is
  'Impressão dos comprovantes de estadia: automatica | perguntar | desativada.';
comment on column public.patios.recibo_caixa_modo is
  'Impressão do relatório de fechamento de caixa: automatica | perguntar | desativada.';
