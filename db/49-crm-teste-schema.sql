-- ============================================================================
-- NuvemPark — 49: Prova da db/47 (CRM, parte 1)
-- Rodar no SQL Editor DEPOIS da 47. Não deixa nenhum dado: tudo roda numa
-- subtransação que é desfeita no fim, com ou sem `begin … rollback` em volta.
--
-- COMO LER O RESULTADO
--   ✅ a última linha mostra "✅ CRM OK (db/47)";
--   ❌ qualquer falha para o script com "FALHOU: <o quê>". Nada fica gravado.
--
-- Os dados de teste usam e-mails @exemplo.invalid e telefones com DDD 00 (que
-- não existe), e toda contagem é limitada a eles. A role volta a `postgres`
-- depois de cada bloco que roda como anon.
--
-- Ensaio antes de aplicar de verdade:
--   begin;  <db/47>  <db/47 de novo>  <db/49>  rollback;
-- ============================================================================

do $$
declare
  v_tag     text := substr(md5(random()::text || clock_timestamp()::text), 1, 10);
  v_tel     text;
  v_tel2    text;
  v_tel3    text;
  v_email   text;
  v_email2  text;
  v_email3  text;
  v_lead    uuid;
  v_lead2   uuid;
  v_lead3   uuid;
  v_tenant  uuid;
  v_n       int;
  v_n2      int;
  v_ok      boolean;
  v_txt     text;
  v_ts      timestamptz;
  v_res     text;
  v_json    jsonb;
  r         record;
begin
  begin  -- subtransação: desfeita no fim pelo sentinela '__crm_ok__'

    v_tel    := '00' || lpad((floor(random() * 1e9))::bigint::text, 9, '0');
    v_tel2   := '00' || lpad((floor(random() * 1e9))::bigint::text, 9, '0');
    v_tel3   := '00' || lpad((floor(random() * 1e9))::bigint::text, 9, '0');
    v_email  := 'crm49-' || v_tag || '-a@exemplo.invalid';
    v_email2 := 'crm49-' || v_tag || '-b@exemplo.invalid';
    v_email3 := 'crm49-' || v_tag || '-c@exemplo.invalid';

    ---------------------------------------------------------------------------
    -- 1.1 Schema
    ---------------------------------------------------------------------------
    select count(*) into v_n
      from information_schema.columns
     where table_schema = 'public' and table_name = 'leads_site'
       and column_name in ('fonte','tenant_id','empresa','motivo_perda','proxima_acao',
                           'proxima_acao_em','utm_source','utm_medium','utm_campaign',
                           'estagio_em','vinculo_criou_lead','estagio_antes_vinculo');
    if v_n <> 12 then raise exception 'FALHOU: leads_site tem % das 12 colunas novas', v_n; end if;

    select count(*) into v_n from public.leads_site where estagio_em is null;
    if v_n <> 0 then raise exception 'FALHOU: % leads sem estagio_em', v_n; end if;

    -- Lead manual sem e-mail, sem assunto e em trial é aceito pelo schema
    insert into public.leads_site (nome, telefone, status, fonte)
    values ('Teste 49 schema', v_tel3, 'trial', 'manual') returning id into v_lead;
    delete from public.leads_site where id = v_lead;

    begin
      insert into public.leads_site (nome, telefone, status, fonte)
      values ('Teste 49 schema', v_tel3, 'fechado', 'manual');
      raise exception 'FALHOU: status inválido foi aceito';
    exception when check_violation then null;
    end;

    ---------------------------------------------------------------------------
    -- 1.2 Policy anônima
    ---------------------------------------------------------------------------
    -- insert válido do formulário passa
    perform set_config('role', 'anon', true);
    insert into public.leads_site (nome, telefone, email, assunto, origem)
    values ('Teste 49 A', v_tel, v_email, 'Quero conhecer o sistema', '/teste-49');
    perform set_config('role', 'postgres', true);

    select count(*) into v_n from public.leads_site where email = v_email;
    if v_n <> 1 then raise exception 'FALHOU: insert anônimo válido gravou % linhas', v_n; end if;
    select id into v_lead from public.leads_site where email = v_email;

    -- cada coluna interna é recusada (um insert por coluna, e-mail novo em cada)
    for r in
      select * from (values
        ('status',          $q$insert into public.leads_site (nome, telefone, email, assunto, status) values ('Teste 49 X', %L, %L, 'Quero conhecer o sistema', 'ganho')$q$),
        ('fonte',           $q$insert into public.leads_site (nome, telefone, email, assunto, fonte) values ('Teste 49 X', %L, %L, 'Quero conhecer o sistema', 'manual')$q$),
        ('proxima_acao',    $q$insert into public.leads_site (nome, telefone, email, assunto, proxima_acao) values ('Teste 49 X', %L, %L, 'Quero conhecer o sistema', 'ligar')$q$),
        ('proxima_acao_em', $q$insert into public.leads_site (nome, telefone, email, assunto, proxima_acao_em) values ('Teste 49 X', %L, %L, 'Quero conhecer o sistema', now())$q$),
        ('motivo_perda',    $q$insert into public.leads_site (nome, telefone, email, assunto, motivo_perda) values ('Teste 49 X', %L, %L, 'Quero conhecer o sistema', 'preco')$q$),
        ('empresa',         $q$insert into public.leads_site (nome, telefone, email, assunto, empresa) values ('Teste 49 X', %L, %L, 'Quero conhecer o sistema', 'Rede X')$q$),
        ('vinculo',         $q$insert into public.leads_site (nome, telefone, email, assunto, vinculo_criou_lead) values ('Teste 49 X', %L, %L, 'Quero conhecer o sistema', true)$q$),
        ('estagio_antes',   $q$insert into public.leads_site (nome, telefone, email, assunto, estagio_antes_vinculo) values ('Teste 49 X', %L, %L, 'Quero conhecer o sistema', 'novo')$q$),
        ('utm longo',       $q$insert into public.leads_site (nome, telefone, email, assunto, utm_source) values ('Teste 49 X', %L, %L, 'Quero conhecer o sistema', repeat('u', 101))$q$),
        ('sem telefone',    $q$insert into public.leads_site (nome, telefone, email, assunto) values ('Teste 49 X', null, %2$L, 'Quero conhecer o sistema')$q$)
      ) as t(coluna, sql)
    loop
      perform set_config('role', 'anon', true);
      begin
        execute format(r.sql, '00' || lpad((floor(random() * 1e9))::bigint::text, 9, '0'),
                       'crm49-' || v_tag || '-x' || md5(r.coluna) || '@exemplo.invalid');
        v_ok := true;
      exception when insufficient_privilege or check_violation then v_ok := false;
      end;
      perform set_config('role', 'postgres', true);
      if v_ok then raise exception 'FALHOU: anon gravou lead com "%"', r.coluna; end if;
    end loop;

    -- com tenant_id (precisa de uma rede de verdade para não cair na FK)
    select id into v_tenant from public.tenants limit 1;
    if v_tenant is not null then
      perform set_config('role', 'anon', true);
      begin
        insert into public.leads_site (nome, telefone, email, assunto, tenant_id)
        values ('Teste 49 X', v_tel2, 'crm49-' || v_tag || '-t@exemplo.invalid',
                'Quero conhecer o sistema', v_tenant);
        v_ok := true;
      exception when insufficient_privilege then v_ok := false;
      end;
      perform set_config('role', 'postgres', true);
      if v_ok then raise exception 'FALHOU: anon gravou lead com tenant_id'; end if;
    end if;

    -- anon e authenticated não leem a linha do tempo nem a view
    perform set_config('role', 'anon', true);
    begin
      perform 1 from public.lead_interacoes limit 1;
      v_ok := true;
    exception when insufficient_privilege then v_ok := false;
    end;
    perform set_config('role', 'postgres', true);
    if v_ok then raise exception 'FALHOU: anon lê lead_interacoes'; end if;

    perform set_config('role', 'anon', true);
    begin
      perform 1 from public.crm_leads_v limit 1;
      v_ok := true;
    exception when insufficient_privilege then v_ok := false;
    end;
    perform set_config('role', 'postgres', true);
    if v_ok then raise exception 'FALHOU: anon lê crm_leads_v'; end if;

    ---------------------------------------------------------------------------
    -- 1.3 Dedupe do contato (o trigger grava apesar do RLS forçado: quem
    --     insere aqui é o anon)
    ---------------------------------------------------------------------------
    perform set_config('role', 'anon', true);
    insert into public.leads_site (nome, telefone, email, assunto, origem)
    values ('Teste 49 A de novo', v_tel2, upper(v_email), 'Segundo contato, mesmo e-mail', '/teste-49');
    perform set_config('role', 'postgres', true);

    select count(*) into v_n from public.leads_site where lower(email) = v_email;
    if v_n <> 1 then
      raise exception 'FALHOU: 2º envio com o mesmo e-mail deixou % linhas (esperado 1). Se forem 2, o dono da função não passa pelo RLS forçado: ver edge 15 da spec', v_n;
    end if;
    select count(*) into v_n from public.lead_interacoes
     where lead_id = v_lead and tipo = 'sistema' and texto like 'Novo contato pelo site%';
    if v_n <> 1 then raise exception 'FALHOU: 2º envio gerou % interações (esperado 1)', v_n; end if;

    -- mesmo telefone, e-mail diferente → também casa
    perform set_config('role', 'anon', true);
    insert into public.leads_site (nome, telefone, email, assunto, origem)
    values ('Teste 49 A tel', v_tel, v_email2, 'Terceiro contato, mesmo telefone', '/teste-49');
    perform set_config('role', 'postgres', true);

    select count(*) into v_n from public.leads_site where email = v_email2;
    if v_n <> 0 then raise exception 'FALHOU: envio com o mesmo telefone criou lead novo'; end if;
    select count(*) into v_n from public.lead_interacoes
     where lead_id = v_lead and texto like 'Novo contato pelo site%';
    if v_n <> 2 then raise exception 'FALHOU: envio pelo telefone não virou interação (% de 2)', v_n; end if;

    -- assunto de 10 mil caracteres: a policy recusa e nada é gravado
    perform set_config('role', 'anon', true);
    begin
      insert into public.leads_site (nome, telefone, email, assunto, origem)
      values ('Teste 49 A', v_tel, v_email, repeat('x', 10000), '/teste-49');
      v_ok := true;
    exception when insufficient_privilege then v_ok := false;
    end;
    perform set_config('role', 'postgres', true);
    if v_ok then raise exception 'FALHOU: assunto de 10 mil caracteres foi aceito'; end if;
    select count(*) into v_n from public.lead_interacoes where lead_id = v_lead;
    if v_n <> 2 then raise exception 'FALHOU: assunto gigante gravou interação'; end if;

    -- 3º envio em 24 h ainda grava; o 4º e o 5º não
    for i in 1..3 loop
      perform set_config('role', 'anon', true);
      insert into public.leads_site (nome, telefone, email, assunto, origem)
      values ('Teste 49 A', v_tel, v_email, 'Mais um contato número ' || i, '/teste-49');
      perform set_config('role', 'postgres', true);
    end loop;
    select count(*) into v_n from public.lead_interacoes
     where lead_id = v_lead and texto like 'Novo contato pelo site%';
    if v_n <> 3 then raise exception 'FALHOU: teto de 3 por 24 h não segurou (% interações)', v_n; end if;
    select count(*) into v_n from public.leads_site where lower(email) = v_email or telefone = v_tel;
    if v_n <> 1 then raise exception 'FALHOU: envios acima do teto criaram lead (% linhas)', v_n; end if;

    -- edge 3: e-mail casa com A e telefone com B → vai para o mais recente
    insert into public.leads_site (nome, telefone, email, assunto, criado_em)
    values ('Teste 49 B', v_tel3, v_email3, 'Lead B', now() + interval '1 second')
    returning id into v_lead2;
    perform set_config('role', 'anon', true);
    insert into public.leads_site (nome, telefone, email, assunto, origem)
    values ('Teste 49 A ou B', v_tel3, v_email, 'Casa com A pelo e-mail e com B pelo telefone', '/teste-49');
    perform set_config('role', 'postgres', true);
    select count(*) into v_n from public.lead_interacoes
     where lead_id = v_lead2 and texto like 'Novo contato pelo site%';
    if v_n <> 1 then raise exception 'FALHOU: contato que casa com A e B não foi para o mais recente'; end if;
    delete from public.leads_site where id = v_lead2;

    -- falha forçada no dedupe: o lead entra como novo (perder é pior que duplicar).
    -- Num lead novo, abaixo do teto, para o insert da interação ser tentado.
    v_txt := 'crm49-' || v_tag || '-f@exemplo.invalid';
    perform set_config('role', 'anon', true);
    insert into public.leads_site (nome, telefone, email, assunto, origem)
    values ('Teste 49 F', v_tel2, v_txt, 'Primeiro contato do F', '/teste-49');
    perform set_config('role', 'postgres', true);
    execute 'alter table public.lead_interacoes add constraint crm49_falha check (false) not valid';
    perform set_config('role', 'anon', true);
    insert into public.leads_site (nome, telefone, email, assunto, origem)
    values ('Teste 49 F de novo', v_tel2, v_txt, 'Contato com o dedupe quebrado', '/teste-49');
    perform set_config('role', 'postgres', true);
    execute 'alter table public.lead_interacoes drop constraint crm49_falha';
    select count(*) into v_n from public.leads_site where email = v_txt;
    if v_n <> 2 then raise exception 'FALHOU: com o dedupe quebrado o contato se perdeu (% linhas, esperado 2)', v_n; end if;
    delete from public.leads_site where email = v_txt;

    ---------------------------------------------------------------------------
    -- 1.4 Trigger de estágio
    ---------------------------------------------------------------------------
    -- atualizado_em/estagio_em no passado, sem mudar o status (o trigger não roda)
    update public.leads_site set estagio_em = now() - interval '10 days' where id = v_lead;
    select count(*) into v_n from public.lead_interacoes where lead_id = v_lead;

    update public.leads_site set status = 'em_contato' where id = v_lead;
    select estagio_em, atendido_em into v_ts, v_txt from public.leads_site where id = v_lead;
    if v_ts < now() - interval '1 minute' then raise exception 'FALHOU: estagio_em não mudou'; end if;
    if v_txt is null then raise exception 'FALHOU: atendido_em não foi carimbado ao sair de novo'; end if;
    select count(*) into v_n2 from public.lead_interacoes where lead_id = v_lead;
    if v_n2 <> v_n + 1 then raise exception 'FALHOU: mudança de estágio gerou % interações', v_n2 - v_n; end if;
    -- o texto padrão é conferido pelo conteúdo, não pela ordem (mesmo now())
    select count(*) into v_n from public.lead_interacoes
     where lead_id = v_lead and texto = 'Estágio: Novo → Em contato';
    if v_n <> 1 then raise exception 'FALHOU: texto padrão da interação de estágio'; end if;

    -- UPDATE de status para o mesmo valor: nada
    select count(*) into v_n from public.lead_interacoes where lead_id = v_lead;
    update public.leads_site set status = 'em_contato' where id = v_lead;
    select count(*) into v_n2 from public.lead_interacoes where lead_id = v_lead;
    if v_n2 <> v_n then raise exception 'FALHOU: status igual gerou interação'; end if;

    -- crm.motivo vira o texto e é limpo depois de usado
    perform set_config('crm.motivo', 'Texto vindo do crm.motivo', true);
    update public.leads_site set status = 'novo' where id = v_lead;
    select count(*) into v_n from public.lead_interacoes
     where lead_id = v_lead and texto = 'Texto vindo do crm.motivo';
    if v_n <> 1 then raise exception 'FALHOU: crm.motivo não virou o texto da interação'; end if;
    if coalesce(current_setting('crm.motivo', true), '') <> '' then
      raise exception 'FALHOU: crm.motivo não foi limpo depois de usado';
    end if;

    -- atendido_em não é sobrescrito na segunda saída de novo
    update public.leads_site set atendido_em = '2025-01-02T12:00:00Z' where id = v_lead;
    update public.leads_site set status = 'em_contato' where id = v_lead;
    select atendido_em into v_ts from public.leads_site where id = v_lead;
    if v_ts <> '2025-01-02T12:00:00Z'::timestamptz then
      raise exception 'FALHOU: atendido_em foi sobrescrito';
    end if;

    -- estagio_em informado no próprio UPDATE é respeitado (a importação usa)
    update public.leads_site
       set status = 'perdido', motivo_perda = 'preco', estagio_em = '2025-05-05T10:00:00Z'
     where id = v_lead;
    select estagio_em into v_ts from public.leads_site where id = v_lead;
    if v_ts <> '2025-05-05T10:00:00Z'::timestamptz then
      raise exception 'FALHOU: estagio_em informado foi trocado por now()';
    end if;
    select count(*) into v_n from public.lead_interacoes
     where lead_id = v_lead and texto = 'Estágio: Em contato → Perdido (motivo: preço)';
    if v_n <> 1 then raise exception 'FALHOU: texto da perda sem o motivo'; end if;

    -- falha forçada: o status muda mesmo sem conseguir gravar a interação
    execute 'alter table public.lead_interacoes add constraint crm49_falha check (false) not valid';
    update public.leads_site set status = 'em_contato', motivo_perda = null where id = v_lead;
    execute 'alter table public.lead_interacoes drop constraint crm49_falha';
    select status into v_txt from public.leads_site where id = v_lead;
    if v_txt <> 'em_contato' then raise exception 'FALHOU: falha no trigger de estágio desfez o UPDATE'; end if;

    ---------------------------------------------------------------------------
    -- 1.5 Funções das actions
    ---------------------------------------------------------------------------
    -- compare-and-set: estágio lido desatualizado não grava
    v_res := public.fn_crm_mover(v_lead, 'novo', 'perdido', 'preco', null);
    if v_res <> 'mudou' then raise exception 'FALHOU: fn_crm_mover desatualizado devolveu %', v_res; end if;
    select status into v_txt from public.leads_site where id = v_lead;
    if v_txt <> 'em_contato' then raise exception 'FALHOU: fn_crm_mover desatualizado gravou'; end if;

    v_res := public.fn_crm_mover(gen_random_uuid(), 'novo', 'em_contato');
    if v_res <> 'nao_encontrado' then raise exception 'FALHOU: lead inexistente devolveu %', v_res; end if;

    -- perda com comentário: motivo gravado, nota humana gravada
    v_res := public.fn_crm_mover(v_lead, 'em_contato', 'perdido', 'outro', 'Fechou com o sobrinho');
    if v_res <> 'ok' then raise exception 'FALHOU: fn_crm_mover devolveu %', v_res; end if;
    select motivo_perda into v_txt from public.leads_site where id = v_lead;
    if v_txt <> 'outro' then raise exception 'FALHOU: motivo_perda não gravado'; end if;
    select count(*) into v_n from public.lead_interacoes
     where lead_id = v_lead and tipo = 'nota' and texto = 'Fechou com o sobrinho';
    if v_n <> 1 then raise exception 'FALHOU: comentário da perda não virou nota'; end if;

    -- saindo de perdido, o motivo é limpo
    v_res := public.fn_crm_mover(v_lead, 'perdido', 'em_contato');
    select motivo_perda into v_txt from public.leads_site where id = v_lead;
    if v_res <> 'ok' or v_txt is not null then raise exception 'FALHOU: sair de perdido não limpou o motivo'; end if;

    -- invariantes: ganho não é destino, cancelou é do sistema, outro exige texto
    for r in select * from (values
        ('ganho', null::text, null::text),
        ('perdido', 'cancelou', null),
        ('perdido', null, null),
        ('perdido', 'outro', '   ')
      ) as t(para, motivo, texto)
    loop
      begin
        perform public.fn_crm_mover(v_lead, 'em_contato', r.para, r.motivo, r.texto);
        v_ok := true;
      exception when invalid_parameter_value then v_ok := false;
      end;
      if v_ok then raise exception 'FALHOU: fn_crm_mover aceitou % / %', r.para, coalesce(r.motivo, 'sem motivo'); end if;
    end loop;

    -- trial só volta com a rede em trial: lead sem rede não "reabre"
    v_res := public.fn_crm_mover(v_lead, 'em_contato', 'trial');
    if v_res <> 'mudou' then raise exception 'FALHOU: lead sem rede foi para trial (%)', v_res; end if;
    if coalesce(current_setting('crm.motivo', true), '') <> '' then
      raise exception 'FALHOU: crm.motivo ficou sujo depois de um mover recusado';
    end if;

    -- registrar interação: grava, conclui a próxima ação, recusa 'sistema'
    update public.leads_site set proxima_acao = 'Ligar', proxima_acao_em = now() where id = v_lead;
    v_lead2 := public.fn_crm_registrar_interacao(v_lead, 'ligacao', 'Liguei, pediu proposta', true);
    if v_lead2 is null then raise exception 'FALHOU: fn_crm_registrar_interacao não gravou'; end if;
    select proxima_acao into v_txt from public.leads_site where id = v_lead;
    if v_txt is not null then raise exception 'FALHOU: concluir não limpou a próxima ação'; end if;
    begin
      perform public.fn_crm_registrar_interacao(v_lead, 'sistema', 'forjado', false);
      v_ok := true;
    exception when invalid_parameter_value then v_ok := false;
    end;
    if v_ok then raise exception 'FALHOU: master gravou interação do tipo sistema'; end if;
    if public.fn_crm_registrar_interacao(gen_random_uuid(), 'nota', 'x', false) is not null then
      raise exception 'FALHOU: interação em lead inexistente';
    end if;

    -- lead manual duplicado: não cria e devolve os dois que casaram
    insert into public.leads_site (nome, telefone, email, assunto, criado_em)
    values ('Teste 49 B', v_tel3, v_email3, 'Lead B', now() + interval '1 second')
    returning id into v_lead2;
    select count(*) into v_n from public.leads_site;
    v_json := public.fn_crm_criar_lead_manual('Teste 49 manual', null, '  ' || upper(v_email) || ' ',
                                               '(' || substr(v_tel3, 1, 2) || ') ' || substr(v_tel3, 3), 'novo');
    select count(*) into v_n2 from public.leads_site;
    if (v_json->>'ok')::boolean or v_n2 <> v_n then
      raise exception 'FALHOU: duplicado manual foi criado (%)', v_json;
    end if;
    if jsonb_array_length(v_json->'duplicados') <> 2 then
      raise exception 'FALHOU: esperava 2 duplicados (e-mail e telefone), veio %', v_json;
    end if;

    -- lead manual novo: cria com nota e interação de sistema
    v_json := public.fn_crm_criar_lead_manual('Teste 49 manual', 'Rede Manual', null,
                                               '00' || lpad((floor(random() * 1e9))::bigint::text, 9, '0'),
                                               'em_contato', 'Indicação do João', 'Ligar', now() + interval '1 day');
    if not (v_json->>'ok')::boolean then raise exception 'FALHOU: lead manual não criado (%)', v_json; end if;
    v_lead3 := (v_json->>'id')::uuid;
    select count(*) into v_n from public.lead_interacoes where lead_id = v_lead3;
    if v_n <> 2 then raise exception 'FALHOU: lead manual com % interações (esperado 2)', v_n; end if;
    select fonte into v_txt from public.leads_site where id = v_lead3;
    if v_txt <> 'manual' then raise exception 'FALHOU: fonte do lead manual = %', v_txt; end if;

    begin
      perform public.fn_crm_criar_lead_manual('Sem contato', null, '  ', ' ', 'novo');
      v_ok := true;
    exception when invalid_parameter_value then v_ok := false;
    end;
    if v_ok then raise exception 'FALHOU: lead manual sem contato foi aceito'; end if;

    -- spam: recusa lead com nota, lead manual e lead com rede; apaga o limpo
    if public.fn_crm_excluir_spam(v_lead) then
      raise exception 'FALHOU: excluiu como spam um lead com nota humana';
    end if;
    if public.fn_crm_excluir_spam(v_lead3) then
      raise exception 'FALHOU: excluiu como spam um lead manual';
    end if;
    if v_tenant is not null then
      update public.leads_site set tenant_id = v_tenant where id = v_lead2
        and not exists (select 1 from public.leads_site where tenant_id = v_tenant);
      if found and public.fn_crm_excluir_spam(v_lead2) then
        raise exception 'FALHOU: excluiu como spam um lead com rede ligada';
      end if;
      update public.leads_site set tenant_id = null where id = v_lead2;
    end if;
    if not public.fn_crm_excluir_spam(v_lead2) then
      raise exception 'FALHOU: não excluiu um spam limpo do formulário';
    end if;
    if exists (select 1 from public.leads_site where id = v_lead2) then
      raise exception 'FALHOU: spam continua na tabela';
    end if;

    -- a view: o indicador de interação humana
    select tem_interacao_humana into v_ok from public.crm_leads_v where id = v_lead;
    if not v_ok then raise exception 'FALHOU: crm_leads_v não viu a nota humana'; end if;

    ---------------------------------------------------------------------------
    -- Permissões, pelo catálogo: nenhuma função fn_crm_* nem a view abertas
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

    select count(*) into v_n from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
     where p.proname like 'fn\_crm\_%';
    if v_n < 9 then raise exception 'FALHOU: só % funções fn_crm_* no catálogo', v_n; end if;

    for r in select * from (values ('anon'), ('authenticated')) as t(rolname) loop
      if has_table_privilege(r.rolname, 'public.crm_leads_v', 'select') then
        raise exception 'FALHOU: % lê crm_leads_v', r.rolname;
      end if;
      if has_table_privilege(r.rolname, 'public.lead_interacoes', 'select')
         or has_table_privilege(r.rolname, 'public.lead_interacoes', 'insert') then
        raise exception 'FALHOU: % acessa lead_interacoes', r.rolname;
      end if;
    end loop;

    -- anon chamando uma RPC de verdade
    perform set_config('role', 'anon', true);
    begin
      perform public.fn_crm_casar(v_email, null);
      v_ok := true;
    exception when insufficient_privilege then v_ok := false;
    end;
    perform set_config('role', 'postgres', true);
    if v_ok then raise exception 'FALHOU: anon executou fn_crm_casar'; end if;

    -- security_invoker ligado na view
    select coalesce(bool_or(o = 'security_invoker=true'), false) into v_ok
      from pg_class c, unnest(c.reloptions) o
     where c.oid = 'public.crm_leads_v'::regclass;
    if not v_ok then raise exception 'FALHOU: crm_leads_v sem security_invoker'; end if;

    raise exception '__crm_ok__';
  exception when raise_exception then
    if sqlerrm <> '__crm_ok__' then
      raise;
    end if;
  end;
end $$;

select '✅ CRM OK (db/47)' as resultado;
