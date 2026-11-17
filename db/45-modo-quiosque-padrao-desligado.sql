-- ============================================================================
-- 45 — Modo quiosque passa a nascer DESLIGADO
--
-- O db/22 criou `patios.modo_quiosque` com default TRUE para preservar o
-- comportamento da época. Fora de aparelho Device Owner, o Lock Task vira o
-- "App fixado" do Android: um aviso a cada abertura, que o operador precisa
-- dispensar — e que o revisor da Google Play também veria.
--
-- Agora:
--   * pátio NOVO nasce com o quiosque desligado (o gestor liga em
--     Parametrização quando o aparelho é provisionado como Device Owner);
--   * o pátio da conta de revisão da loja (db/44) é desligado;
--   * pátios EXISTENTES de clientes NÃO mudam — quem tem ligado, continua.
--
-- API, painel e app também passaram a tratar valor ausente como FALSE.
--
-- Idempotente.
-- ============================================================================

alter table public.patios
  alter column modo_quiosque set default false;

update public.patios p
   set modo_quiosque = false
  from public.tenants t
 where t.id = p.tenant_id
   and t.conta_revisao = true
   and p.modo_quiosque = true;
