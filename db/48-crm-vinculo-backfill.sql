-- ============================================================================
-- NuvemPark — 48: CRM no painel master (parte 2: vínculo com a rede e importação)
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor. Idempotente.
-- Spec: .planning/specs/crm-painel-master.md · Prova: db/50-crm-teste-vinculo.sql
--
-- ⚠️ ORDEM: db/47 → deploy do web novo → ESTA. Ela cria leads sem telefone,
-- sem e-mail e sem assunto, e a tela antiga (/master/leads) quebra com isso.
--
-- O QUE ESTA MIGRAÇÃO FAZ
--   1) Trigger em `assinaturas`: toda conta trial, todo tenant criado pelo
--      master e toda ativação (pelos 5 caminhos, inclusive o webhook da API)
--      liga ou cria o card do CRM e o move para Trial, Ganho ou Perdido.
--   2) Trigger em `tenants`: o rollback de um cadastro que falhou apaga o card
--      que nasceu com ele, ou devolve o lead antigo ao estágio de antes.
--   3) Importa a base atual (tenants sem lead) com as datas reais.
--   4) Copia a `observacao` antiga de cada lead para uma nota da linha do tempo.
--
-- NENHUM TRIGGER DERRUBA QUEM O DISPAROU: todo o CRM fica dentro de
-- `begin … exception when others then raise warning … end`. Um erro aqui não
-- desfaz a confirmação de pagamento, o cadastro nem o rollback do cadastro.
--
-- SEM begin/commit: o ensaio roda esta migração dentro de `begin; … rollback;`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) E-mail de contato de uma rede
--
-- `email_cobranca` quando existe (cadastro trial). Senão, o do primeiro gestor
-- no Auth (`app_metadata.tenant_id`), porque o `criarTenant` do master cria o
-- gestor antes da assinatura e não preenche `email_cobranca`.
-- ----------------------------------------------------------------------------
create or replace function public.fn_crm_email_da_rede(p_tenant_id uuid, p_email_cobranca text)
returns text
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := nullif(lower(btrim(coalesce(p_email_cobranca, ''))), '');
begin
  if v_email is null then
    select nullif(lower(btrim(coalesce(u.email, ''))), '') into v_email
      from auth.users u
     where u.raw_app_meta_data ->> 'tenant_id' = p_tenant_id::text
     order by u.created_at
     limit 1;
  end if;
  return v_email;
end $$;

-- ----------------------------------------------------------------------------
-- 2) Liga a rede a um lead que já existe ou cria um card para ela
--
-- Usada pelo trigger das assinaturas e pela importação. Procura um lead SEM
-- rede que case por e-mail ou telefone (`fn_crm_casar`, o mais recente). Se
-- achar, liga e guarda o estágio de antes (para o rollback do cadastro). Se
-- não achar, cria o card com o nome da rede.
--
-- Um lead em Ganho nunca volta de estágio sozinho (req. 5): é só ligado.
-- `p_estagio_em` é a data real do estágio (a importação informa; o trigger
-- passa now()). `p_texto` vira a interação `sistema`.
-- Retorna o id do lead.
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
    v_novo := case when v_lead.status = 'ganho' then 'ganho' else p_alvo end;

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
     true, p_estagio_em, p_criado_em)
  returning id into v_id;

  insert into public.lead_interacoes (lead_id, tipo, texto)
  values (v_id, 'sistema', left(p_texto, 4000));

  return v_id;
end $$;

-- ----------------------------------------------------------------------------
-- 3) Vínculo pelas assinaturas (req. 9 e 10)
--
-- - INSERT em trial: liga ou cria em Trial (`fonte='trial'`).
-- - INSERT em ativa (rede criada pelo master): liga ou cria em Ganho
--   (`fonte='master'`, e-mail do gestor no Auth).
-- - `estado` vira 'ativa' vindo de outro: o lead ligado que não está em Ganho
--   vai para Ganho; sem lead ligado, cria. Cobre os 5 caminhos de ativação
--   (marcarPaga, alternarSuspensao, ativarAssinatura, mudarEstadoAssinatura e
--   o webhook da API), inclusive trial → suspensa → ativa.
-- - `estado` vira 'cancelada': o lead ligado em Trial vai para Perdido
--   (motivo `cancelou`). Em Ganho não muda (churn fora do escopo).
-- - O resto não mexe no estágio. Ativa → ativa (webhook reentregue) não faz nada.
-- - Conta de revisão da Google Play fica fora.
-- ----------------------------------------------------------------------------
create or replace function public.fn_crm_vinculo_assinatura()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant record;
  v_lead   record;
  v_email  text;
begin
  begin
    if tg_op = 'UPDATE' and new.estado is not distinct from old.estado then
      return null;
    end if;

    select t.id, t.nome, t.codigo, t.conta_revisao into v_tenant
      from public.tenants t where t.id = new.tenant_id;
    if v_tenant.id is null or v_tenant.conta_revisao then
      return null;
    end if;

    select l.id, l.status into v_lead
      from public.leads_site l where l.tenant_id = new.tenant_id;

    -- Ativação: Ganho
    if new.estado = 'ativa' then
      if v_lead.id is null then
        v_email := public.fn_crm_email_da_rede(new.tenant_id, new.email_cobranca);
        perform public.fn_crm_ligar_ou_criar(
          new.tenant_id, v_email, 'ganho', null,
          case when tg_op = 'UPDATE' and new.origem = 'signup' then 'trial' else 'master' end,
          now(), now(),
          format('Rede %s (código %s) com assinatura ativa', v_tenant.nome, v_tenant.codigo));
      elsif v_lead.status <> 'ganho' then
        perform set_config('crm.motivo', 'Assinatura ativada: virou cliente', true);
        update public.leads_site
           set status = 'ganho', motivo_perda = null
         where id = v_lead.id;
        perform set_config('crm.motivo', '', true);
      end if;

    -- Conta trial nova: Trial
    elsif new.estado = 'trial' and tg_op = 'INSERT' then
      if v_lead.id is null then
        v_email := public.fn_crm_email_da_rede(new.tenant_id, new.email_cobranca);
        perform public.fn_crm_ligar_ou_criar(
          new.tenant_id, v_email, 'trial', null, 'trial', now(), now(),
          format('Conta trial criada: rede %s (código %s)', v_tenant.nome, v_tenant.codigo));
      end if;

    -- Cancelada durante o trial: Perdido
    elsif new.estado = 'cancelada' then
      if v_lead.id is not null and v_lead.status = 'trial' then
        perform set_config('crm.motivo', 'Assinatura cancelada durante o trial', true);
        update public.leads_site
           set status = 'perdido', motivo_perda = 'cancelou'
         where id = v_lead.id;
        perform set_config('crm.motivo', '', true);
      end if;
    end if;
  exception when others then
    perform set_config('crm.motivo', '', true);
    raise warning '[crm] vínculo da assinatura % (tenant %) falhou: % %',
      new.id, new.tenant_id, sqlstate, sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists trg_assinaturas_crm_vinculo on public.assinaturas;
create trigger trg_assinaturas_crm_vinculo
  after insert or update of estado on public.assinaturas
  for each row execute function public.fn_crm_vinculo_assinatura();

-- ----------------------------------------------------------------------------
-- 4) Rollback do cadastro (req. 12): BEFORE DELETE em tenants
--
-- - O card é APAGADO só se nasceu do vínculo, ainda está em Trial e não tem
--   nenhuma interação humana: nasceu e morreu no mesmo cadastro que falhou.
-- - Nos outros casos o lead é DESLIGADO: volta ao estágio de antes do vínculo
--   (quando havia um) e ganha "Conta da rede removida". O histórico fica.
-- Em erro: WARNING e o tenant é apagado do mesmo jeito.
-- ----------------------------------------------------------------------------
create or replace function public.fn_crm_desfaz_tenant()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_lead  record;
  v_texto text;
begin
  begin
    select l.* into v_lead from public.leads_site l where l.tenant_id = old.id;
    if v_lead.id is null then
      return old;
    end if;

    if v_lead.vinculo_criou_lead
       and v_lead.status = 'trial'
       and coalesce(btrim(v_lead.observacao), '') = ''
       and not exists (select 1 from public.lead_interacoes i
                        where i.lead_id = v_lead.id and i.tipo <> 'sistema') then
      delete from public.leads_site where id = v_lead.id;
      return old;
    end if;

    v_texto := format('Conta da rede removida: %s (código %s)', old.nome, old.codigo);

    if v_lead.estagio_antes_vinculo is not null
       and v_lead.estagio_antes_vinculo is distinct from v_lead.status then
      perform set_config('crm.motivo', v_texto, true);
      update public.leads_site
         set tenant_id = null,
             status = estagio_antes_vinculo,
             motivo_perda = null,
             estagio_antes_vinculo = null,
             vinculo_criou_lead = false
       where id = v_lead.id;
      perform set_config('crm.motivo', '', true);
    else
      update public.leads_site
         set tenant_id = null,
             estagio_antes_vinculo = null,
             vinculo_criou_lead = false
       where id = v_lead.id;
      insert into public.lead_interacoes (lead_id, tipo, texto)
      values (v_lead.id, 'sistema', v_texto);
    end if;
  exception when others then
    perform set_config('crm.motivo', '', true);
    raise warning '[crm] rollback do lead da rede % falhou: % %', old.id, sqlstate, sqlerrm;
  end;
  return old;
end $$;

drop trigger if exists trg_tenants_crm_desfaz on public.tenants;
create trigger trg_tenants_crm_desfaz
  before delete on public.tenants
  for each row execute function public.fn_crm_desfaz_tenant();

-- ----------------------------------------------------------------------------
-- 5) Importação da base (req. 26 e Revisão 12). Idempotente: só pega rede que
--    ainda não tem lead ligado. Retorna quantas redes importou.
--
-- Datas reais (decisão 11 do plano), para a base não cair inteira na janela de
-- 30 dias de Ganho e Perdido no primeiro dia:
--   trial no prazo ou expirado há até 30 dias → Trial, desde o cadastro da rede
--   trial expirado há mais de 30 dias         → Perdido/sem_retorno, desde a expiração
--   ativa, atrasada ou suspensa               → Ganho, desde a 1ª fatura paga
--                                               (ou a criação da assinatura)
--   cancelada                                 → Perdido/cancelou, desde a última
--                                               mudança da assinatura
-- ----------------------------------------------------------------------------
create or replace function public.fn_crm_importar_base()
returns int
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  r        record;
  v_alvo   text;
  v_motivo text;
  v_desde  timestamptz;
  v_texto  text;
  v_hoje   text := to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY');
  v_n      int := 0;
begin
  for r in
    select t.id as tenant_id, t.criado_em as tenant_criado_em,
           a.estado, a.trial_expira_em, a.email_cobranca,
           a.criado_em as assinatura_criada_em, a.atualizado_em as assinatura_mudou_em,
           (select min(f.pago_em) from public.faturas f
             where f.tenant_id = t.id and f.pago_em is not null) as primeiro_pagamento
      from public.tenants t
      join public.assinaturas a on a.tenant_id = t.id
     where t.conta_revisao = false
       and not exists (select 1 from public.leads_site l where l.tenant_id = t.id)
     order by t.criado_em
  loop
    v_motivo := null;
    v_texto  := 'Importado da base em ' || v_hoje;

    if r.estado = 'trial' then
      if r.trial_expira_em is not null and r.trial_expira_em < now() - interval '30 days' then
        v_alvo   := 'perdido';
        v_motivo := 'sem_retorno';
        v_desde  := r.trial_expira_em;
        v_texto  := 'Importado: trial expirado em '
                 || to_char(r.trial_expira_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY');
      else
        v_alvo  := 'trial';
        v_desde := r.tenant_criado_em;
      end if;
    elsif r.estado in ('ativa', 'atrasada', 'suspensa') then
      v_alvo  := 'ganho';
      v_desde := coalesce(r.primeiro_pagamento, r.assinatura_criada_em);
    elsif r.estado = 'cancelada' then
      v_alvo   := 'perdido';
      v_motivo := 'cancelou';
      v_desde  := r.assinatura_mudou_em;
    else
      continue;
    end if;

    perform public.fn_crm_ligar_ou_criar(
      r.tenant_id,
      public.fn_crm_email_da_rede(r.tenant_id, r.email_cobranca),
      v_alvo, v_motivo, 'importacao', v_desde, r.tenant_criado_em, v_texto);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- ----------------------------------------------------------------------------
-- 6) Observação antiga → primeira nota da linha do tempo (req. 14 e 27)
--    Só onde a cópia ainda não existe. A coluna `observacao` fica (sai numa
--    migração posterior). Retorna quantas copiou.
-- ----------------------------------------------------------------------------
create or replace function public.fn_crm_copiar_observacoes()
returns int
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_n int;
begin
  insert into public.lead_interacoes (lead_id, tipo, texto, criado_em)
  select l.id, 'nota',
         left('Observação de antes do CRM: ' || btrim(l.observacao), 4000),
         coalesce(l.atendido_em, l.criado_em)
    from public.leads_site l
   where coalesce(btrim(l.observacao), '') <> ''
     and not exists (
           select 1 from public.lead_interacoes i
            where i.lead_id = l.id and i.tipo = 'nota'
              and i.texto = left('Observação de antes do CRM: ' || btrim(l.observacao), 4000));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ----------------------------------------------------------------------------
-- 7) Fechadas para anon e authenticated
-- ----------------------------------------------------------------------------
revoke all on function public.fn_crm_email_da_rede(uuid, text) from public, anon, authenticated;
revoke all on function public.fn_crm_ligar_ou_criar(uuid, text, text, text, text, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.fn_crm_vinculo_assinatura() from public, anon, authenticated;
revoke all on function public.fn_crm_desfaz_tenant()      from public, anon, authenticated;
revoke all on function public.fn_crm_importar_base()      from public, anon, authenticated;
revoke all on function public.fn_crm_copiar_observacoes() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8) Rodar a importação e a cópia (idempotentes)
-- ----------------------------------------------------------------------------
select public.fn_crm_importar_base()      as redes_importadas,
       public.fn_crm_copiar_observacoes() as observacoes_copiadas;

-- ============================================================================
-- VALIDAÇÃO: db/50-crm-teste-vinculo.sql (ensaio: begin; 48; 50; rollback;)
-- ============================================================================
