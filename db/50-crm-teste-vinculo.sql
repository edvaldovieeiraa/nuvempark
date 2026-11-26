-- ============================================================================
-- NuvemPark — 50: Prova da db/48 (CRM, parte 2: vínculo e importação)
-- Rodar no SQL Editor DEPOIS da 48. Não deixa nenhum dado: tudo roda numa
-- subtransação desfeita no fim, com ou sem `begin … rollback` em volta.
--
-- COMO LER O RESULTADO
--   ✅ a última linha mostra "✅ CRM OK (db/48)";
--   ❌ qualquer falha para o script com "FALHOU: <o quê>". Nada fica gravado.
--
-- As redes de teste se chamam "Teste 50 …", os e-mails são @exemplo.invalid e
-- os telefones têm DDD 00. Toda conferência é limitada a esses dados, menos a
-- primeira (contagem de Ganho = redes pagantes), que vale para a base inteira
-- e só é garantida logo depois da importação da 48.
--
-- Ensaio antes de aplicar de verdade (com a 47 já aplicada):
--   begin;  <db/48>  <db/50>  rollback;
-- ============================================================================

do $$
declare
  v_tag    text := substr(md5(random()::text || clock_timestamp()::text), 1, 10);
  v_n      int;
  v_n2     int;
  v_ok     boolean;
  v_txt    text;
  v_ts     timestamptz;
  v_lead   uuid;
  v_lead2  uuid;
  v_t      uuid;
  v_t2     uuid;
  v_user   uuid;
  v_email  text;
  v_tel    text;
  l        record;
  r        record;
  t        jsonb := '{}'::jsonb;   -- nome do caso → tenant_id
  e        jsonb := '{}'::jsonb;   -- nome do caso → e-mail
  f        jsonb := '{}'::jsonb;   -- nome do caso → telefone
begin
  begin  -- subtransação: desfeita no fim pelo sentinela '__crm_ok__'

    ---------------------------------------------------------------------------
    -- 0) "Pronto quando": Ganho ligado a rede = redes pagantes (sem revisão)
    ---------------------------------------------------------------------------
    select count(*) into v_n
      from public.leads_site ls
      join public.tenants tt on tt.id = ls.tenant_id and tt.conta_revisao = false
     where ls.status = 'ganho';
    select count(*) into v_n2
      from public.assinaturas a
      join public.tenants tt on tt.id = a.tenant_id and tt.conta_revisao = false
     where a.estado in ('ativa', 'atrasada', 'suspensa');
    if v_n <> v_n2 then
      raise exception 'FALHOU: % cards em Ganho ligados a rede, mas % redes pagantes', v_n, v_n2;
    end if;

    -- Telefones e e-mails dos casos
    for r in select unnest(array['liga_email','liga_tel','cria','cancela','perdido','master',
                                 'revisao','falha','del_cria','del_nota','del_falha',
                                 'imp31','imp29','imp_ganho','imp_ativa','imp_cancel',
                                 'imp_revisao','imp_casa','ganho_manual','imp_ganho_manual']) as caso
    loop
      f := f || jsonb_build_object(r.caso, '00' || lpad((floor(random() * 1e9))::bigint::text, 9, '0'));
      e := e || jsonb_build_object(r.caso, 'crm50-' || v_tag || '-' || replace(r.caso, '_', '') || '@exemplo.invalid');
    end loop;

    ---------------------------------------------------------------------------
    -- 1) Trial liga o lead do contato (e-mail sem caixa) e não cria card novo
    ---------------------------------------------------------------------------
    insert into public.leads_site (nome, telefone, email, assunto)
    values ('Teste 50 contato', f->>'liga_email', e->>'liga_email', 'Quero testar')
    returning id into v_lead;

    insert into public.tenants (nome, codigo, telefone)
    values ('Teste 50 Rede Liga', public.fn_gerar_codigo_tenant(),
            '00' || lpad((floor(random() * 1e9))::bigint::text, 9, '0'))
    returning id into v_t;
    t := t || jsonb_build_object('liga_email', v_t);
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem, email_cobranca)
    values (v_t, 'trial', now() + interval '15 days', 'signup', upper(e->>'liga_email'));

    select * into l from public.leads_site where id = v_lead;
    if l.tenant_id is distinct from v_t or l.status <> 'trial' then
      raise exception 'FALHOU: trial não ligou o lead do contato (status %, rede %)', l.status, l.tenant_id;
    end if;
    if l.estagio_antes_vinculo <> 'novo' or l.vinculo_criou_lead then
      raise exception 'FALHOU: vínculo não guardou o estágio de antes';
    end if;
    select count(*) into v_n from public.leads_site where tenant_id = v_t or lower(email) = e->>'liga_email';
    if v_n <> 1 then raise exception 'FALHOU: trial com e-mail de contato criou card novo (% cards)', v_n; end if;
    select count(*) into v_n from public.lead_interacoes
     where lead_id = v_lead and tipo = 'sistema' and texto like 'Conta trial criada%';
    if v_n <> 1 then raise exception 'FALHOU: vínculo gravou % interações (esperado 1)', v_n; end if;

    -- pelo telefone da rede, sem e-mail de cobrança
    insert into public.leads_site (nome, telefone, email, assunto)
    values ('Teste 50 contato tel', f->>'liga_tel', e->>'liga_tel', 'Quero testar')
    returning id into v_lead2;
    insert into public.tenants (nome, codigo, telefone)
    values ('Teste 50 Rede Tel', public.fn_gerar_codigo_tenant(), f->>'liga_tel')
    returning id into v_t2;
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem)
    values (v_t2, 'trial', now() + interval '15 days', 'signup');
    select tenant_id into v_t from public.leads_site where id = v_lead2;
    if v_t is distinct from v_t2 then raise exception 'FALHOU: trial não ligou o lead pelo telefone'; end if;

    ---------------------------------------------------------------------------
    -- 2) Trial sem lead que case → cria o card (fonte trial, nasceu do vínculo)
    ---------------------------------------------------------------------------
    insert into public.tenants (nome, codigo, telefone)
    values ('Teste 50 Rede Nova', public.fn_gerar_codigo_tenant(), f->>'cria')
    returning id into v_t;
    t := t || jsonb_build_object('cria', v_t);
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem, email_cobranca)
    values (v_t, 'trial', now() + interval '15 days', 'signup', e->>'cria');

    select * into l from public.leads_site where tenant_id = v_t;
    if l.id is null then raise exception 'FALHOU: trial sem contato não criou card'; end if;
    if l.fonte <> 'trial' or l.status <> 'trial' or not l.vinculo_criou_lead
       or l.nome <> 'Teste 50 Rede Nova' or l.empresa <> 'Teste 50 Rede Nova'
       or l.email <> e->>'cria' or l.telefone <> f->>'cria' then
      raise exception 'FALHOU: card criado pelo vínculo veio errado: %', to_jsonb(l);
    end if;

    -- segunda rede do mesmo dono (mesmo e-mail): card próprio, sem roubar o da 1ª
    insert into public.tenants (nome, codigo)
    values ('Teste 50 Rede Nova 2', public.fn_gerar_codigo_tenant())
    returning id into v_t2;
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem, email_cobranca)
    values (v_t2, 'trial', now() + interval '15 days', 'signup', e->>'cria');
    if not exists (select 1 from public.leads_site where id = l.id and tenant_id = v_t) then
      raise exception 'FALHOU: a 2ª rede do mesmo e-mail roubou o card da 1ª';
    end if;
    if not exists (select 1 from public.leads_site where tenant_id = v_t2 and vinculo_criou_lead) then
      raise exception 'FALHOU: a 2ª rede do mesmo e-mail ficou sem card';
    end if;

    ---------------------------------------------------------------------------
    -- 3) Ganho por qualquer caminho, e idempotente
    ---------------------------------------------------------------------------
    update public.assinaturas set estado = 'ativa' where tenant_id = (t->>'cria')::uuid;
    select status into v_txt from public.leads_site where tenant_id = (t->>'cria')::uuid;
    if v_txt <> 'ganho' then raise exception 'FALHOU: trial → ativa não foi para Ganho (%)', v_txt; end if;

    select count(*) into v_n from public.lead_interacoes i
      join public.leads_site ls on ls.id = i.lead_id where ls.tenant_id = (t->>'cria')::uuid;
    update public.assinaturas set estado = 'ativa' where tenant_id = (t->>'cria')::uuid;       -- webhook reentregue
    update public.assinaturas set estado = 'atrasada' where tenant_id = (t->>'cria')::uuid;
    update public.assinaturas set estado = 'ativa' where tenant_id = (t->>'cria')::uuid;       -- reativação
    select count(*) into v_n2 from public.lead_interacoes i
      join public.leads_site ls on ls.id = i.lead_id where ls.tenant_id = (t->>'cria')::uuid;
    if v_n2 <> v_n then raise exception 'FALHOU: reativação de quem já é Ganho gravou % interações', v_n2 - v_n; end if;
    select count(*) into v_n from public.leads_site where tenant_id = (t->>'cria')::uuid;
    if v_n <> 1 then raise exception 'FALHOU: reativação duplicou o card'; end if;

    -- trial → suspensa → ativa
    update public.assinaturas set estado = 'suspensa' where tenant_id = (t->>'liga_email')::uuid;
    select status into v_txt from public.leads_site where tenant_id = (t->>'liga_email')::uuid;
    if v_txt <> 'trial' then raise exception 'FALHOU: trial → suspensa mexeu no estágio (%)', v_txt; end if;
    update public.assinaturas set estado = 'ativa' where tenant_id = (t->>'liga_email')::uuid;
    select status into v_txt from public.leads_site where tenant_id = (t->>'liga_email')::uuid;
    if v_txt <> 'ganho' then raise exception 'FALHOU: trial → suspensa → ativa não foi para Ganho (%)', v_txt; end if;

    -- Ganho com assinatura cancelada continua Ganho (churn fora do escopo)
    update public.assinaturas set estado = 'cancelada' where tenant_id = (t->>'cria')::uuid;
    select status into v_txt from public.leads_site where tenant_id = (t->>'cria')::uuid;
    if v_txt <> 'ganho' then raise exception 'FALHOU: Ganho cancelado saiu de Ganho (%)', v_txt; end if;

    ---------------------------------------------------------------------------
    -- 4) Cancelada durante o trial → Perdido/cancelou
    ---------------------------------------------------------------------------
    insert into public.tenants (nome, codigo, telefone)
    values ('Teste 50 Rede Cancela', public.fn_gerar_codigo_tenant(), f->>'cancela')
    returning id into v_t;
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem, email_cobranca)
    values (v_t, 'trial', now() + interval '15 days', 'signup', e->>'cancela');
    update public.assinaturas set estado = 'cancelada' where tenant_id = v_t;
    select status, motivo_perda into l from public.leads_site where tenant_id = v_t;
    if l.status <> 'perdido' or l.motivo_perda <> 'cancelou' then
      raise exception 'FALHOU: trial cancelado foi para % / %', l.status, l.motivo_perda;
    end if;

    ---------------------------------------------------------------------------
    -- 5) Card em Perdido cria conta → Trial, sem o motivo antigo (edge 9)
    ---------------------------------------------------------------------------
    insert into public.leads_site (nome, telefone, email, assunto)
    values ('Teste 50 perdido', f->>'perdido', e->>'perdido', 'Quero testar')
    returning id into v_lead;
    update public.leads_site set status = 'perdido', motivo_perda = 'preco' where id = v_lead;
    insert into public.tenants (nome, codigo, telefone)
    values ('Teste 50 Rede Volta', public.fn_gerar_codigo_tenant(), f->>'perdido')
    returning id into v_t;
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem)
    values (v_t, 'trial', now() + interval '15 days', 'signup');
    select * into l from public.leads_site where id = v_lead;
    if l.status <> 'trial' or l.motivo_perda is not null or l.estagio_antes_vinculo <> 'perdido' then
      raise exception 'FALHOU: perdido que criou conta ficou % / % / %', l.status, l.motivo_perda, l.estagio_antes_vinculo;
    end if;

    -- Ganho marcado à mão antes do CRM, sem rede, cria conta trial → segue a
    -- assinatura (req. 26): vai para Trial. Senão o "Pronto quando" não fecha.
    insert into public.leads_site (nome, telefone, email, assunto)
    values ('Teste 50 ganho manual', f->>'ganho_manual', e->>'ganho_manual', 'Quero testar')
    returning id into v_lead;
    update public.leads_site set status = 'ganho' where id = v_lead;
    insert into public.tenants (nome, codigo, telefone)
    values ('Teste 50 Rede Ganho Manual', public.fn_gerar_codigo_tenant(), f->>'ganho_manual')
    returning id into v_t;
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem)
    values (v_t, 'trial', now() + interval '15 days', 'signup');
    select * into l from public.leads_site where id = v_lead;
    if l.tenant_id is distinct from v_t or l.status <> 'trial' then
      raise exception 'FALHOU: ganho manual que criou conta trial ficou em % (rede %)', l.status, l.tenant_id;
    end if;

    ---------------------------------------------------------------------------
    -- 6) Rede criada pelo master (já ativa, e-mail do gestor no Auth)
    ---------------------------------------------------------------------------
    insert into public.tenants (nome, codigo)
    values ('Teste 50 Rede Master', public.fn_gerar_codigo_tenant())
    returning id into v_t;
    begin
      insert into auth.users (id, email, raw_app_meta_data)
      values (gen_random_uuid(), upper(e->>'master'), jsonb_build_object('tenant_id', v_t::text))
      returning id into v_user;
    exception when others then
      raise exception 'FALHOU: não consegui criar o gestor de teste em auth.users (% %). Rode o resto comentando o caso 6.', sqlstate, sqlerrm;
    end;
    insert into public.assinaturas (tenant_id, estado, origem) values (v_t, 'ativa', 'master');
    select * into l from public.leads_site where tenant_id = v_t;
    if l.id is null or l.fonte <> 'master' or l.status <> 'ganho' or l.email <> e->>'master' then
      raise exception 'FALHOU: rede do master veio errada: %', to_jsonb(l);
    end if;

    ---------------------------------------------------------------------------
    -- 7) Conta de revisão da Google Play fica fora
    ---------------------------------------------------------------------------
    insert into public.tenants (nome, codigo, telefone, conta_revisao)
    values ('Teste 50 Revisão', public.fn_gerar_codigo_tenant(), f->>'revisao', true)
    returning id into v_t;
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem, email_cobranca)
    values (v_t, 'trial', now() + interval '15 days', 'signup', e->>'revisao');
    update public.assinaturas set estado = 'ativa' where tenant_id = v_t;
    if exists (select 1 from public.leads_site where tenant_id = v_t) then
      raise exception 'FALHOU: conta de revisão entrou no CRM';
    end if;

    ---------------------------------------------------------------------------
    -- 8) Falha forçada no vínculo: a assinatura fica ativa mesmo assim
    ---------------------------------------------------------------------------
    insert into public.tenants (nome, codigo, telefone)
    values ('Teste 50 Rede Falha', public.fn_gerar_codigo_tenant(), f->>'falha')
    returning id into v_t;
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem, email_cobranca)
    values (v_t, 'trial', now() + interval '15 days', 'signup', e->>'falha');
    execute 'alter table public.leads_site add constraint crm50_falha check (status <> ''ganho'') not valid';
    update public.assinaturas set estado = 'ativa' where tenant_id = v_t;
    execute 'alter table public.leads_site drop constraint crm50_falha';
    select estado into v_txt from public.assinaturas where tenant_id = v_t;
    if v_txt <> 'ativa' then raise exception 'FALHOU: erro no CRM desfez a ativação da assinatura'; end if;
    select status into v_txt from public.leads_site where tenant_id = v_t;
    if v_txt <> 'trial' then raise exception 'FALHOU: falha forçada deixou o card em %', v_txt; end if;
    if coalesce(current_setting('crm.motivo', true), '') <> '' then
      raise exception 'FALHOU: crm.motivo ficou sujo depois da falha';
    end if;

    ---------------------------------------------------------------------------
    -- 9) Rollback do cadastro (delete do tenant)
    ---------------------------------------------------------------------------
    -- card que nasceu do vínculo, em trial e sem nota humana → some
    insert into public.tenants (nome, codigo, telefone)
    values ('Teste 50 Rede Some', public.fn_gerar_codigo_tenant(), f->>'del_cria')
    returning id into v_t;
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem, email_cobranca)
    values (v_t, 'trial', now() + interval '15 days', 'signup', e->>'del_cria');
    select id into v_lead from public.leads_site where tenant_id = v_t;
    delete from public.tenants where id = v_t;
    if exists (select 1 from public.leads_site where id = v_lead) then
      raise exception 'FALHOU: rollback do cadastro deixou o card criado pelo vínculo';
    end if;

    -- lead do contato ligado → volta ao estágio de antes, com o histórico
    select id into v_lead from public.leads_site where tenant_id = (t->>'liga_email')::uuid;
    delete from public.tenants where id = (t->>'liga_email')::uuid;
    select * into l from public.leads_site where id = v_lead;
    if l.id is null then raise exception 'FALHOU: apagar a rede apagou o lead do contato'; end if;
    if l.tenant_id is not null or l.status <> 'novo' or l.estagio_antes_vinculo is not null then
      raise exception 'FALHOU: lead desligado ficou % / %', l.status, l.tenant_id;
    end if;
    select count(*) into v_n from public.lead_interacoes
     where lead_id = v_lead and texto like 'Conta da rede removida%';
    if v_n <> 1 then raise exception 'FALHOU: desligar não gravou "Conta da rede removida"'; end if;
    select count(*) into v_n from public.lead_interacoes where lead_id = v_lead and texto like 'Conta trial criada%';
    if v_n <> 1 then raise exception 'FALHOU: desligar apagou o histórico'; end if;

    -- card do vínculo com nota humana → só desligado
    insert into public.tenants (nome, codigo, telefone)
    values ('Teste 50 Rede Nota', public.fn_gerar_codigo_tenant(), f->>'del_nota')
    returning id into v_t;
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem, email_cobranca)
    values (v_t, 'trial', now() + interval '15 days', 'signup', e->>'del_nota');
    select id into v_lead from public.leads_site where tenant_id = v_t;
    insert into public.lead_interacoes (lead_id, tipo, texto) values (v_lead, 'ligacao', 'Liguei para a rede');
    delete from public.tenants where id = v_t;
    select * into l from public.leads_site where id = v_lead;
    if l.id is null or l.tenant_id is not null then
      raise exception 'FALHOU: card com nota humana foi apagado com a rede';
    end if;

    -- falha forçada no rollback: o tenant é apagado mesmo assim
    insert into public.tenants (nome, codigo, telefone)
    values ('Teste 50 Rede Falha Del', public.fn_gerar_codigo_tenant(), f->>'del_falha')
    returning id into v_t;
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem, email_cobranca)
    values (v_t, 'trial', now() + interval '15 days', 'signup', e->>'del_falha');
    select id into v_lead from public.leads_site where tenant_id = v_t;
    insert into public.lead_interacoes (lead_id, tipo, texto) values (v_lead, 'nota', 'Nota humana');
    execute 'alter table public.lead_interacoes add constraint crm50_falha check (false) not valid';
    delete from public.tenants where id = v_t;
    execute 'alter table public.lead_interacoes drop constraint crm50_falha';
    if exists (select 1 from public.tenants where id = v_t) then
      raise exception 'FALHOU: erro no CRM impediu apagar a rede';
    end if;

    ---------------------------------------------------------------------------
    -- 10) Importação: datas reais, regra dos 30 dias, idempotente
    ---------------------------------------------------------------------------
    execute 'alter table public.assinaturas disable trigger trg_assinaturas_crm_vinculo';

    insert into public.tenants (nome, codigo, telefone, criado_em)
    values ('Teste 50 Imp 31', public.fn_gerar_codigo_tenant(), f->>'imp31', now() - interval '46 days')
    returning id into v_t;
    t := t || jsonb_build_object('imp31', v_t);
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem, email_cobranca)
    values (v_t, 'trial', now() - interval '31 days', 'signup', e->>'imp31');

    insert into public.tenants (nome, codigo, telefone, criado_em)
    values ('Teste 50 Imp 29', public.fn_gerar_codigo_tenant(), f->>'imp29', '2026-10-01T12:00:00Z')
    returning id into v_t;
    t := t || jsonb_build_object('imp29', v_t);
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem, email_cobranca)
    values (v_t, 'trial', now() - interval '29 days', 'signup', e->>'imp29');

    insert into public.tenants (nome, codigo, telefone, criado_em)
    values ('Teste 50 Imp Ganho', public.fn_gerar_codigo_tenant(), f->>'imp_ganho', '2025-02-01T12:00:00Z')
    returning id into v_t;
    t := t || jsonb_build_object('imp_ganho', v_t);
    insert into public.assinaturas (tenant_id, estado, origem, email_cobranca, criado_em)
    values (v_t, 'ativa', 'signup', e->>'imp_ganho', '2025-02-01T12:00:00Z');
    insert into public.faturas (tenant_id, competencia, vencimento, estado, pago_em)
    values (v_t, '2025-03-01', '2025-03-10', 'paga', '2025-03-10T15:00:00Z'),
           (v_t, '2025-04-01', '2025-04-10', 'paga', '2025-04-09T15:00:00Z');

    insert into public.tenants (nome, codigo, telefone, criado_em)
    values ('Teste 50 Imp Ativa', public.fn_gerar_codigo_tenant(), f->>'imp_ativa', '2025-06-01T12:00:00Z')
    returning id into v_t;
    t := t || jsonb_build_object('imp_ativa', v_t);
    insert into public.assinaturas (tenant_id, estado, origem, email_cobranca, criado_em)
    values (v_t, 'ativa', 'master', e->>'imp_ativa', '2025-06-01T12:00:00Z');

    insert into public.tenants (nome, codigo, telefone, criado_em)
    values ('Teste 50 Imp Cancel', public.fn_gerar_codigo_tenant(), f->>'imp_cancel', '2025-07-01T12:00:00Z')
    returning id into v_t;
    t := t || jsonb_build_object('imp_cancel', v_t);
    insert into public.assinaturas (tenant_id, estado, origem, email_cobranca, criado_em, atualizado_em)
    values (v_t, 'cancelada', 'signup', e->>'imp_cancel', '2025-07-01T12:00:00Z', '2025-08-01T12:00:00Z');

    insert into public.tenants (nome, codigo, telefone, conta_revisao)
    values ('Teste 50 Imp Revisão', public.fn_gerar_codigo_tenant(), f->>'imp_revisao', true)
    returning id into v_t;
    t := t || jsonb_build_object('imp_revisao', v_t);
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem)
    values (v_t, 'trial', now() + interval '5 days', 'signup');

    -- contato em "em contato" que casa com a rede importada pelo telefone
    insert into public.leads_site (nome, telefone, email, assunto)
    values ('Teste 50 contato imp', f->>'imp_casa', e->>'imp_casa', 'Quero testar')
    returning id into v_lead2;
    update public.leads_site set status = 'em_contato' where id = v_lead2;
    insert into public.tenants (nome, codigo, telefone, criado_em)
    values ('Teste 50 Imp Casa', public.fn_gerar_codigo_tenant(), f->>'imp_casa', now() - interval '3 days')
    returning id into v_t;
    t := t || jsonb_build_object('imp_casa', v_t);
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem)
    values (v_t, 'trial', now() + interval '12 days', 'signup');

    -- ganho marcado à mão, sem rede, que casa com uma rede cancelada
    insert into public.leads_site (nome, telefone, email, assunto)
    values ('Teste 50 imp ganho manual', f->>'imp_ganho_manual', e->>'imp_ganho_manual', 'Quero testar')
    returning id into v_lead;
    update public.leads_site set status = 'ganho' where id = v_lead;
    insert into public.tenants (nome, codigo, telefone, criado_em)
    values ('Teste 50 Imp Ganho Manual', public.fn_gerar_codigo_tenant(), f->>'imp_ganho_manual', '2025-01-01T12:00:00Z')
    returning id into v_t;
    t := t || jsonb_build_object('imp_ganho_manual', v_t);
    insert into public.assinaturas (tenant_id, estado, origem, criado_em, atualizado_em)
    values (v_t, 'cancelada', 'signup', '2025-01-01T12:00:00Z', '2025-09-01T12:00:00Z');

    execute 'alter table public.assinaturas enable trigger trg_assinaturas_crm_vinculo';

    v_n := public.fn_crm_importar_base();
    if v_n < 7 then raise exception 'FALHOU: importação pegou % redes (esperado ao menos 7)', v_n; end if;

    -- trial expirado há 31 dias → Perdido/sem_retorno desde a expiração
    select * into l from public.leads_site where tenant_id = (t->>'imp31')::uuid;
    if l.status <> 'perdido' or l.motivo_perda <> 'sem_retorno' or l.fonte <> 'importacao'
       or abs(extract(epoch from (l.estagio_em - (now() - interval '31 days')))) > 1 then
      raise exception 'FALHOU: trial de 31 dias importado como % / % desde %', l.status, l.motivo_perda, l.estagio_em;
    end if;
    select count(*) into v_n from public.lead_interacoes where lead_id = l.id and texto like 'Importado: trial expirado em %';
    if v_n <> 1 then raise exception 'FALHOU: trial expirado sem a interação de importação'; end if;

    -- 29 dias → Trial desde o cadastro da rede
    select * into l from public.leads_site where tenant_id = (t->>'imp29')::uuid;
    if l.status <> 'trial' or l.estagio_em <> '2026-10-01T12:00:00Z'::timestamptz
       or l.criado_em <> '2026-10-01T12:00:00Z'::timestamptz then
      raise exception 'FALHOU: trial de 29 dias importado como % desde %', l.status, l.estagio_em;
    end if;

    -- Ganho de 2025: desde a 1ª fatura paga, fora da janela de 30 dias
    select * into l from public.leads_site where tenant_id = (t->>'imp_ganho')::uuid;
    if l.status <> 'ganho' or l.estagio_em <> '2025-03-10T15:00:00Z'::timestamptz then
      raise exception 'FALHOU: ganho importado como % desde %', l.status, l.estagio_em;
    end if;
    if l.estagio_em > now() - interval '30 days' then
      raise exception 'FALHOU: ganho antigo caiu na janela de 30 dias';
    end if;

    -- ativa sem fatura paga: desde a criação da assinatura
    select * into l from public.leads_site where tenant_id = (t->>'imp_ativa')::uuid;
    if l.status <> 'ganho' or l.estagio_em <> '2025-06-01T12:00:00Z'::timestamptz then
      raise exception 'FALHOU: ativa sem fatura importada desde %', l.estagio_em;
    end if;

    -- cancelada: Perdido/cancelou desde a última mudança da assinatura
    select * into l from public.leads_site where tenant_id = (t->>'imp_cancel')::uuid;
    if l.status <> 'perdido' or l.motivo_perda <> 'cancelou' or l.estagio_em <> '2025-08-01T12:00:00Z'::timestamptz then
      raise exception 'FALHOU: cancelada importada como % / % desde %', l.status, l.motivo_perda, l.estagio_em;
    end if;

    -- ganho manual ligado a rede cancelada → Perdido/cancelou, como a assinatura
    select * into l from public.leads_site where tenant_id = (t->>'imp_ganho_manual')::uuid;
    if l.status <> 'perdido' or l.motivo_perda <> 'cancelou' or l.estagio_antes_vinculo <> 'ganho' then
      raise exception 'FALHOU: ganho manual importado com rede cancelada ficou % / %', l.status, l.motivo_perda;
    end if;

    -- conta de revisão fora
    if exists (select 1 from public.leads_site where tenant_id = (t->>'imp_revisao')::uuid) then
      raise exception 'FALHOU: importação trouxe a conta de revisão';
    end if;

    -- contato que casa: ligado, não duplicado, com o estágio de antes guardado
    select * into l from public.leads_site where id = v_lead2;
    if l.tenant_id is distinct from (t->>'imp_casa')::uuid or l.status <> 'trial'
       or l.estagio_antes_vinculo <> 'em_contato' then
      raise exception 'FALHOU: importação não ligou o contato (% / %)', l.status, l.tenant_id;
    end if;
    select count(*) into v_n from public.leads_site where telefone = f->>'imp_casa';
    if v_n <> 1 then raise exception 'FALHOU: importação duplicou o contato'; end if;

    -- uma interação "Importado…" por lead
    for r in select value::uuid as tid from jsonb_each_text(t)
              where key like 'imp%' and key <> 'imp_revisao'
    loop
      select count(*) into v_n from public.lead_interacoes i
        join public.leads_site ls on ls.id = i.lead_id
       where ls.tenant_id = r.tid and i.texto like 'Importado%';
      if v_n <> 1 then raise exception 'FALHOU: rede % com % interações de importação', r.tid, v_n; end if;
    end loop;

    -- segunda rodada: nada muda
    select count(*) into v_n from public.leads_site;
    select count(*) into v_n2 from public.lead_interacoes;
    if public.fn_crm_importar_base() <> 0 then raise exception 'FALHOU: 2ª importação importou de novo'; end if;
    if (select count(*) from public.leads_site) <> v_n
       or (select count(*) from public.lead_interacoes) <> v_n2 then
      raise exception 'FALHOU: 2ª importação mudou a base';
    end if;

    ---------------------------------------------------------------------------
    -- 11) Observação antiga vira nota, uma vez só
    ---------------------------------------------------------------------------
    update public.leads_site set observacao = 'Pediu proposta para 3 pátios' where id = v_lead2;
    perform public.fn_crm_copiar_observacoes();
    perform public.fn_crm_copiar_observacoes();
    select count(*) into v_n from public.lead_interacoes
     where lead_id = v_lead2 and tipo = 'nota'
       and texto = 'Observação de antes do CRM: Pediu proposta para 3 pátios';
    if v_n <> 1 then raise exception 'FALHOU: observação copiada % vezes (esperado 1)', v_n; end if;

    ---------------------------------------------------------------------------
    -- 12) Permissões: nenhuma função fn_crm_* aberta para anon e authenticated
    ---------------------------------------------------------------------------
    for r in
      select p.oid, p.proname, rl.rolname
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
        cross join (values ('anon'), ('authenticated')) as rl(rolname)
       where p.proname like 'fn\_crm\_%'
    loop
      if has_function_privilege(r.rolname, r.oid, 'execute') then
        raise exception 'FALHOU: % executa %', r.rolname, r.proname;
      end if;
    end loop;

    raise exception '__crm_ok__';
  exception when raise_exception then
    if sqlerrm <> '__crm_ok__' then
      raise;
    end if;
  end;
end $$;

select '✅ CRM OK (db/48)' as resultado;
