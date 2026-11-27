-- ============================================================================
-- NuvemPark — 51: CRM, movimento livre de estágio + card importado
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor DEPOIS da 47 e da 48.
-- Idempotente. Prova: db/49 e db/50 (as duas já esperam o que esta faz).
--
-- 1) MOVIMENTO LIVRE (decisão de 26/11/2026, substitui a Revisão 1 da spec).
--    O master move qualquer card para qualquer estágio, inclusive Trial e Ganho.
--    Caso real: rede ativada só para estender o teste entra em Ganho pelo
--    vínculo e precisa voltar para Trial à mão. `fn_crm_mover` deixa de
--    recusar Ganho e de exigir a assinatura em trial para ir a Trial. Fica:
--    compare-and-set, motivo obrigatório em Perdido, `cancelou` só do sistema,
--    e mover para o próprio estágio é recusado.
--    Os movimentos automáticos (db/48) continuam e só disparam quando o estado
--    da assinatura MUDA, então não desfazem um movimento manual sozinhos.
--
-- 2) CARD IMPORTADO NÃO É "NASCIDO DO VÍNCULO". A importação marcava
--    `vinculo_criou_lead = true`; aí, se a rede fosse apagada, um card de trial
--    sem interação humana sumiria em vez de só ser desligado (req. 12 / edge
--    5b). A função passa a marcar só o que nasce de um cadastro de verdade, e
--    os importados de ontem são corrigidos.
--
-- Sem begin/commit: o ensaio roda esta migração dentro de `begin; … rollback;`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) fn_crm_mover com movimento livre
--    `p_de` é o compare-and-set: só grava se o estágio ainda for o que a tela leu.
--    Ganho à mão vale para qualquer lead, com ou sem rede ligada (de propósito).
-- ----------------------------------------------------------------------------
create or replace function public.fn_crm_mover(
  p_id           uuid,
  p_de           text,
  p_para         text,
  p_motivo_perda text default null,
  p_texto        text default null
) returns text
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_texto  text := nullif(btrim(coalesce(p_texto, '')), '');
  v_linhas int;
begin
  if p_para not in ('novo','em_contato','trial','ganho','perdido') then
    raise exception 'destino inválido: %', p_para using errcode = '22023';
  end if;
  if p_para = p_de then
    raise exception 'o lead já está em %', p_para using errcode = '22023';
  end if;
  if p_para = 'perdido' then
    if p_motivo_perda is null
       or p_motivo_perda not in ('preco','sem_retorno','concorrente','sem_perfil','desistiu','outro') then
      raise exception 'motivo de perda inválido: %', p_motivo_perda using errcode = '22023';
    end if;
    if p_motivo_perda = 'outro' and v_texto is null then
      raise exception 'motivo "outro" exige comentário' using errcode = '22023';
    end if;
  end if;
  if v_texto is not null and length(v_texto) > 4000 then
    raise exception 'comentário longo demais' using errcode = '22023';
  end if;

  -- Texto da interação: o padrão do trigger ("Estágio: X → Y").
  perform set_config('crm.motivo', '', true);

  update public.leads_site l
     set status       = p_para,
         motivo_perda = case when p_para = 'perdido' then p_motivo_perda else null end
   where l.id = p_id
     and l.status = p_de;
  get diagnostics v_linhas = row_count;

  perform set_config('crm.motivo', '', true);

  if v_linhas = 0 then
    if exists (select 1 from public.leads_site where id = p_id) then
      return 'mudou';
    end if;
    return 'nao_encontrado';
  end if;

  -- clock_timestamp(): a nota fica depois da linha do sistema, que usa now().
  if v_texto is not null then
    insert into public.lead_interacoes (lead_id, tipo, texto, criado_em)
    values (p_id, 'nota', v_texto, clock_timestamp());
  end if;

  return 'ok';
end $$;

revoke all on function public.fn_crm_mover(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.fn_crm_mover(uuid, text, text, text, text) to service_role;

-- ----------------------------------------------------------------------------
-- 2) Card importado não é "nascido do vínculo"
-- ----------------------------------------------------------------------------
create or replace function public.fn_crm_ligar_ou_criar(
  p_tenant_id    uuid,
  p_email        text,
  p_alvo         text,
  p_motivo_perda text,
  p_fonte        text,
  p_estagio_em   timestamptz,
  p_criado_em    timestamptz,
  p_texto        text
) returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant record;
  v_lead   record;
  v_id     uuid;
  v_novo   text;
begin
  select t.id, t.nome, nullif(regexp_replace(coalesce(t.telefone, ''), '[^0-9]', '', 'g'), '') as telefone
    into v_tenant
    from public.tenants t where t.id = p_tenant_id;

  select l.* into v_lead
    from public.fn_crm_casar(p_email, v_tenant.telefone) c
    join public.leads_site l on l.id = c.lead_id
   where c.tenant_id is null
   order by c.criado_em desc
   limit 1;

  if v_lead.id is not null then
    v_novo := p_alvo;

    if v_novo is distinct from v_lead.status then
      perform set_config('crm.motivo', left(p_texto, 4000), true);
      update public.leads_site
         set tenant_id             = p_tenant_id,
             estagio_antes_vinculo = v_lead.status,
             empresa               = coalesce(empresa, v_tenant.nome),
             status                = v_novo,
             motivo_perda          = case when v_novo = 'perdido' then p_motivo_perda else null end,
             estagio_em            = case when p_estagio_em = v_lead.estagio_em
                                          then p_estagio_em + interval '1 microsecond'
                                          else p_estagio_em end
       where id = v_lead.id;
      perform set_config('crm.motivo', '', true);
    else
      update public.leads_site
         set tenant_id             = p_tenant_id,
             estagio_antes_vinculo = v_lead.status,
             empresa               = coalesce(empresa, v_tenant.nome)
       where id = v_lead.id;
      insert into public.lead_interacoes (lead_id, tipo, texto)
      values (v_lead.id, 'sistema', left(p_texto, 4000));
    end if;
    return v_lead.id;
  end if;

  insert into public.leads_site
    (nome, empresa, email, telefone, status, fonte, motivo_perda, tenant_id,
     vinculo_criou_lead, estagio_em, criado_em)
  values
    (v_tenant.nome, v_tenant.nome, p_email, v_tenant.telefone, p_alvo, p_fonte,
     case when p_alvo = 'perdido' then p_motivo_perda end, p_tenant_id,
     p_fonte <> 'importacao', p_estagio_em, p_criado_em)
  returning id into v_id;

  insert into public.lead_interacoes (lead_id, tipo, texto)
  values (v_id, 'sistema', left(p_texto, 4000));

  return v_id;
end $$;

revoke all on function public.fn_crm_ligar_ou_criar(uuid, text, text, text, text, timestamptz, timestamptz, text) from public, anon, authenticated;

update public.leads_site
   set vinculo_criou_lead = false
 where fonte = 'importacao'
   and vinculo_criou_lead;

-- ============================================================================
-- VALIDAÇÃO: db/49 e db/50 (ensaio: begin; 51; 49; 50; rollback;)
-- ============================================================================
