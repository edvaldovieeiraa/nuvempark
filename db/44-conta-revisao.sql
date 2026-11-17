-- ============================================================================
-- 44 — Conta de revisão da loja (Google Play)
--
-- O revisor da Google e o relatório de pré-lançamento entram no app a partir
-- de VÁRIOS aparelhos. Pela regra normal (db/26) só o 1º aparelho do pátio
-- entra sozinho; os demais ficam "pendente_aprovacao" — e o app é reprovado
-- por "não conseguimos acessar".
--
--   tenants.conta_revisao → TRUE só no tenant de revisão da loja. Aparelho
--                           NOVO entra direto como ativo/cortesia (acao
--                           'criar_cortesia'). Cortesia não é cobrada (a
--                           cobrança conta só licenca='licenciado').
--
-- Tudo o mais continua igual, inclusive para a conta de revisão: assinatura
-- precisa liberar, e aparelho revogado/bloqueado continua barrado.
--
-- Ordem de deploy: esta migração e a API podem subir em qualquer ordem — a
-- API antiga trata ação desconhecida como 'negar' (só a conta de revisão
-- seria afetada) e a nova coluna não entra em nenhum select da API.
--
-- Idempotente.
-- ============================================================================

alter table public.tenants
  add column if not exists conta_revisao boolean not null default false;

comment on column public.tenants.conta_revisao is
  'Conta de revisão da loja (Google Play): todo aparelho novo entra como cortesia, sem aprovação. Nunca ligar em cliente real.';

create or replace function public.fn_dispositivo_pode_logar(
  p_patio_id uuid,
  p_device_uuid text
) returns jsonb
language plpgsql stable as $$
declare
  v_tenant  uuid;
  v_disp    record;
  v_incluso boolean;
  v_pend    int;
  v_revisao boolean;
begin
  -- tenant do pátio
  select tenant_id into v_tenant from public.patios where id = p_patio_id;
  if v_tenant is null then
    return jsonb_build_object('pode', false, 'motivo', 'patio_inexistente', 'acao', 'negar');
  end if;

  -- 1) assinatura libera?
  if not public.fn_assinatura_libera(v_tenant) then
    return jsonb_build_object('pode', false, 'motivo', 'assinatura_bloqueada', 'acao', 'negar');
  end if;

  -- 2) dispositivo existe naquele pátio?
  select id, status into v_disp
    from public.dispositivos
   where patio_id = p_patio_id and device_uuid = p_device_uuid
   limit 1;

  if found then
    if v_disp.status = 'revogado' then
      return jsonb_build_object('pode', false, 'motivo', 'revogado', 'acao', 'negar');
    elsif v_disp.status = 'bloqueado' then
      return jsonb_build_object('pode', false, 'motivo', 'bloqueado', 'acao', 'negar');
    elsif v_disp.status = 'pendente' then
      return jsonb_build_object('pode', false, 'motivo', 'pendente_aprovacao', 'acao', 'negar');
    elsif v_disp.status = 'ativo' then
      return jsonb_build_object('pode', true, 'motivo', 'ok', 'acao', 'permitir');
    end if;
    -- fallback defensivo (status fora do domínio conhecido)
    return jsonb_build_object('pode', false, 'motivo', 'status_desconhecido', 'acao', 'negar');
  end if;

  -- 2b) [db/44] conta de revisão da loja: aparelho novo entra como cortesia.
  select coalesce(conta_revisao, false) into v_revisao
    from public.tenants where id = v_tenant;
  if v_revisao then
    return jsonb_build_object('pode', true, 'motivo', 'conta_revisao', 'acao', 'criar_cortesia');
  end if;

  -- 3) não existe: pátio tem slot incluso livre?
  select exists (
    select 1 from public.dispositivos
     where patio_id = p_patio_id and licenca = 'incluso' and status <> 'revogado'
  ) into v_incluso;

  if not v_incluso then
    return jsonb_build_object('pode', true, 'motivo', 'slot_incluso_livre', 'acao', 'criar_incluso');
  end if;

  -- slot incluso ocupado: entra na fila de pendentes (até 5)
  select count(*) into v_pend
    from public.dispositivos
   where patio_id = p_patio_id and status = 'pendente';

  if v_pend < 5 then
    return jsonb_build_object('pode', false, 'motivo', 'limite_atingido', 'acao', 'criar_pendente');
  else
    return jsonb_build_object('pode', false, 'motivo', 'limite_pendentes', 'acao', 'negar');
  end if;
end $$;
