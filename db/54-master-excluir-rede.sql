-- ============================================================================
-- 54 — Exclusão definitiva de rede pelo master
--
-- Botão "Excluir rede" no menu ⋮ de /master/tenants. A action
-- `excluirTenant` cancela antes as cobranças da mensalidade em aberto no Asaas
-- e, depois desta função, apaga as fotos do Storage (SQL não apaga storage.*).
--
-- Por que uma função e não dois deletes na action:
--   O login do gestor mora em auth.users só com app_metadata.tenant_id, sem FK
--   para tenants. O do parceiro (vouchers) tem FK no sentido contrário:
--   apagar a rede apaga a linha de usuarios_parceiro e deixa o usuário do Auth
--   vivo. Se um dos lados falhar no meio, sobra login apontando para rede que
--   não existe. Aqui tudo vai na mesma transação.
--
-- Guardas (repetidas de web/src/lib/excluir-rede.ts — o banco não confia na
-- action): conta de revisão das lojas nunca sai, rede ativa não sai direto e o
-- código de 4 dígitos tem que bater.
--
-- O resto da rede (pátios, tickets, caixa, faturas, assinatura, aparelhos…)
-- sai por ON DELETE CASCADE. O trigger trg_tenants_crm_desfaz (db/48) desliga
-- o lead do CRM e registra "Conta da rede removida".
--
-- Só service_role executa. Idempotente.
-- ============================================================================

create or replace function public.fn_master_excluir_tenant(p_tenant_id uuid, p_codigo text)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_rede      record;
  v_parceiros int;
  v_gestores  int;
begin
  select id, codigo, ativo, conta_revisao
    into v_rede
    from public.tenants
   where id = p_tenant_id
   for update;

  if not found then
    raise exception 'rede não encontrada' using errcode = 'P0002';
  end if;
  if v_rede.conta_revisao then
    raise exception 'conta de revisão das lojas não pode ser excluída' using errcode = '42501';
  end if;
  if v_rede.ativo then
    raise exception 'rede ativa: desative antes de excluir' using errcode = '22023';
  end if;
  if btrim(coalesce(p_codigo, '')) <> v_rede.codigo then
    raise exception 'código não confere' using errcode = '22023';
  end if;

  delete from auth.users u
   using public.usuarios_parceiro up
   where up.tenant_id = p_tenant_id
     and u.id = up.auth_user_id;
  get diagnostics v_parceiros = row_count;

  delete from auth.users u
   where u.raw_app_meta_data->>'tenant_id' = p_tenant_id::text;
  get diagnostics v_gestores = row_count;

  delete from public.tenants where id = p_tenant_id;

  return jsonb_build_object('gestores', v_gestores, 'parceiros', v_parceiros);
end $$;

revoke all on function public.fn_master_excluir_tenant(uuid, text) from public, anon, authenticated;
grant execute on function public.fn_master_excluir_tenant(uuid, text) to service_role;
