-- ============================================================================
-- NuvemPark — 55: Prova da db/54 (temperatura, exclusão que guarda, prints)
-- Rodar no SQL Editor DEPOIS da 54. Não deixa nenhum dado: tudo roda numa
-- subtransação que é desfeita no fim, com ou sem `begin … rollback` em volta.
--
-- COMO LER O RESULTADO
--   ✅ a última linha mostra "✅ CRM OK (db/54)";
--   ❌ qualquer falha para o script com "FALHOU: <o quê>". Nada fica gravado.
--
-- Dados de teste: e-mails @exemplo.invalid e telefones com DDD 00.
--
-- Ensaio antes de aplicar de verdade:
--   begin;  <db/54>  <db/55>  rollback;
-- ============================================================================

do $$
declare
  v_tag   text := substr(md5(random()::text || clock_timestamp()::text), 1, 10);
  v_n     int;
  v_ok    boolean;
  v_txt   text;
  v_j     jsonb;
  v_id    uuid;
  v_anexo uuid;
  v_t     uuid;
  v_t2    uuid;
  l1 uuid; l2 uuid; l3 uuid; l4 uuid; l5 uuid; l6 uuid; l7 uuid; l8 uuid; l9 uuid;
  l       record;
  r       record;
  e       jsonb := '{}'::jsonb;   -- caso → e-mail
  f       jsonb := '{}'::jsonb;   -- caso → telefone
begin
  begin  -- subtransação: desfeita no fim pela sentinela '__crm_ok__'

    for r in select unnest(array['l1','l2','l3','l4','l5','l6','l7','l8','x','y','a','b']) as caso
    loop
      f := f || jsonb_build_object(r.caso, '00' || lpad((floor(random() * 1e9))::bigint::text, 9, '0'));
      e := e || jsonb_build_object(r.caso, 'crm55-' || v_tag || '-' || r.caso || '@exemplo.invalid');
    end loop;

    ---------------------------------------------------------------------------
    -- 1) Policy anônima: não cria lead já marcado nem já escondido
    ---------------------------------------------------------------------------
    v_ok := true;
    begin
      perform set_config('role', 'anon', true);
      insert into public.leads_site (nome, telefone, email, assunto, origem, temperatura)
      values ('Teste 55 anon', f->>'a', e->>'a', 'Contato com temperatura', '/teste-55', 'quente');
    exception when insufficient_privilege or check_violation then v_ok := false;
    end;
    perform set_config('role', 'postgres', true);
    if v_ok then raise exception 'FALHOU: anon criou lead com temperatura'; end if;

    v_ok := true;
    begin
      perform set_config('role', 'anon', true);
      insert into public.leads_site (nome, telefone, email, assunto, origem, excluido_em)
      values ('Teste 55 anon', f->>'b', e->>'b', 'Contato já excluído', '/teste-55', now());
    exception when insufficient_privilege or check_violation then v_ok := false;
    end;
    perform set_config('role', 'postgres', true);
    if v_ok then raise exception 'FALHOU: anon criou lead já excluído'; end if;

    ---------------------------------------------------------------------------
    -- 2) Temperatura
    ---------------------------------------------------------------------------
    insert into public.leads_site (nome, telefone, email, assunto, fonte)
    values ('Teste 55 L1', f->>'l1', e->>'l1', 'Lead para temperatura', 'manual')
    returning id into l1;

    if public.fn_crm_definir_temperatura(l1, null, 'quente') <> 'ok' then
      raise exception 'FALHOU: temperatura não gravou';
    end if;
    select count(*) into v_n from public.lead_interacoes
     where lead_id = l1 and tipo = 'sistema' and texto = 'Temperatura: — → Quente';
    if v_n <> 1 then raise exception 'FALHOU: temperatura não entrou na linha do tempo'; end if;
    if public.fn_crm_definir_temperatura(l1, null, 'morno') <> 'mudou' then
      raise exception 'FALHOU: compare-and-set da temperatura não pegou';
    end if;
    if public.fn_crm_definir_temperatura(l1, 'quente', null) <> 'ok' then
      raise exception 'FALHOU: não tirou a temperatura';
    end if;
    if public.fn_crm_definir_temperatura(gen_random_uuid(), null, 'frio') <> 'nao_encontrado' then
      raise exception 'FALHOU: temperatura de lead inexistente';
    end if;
    v_ok := true;
    begin
      perform public.fn_crm_definir_temperatura(l1, null, 'fervendo');
    exception when sqlstate '22023' then v_ok := false;
    end;
    if v_ok then raise exception 'FALHOU: aceitou temperatura inválida'; end if;
    v_ok := true;
    begin
      update public.leads_site set temperatura = 'fervendo' where id = l1;
    exception when check_violation then v_ok := false;
    end;
    if v_ok then raise exception 'FALHOU: o check de temperatura não segurou'; end if;

    ---------------------------------------------------------------------------
    -- 3) Excluir e restaurar
    ---------------------------------------------------------------------------
    if not public.fn_crm_excluir(l1) then raise exception 'FALHOU: não excluiu'; end if;
    if public.fn_crm_excluir(l1) then raise exception 'FALHOU: excluiu duas vezes'; end if;
    select * into l from public.leads_site where id = l1;
    if l.excluido_em is null then raise exception 'FALHOU: excluido_em vazio'; end if;
    select count(*) into v_n from public.lead_interacoes
     where lead_id = l1 and tipo = 'sistema' and texto = 'Excluído do CRM';
    if v_n <> 1 then raise exception 'FALHOU: exclusão gravou % interações', v_n; end if;

    -- nada escreve num excluído
    if public.fn_crm_definir_temperatura(l1, null, 'frio') <> 'excluido' then
      raise exception 'FALHOU: temperatura num excluído';
    end if;
    if public.fn_crm_mover(l1, 'novo', 'em_contato') <> 'excluido' then
      raise exception 'FALHOU: moveu um excluído';
    end if;
    v_ok := true;
    begin
      perform public.fn_crm_registrar_interacao(l1, 'nota', 'num excluído');
    exception when sqlstate '55000' then v_ok := false;
    end;
    if v_ok then raise exception 'FALHOU: anotou num excluído'; end if;
    v_j := public.fn_crm_editar_contato(l1, 'Outro nome', null, e->>'l1', null);
    if coalesce((v_j->>'excluido')::boolean, false) is not true then
      raise exception 'FALHOU: editou contato de um excluído: %', v_j;
    end if;

    -- lead manual com o contato de um excluído: duplicado marcado como excluído
    v_j := public.fn_crm_criar_lead_manual('Teste 55 manual', null, e->>'l1', null, 'novo');
    if (v_j->>'ok')::boolean
       or not coalesce((v_j->'duplicados'->0->>'excluido')::boolean, false) then
      raise exception 'FALHOU: duplicado excluído não veio marcado: %', v_j;
    end if;

    if not public.fn_crm_restaurar(l1) then raise exception 'FALHOU: não restaurou'; end if;
    if public.fn_crm_restaurar(l1) then raise exception 'FALHOU: restaurou um não excluído'; end if;
    select * into l from public.leads_site where id = l1;
    if l.excluido_em is not null or l.status <> 'novo' then
      raise exception 'FALHOU: restaurar deixou % / %', l.excluido_em, l.status;
    end if;
    select count(*) into v_n from public.lead_interacoes
     where lead_id = l1 and tipo = 'sistema' and texto = 'Restaurado no CRM';
    if v_n <> 1 then raise exception 'FALHOU: restauração gravou % interações', v_n; end if;

    ---------------------------------------------------------------------------
    -- 4) Formulário do site traz o excluído de volta
    ---------------------------------------------------------------------------
    insert into public.leads_site (nome, telefone, email, assunto)
    values ('Teste 55 L3', f->>'l3', e->>'l3', 'Primeiro contato')
    returning id into l3;
    if public.fn_crm_mover(l3, 'novo', 'perdido', 'preco') <> 'ok' then
      raise exception 'FALHOU: preparo do L3';
    end if;
    perform public.fn_crm_excluir(l3);
    select count(*) into v_n from public.lead_interacoes where lead_id = l3;

    perform set_config('role', 'anon', true);
    insert into public.leads_site (nome, telefone, email, assunto, origem)
    values ('Teste 55 L3 de novo', f->>'l3', e->>'l3', 'Voltei a procurar', '/teste-55');
    perform set_config('role', 'postgres', true);

    select * into l from public.leads_site where id = l3;
    if l.excluido_em is not null then raise exception 'FALHOU: formulário não restaurou o excluído'; end if;
    if l.status <> 'novo' or l.motivo_perda is not null then
      raise exception 'FALHOU: restaurado pelo formulário ficou em % (%)', l.status, l.motivo_perda;
    end if;
    select count(*) - v_n into v_n from public.lead_interacoes where lead_id = l3;
    if v_n <> 1 then raise exception 'FALHOU: restauração pelo formulário gravou % interações (esperado 1)', v_n; end if;
    if not exists (select 1 from public.lead_interacoes where lead_id = l3
                    and texto = 'Novo contato pelo site (voltou do Excluídos): Voltei a procurar') then
      raise exception 'FALHOU: texto da volta pelo formulário';
    end if;
    select count(*) into v_n from public.leads_site where lower(email) = e->>'l3' or telefone = f->>'l3';
    if v_n <> 1 then raise exception 'FALHOU: a volta pelo formulário deixou % linhas', v_n; end if;

    -- precedência: e-mail casa com um ativo, telefone com um excluído → vale o ativo
    insert into public.leads_site (nome, telefone, email, assunto, fonte)
    values ('Teste 55 L4 ativo', f->>'l4', e->>'x', 'Ativo', 'manual') returning id into l4;
    insert into public.leads_site (nome, telefone, email, assunto, fonte, criado_em)
    values ('Teste 55 L5 excluído', f->>'y', e->>'l5', 'Excluído', 'manual', now() + interval '1 second')
    returning id into l5;
    perform public.fn_crm_excluir(l5);
    perform set_config('role', 'anon', true);
    insert into public.leads_site (nome, telefone, email, assunto, origem)
    values ('Teste 55 X/Y', f->>'y', e->>'x', 'Casa com os dois', '/teste-55');
    perform set_config('role', 'postgres', true);
    if not exists (select 1 from public.lead_interacoes where lead_id = l4
                    and texto = 'Novo contato pelo site: Casa com os dois') then
      raise exception 'FALHOU: o ativo não recebeu o contato';
    end if;
    if exists (select 1 from public.leads_site where id = l5 and excluido_em is null) then
      raise exception 'FALHOU: o excluído foi restaurado mesmo havendo um ativo';
    end if;

    ---------------------------------------------------------------------------
    -- 5) Rede: conta criada liga e restaura; assinatura de excluído não cria card
    ---------------------------------------------------------------------------
    insert into public.leads_site (nome, telefone, email, assunto)
    values ('Teste 55 L7', f->>'l7', e->>'l7', 'Vou criar conta')
    returning id into l7;
    perform public.fn_crm_excluir(l7);

    insert into public.tenants (nome, codigo, telefone)
    values ('Teste 55 Rede 7', public.fn_gerar_codigo_tenant(),
            '00' || lpad((floor(random() * 1e9))::bigint::text, 9, '0'))
    returning id into v_t;
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem, email_cobranca)
    values (v_t, 'trial', now() + interval '15 days', 'signup', e->>'l7');

    select * into l from public.leads_site where id = l7;
    if l.tenant_id is distinct from v_t or l.status <> 'trial' or l.excluido_em is not null then
      raise exception 'FALHOU: conta criada não ligou/restaurou o excluído (rede %, % , %)',
        l.tenant_id, l.status, l.excluido_em;
    end if;
    if not exists (select 1 from public.lead_interacoes where lead_id = l7
                    and texto = 'Voltou do Excluídos: rede ligada') then
      raise exception 'FALHOU: volta pela rede sem nota';
    end if;

    -- excluído com rede ligada: a assinatura muda o estágio e ele continua excluído
    perform public.fn_crm_excluir(l7);
    update public.assinaturas set estado = 'ativa' where tenant_id = v_t;
    select * into l from public.leads_site where id = l7;
    if l.status <> 'ganho' then raise exception 'FALHOU: estágio do excluído não acompanhou a assinatura'; end if;
    if l.excluido_em is null then raise exception 'FALHOU: assinatura restaurou o excluído'; end if;
    select count(*) into v_n from public.leads_site where tenant_id = v_t;
    if v_n <> 1 then raise exception 'FALHOU: a rede excluída ganhou % cards', v_n; end if;

    -- formulário de um excluído COM rede: volta, mas fica no estágio da assinatura
    perform set_config('role', 'anon', true);
    insert into public.leads_site (nome, telefone, email, assunto, origem)
    values ('Teste 55 L7 form', f->>'l7', e->>'l7', 'Sou cliente e voltei', '/teste-55');
    perform set_config('role', 'postgres', true);
    select * into l from public.leads_site where id = l7;
    if l.excluido_em is not null or l.status <> 'ganho' then
      raise exception 'FALHOU: excluído com rede voltou errado (% / %)', l.excluido_em, l.status;
    end if;

    -- ativo ligado a OUTRA rede + excluído sem rede, mesmo e-mail → liga o excluído
    insert into public.leads_site (nome, telefone, email, assunto, fonte)
    values ('Teste 55 L8 ativo de outra rede', f->>'l8', e->>'l8', 'Ativo', 'manual')
    returning id into l8;
    insert into public.tenants (nome, codigo) values ('Teste 55 Rede 8', public.fn_gerar_codigo_tenant())
    returning id into v_t2;
    update public.leads_site set tenant_id = v_t2 where id = l8;
    insert into public.leads_site (nome, telefone, email, assunto, fonte, criado_em)
    values ('Teste 55 L9 excluído sem rede', f->>'x', e->>'l8', 'Excluído', 'manual', now() + interval '2 seconds')
    returning id into l9;
    perform public.fn_crm_excluir(l9);
    insert into public.tenants (nome, codigo) values ('Teste 55 Rede 9', public.fn_gerar_codigo_tenant())
    returning id into v_t;
    insert into public.assinaturas (tenant_id, estado, trial_expira_em, origem, email_cobranca)
    values (v_t, 'trial', now() + interval '15 days', 'signup', e->>'l8');
    select * into l from public.leads_site where id = l9;
    if l.tenant_id is distinct from v_t or l.excluido_em is not null then
      raise exception 'FALHOU: rede nova não ligou o excluído sem rede (rede %, %)', l.tenant_id, l.excluido_em;
    end if;
    if not exists (select 1 from public.leads_site where id = l8 and tenant_id = v_t2) then
      raise exception 'FALHOU: a rede nova roubou o card da outra rede';
    end if;

    ---------------------------------------------------------------------------
    -- 6) Prints na nota
    ---------------------------------------------------------------------------
    insert into public.leads_site (nome, telefone, email, assunto, fonte)
    values ('Teste 55 L2', f->>'l2', e->>'l2', 'Lead dos prints', 'manual')
    returning id into l2;

    v_ok := true;
    begin
      perform public.fn_crm_registrar_interacao(l2, 'nota', '   ', false, '[]'::jsonb);
    exception when sqlstate '22023' then v_ok := false;
    end;
    if v_ok then raise exception 'FALHOU: aceitou nota vazia sem print'; end if;

    -- a chamada da tela no ar (4 argumentos) continua valendo
    if public.fn_crm_registrar_interacao(l2, 'nota', 'Chamada antiga', false) is null then
      raise exception 'FALHOU: a chamada de 4 argumentos parou de funcionar';
    end if;

    v_txt := l2::text || '/' || gen_random_uuid()::text || '.webp';
    v_id := public.fn_crm_registrar_interacao(l2, 'whatsapp', '', false,
              jsonb_build_array(jsonb_build_object('caminho', v_txt, 'tipo_mime', 'image/webp',
                                                   'bytes', 412331, 'largura', 1170, 'altura', 2532)));
    if v_id is null then raise exception 'FALHOU: nota só com print não gravou'; end if;
    select count(*) into v_n from public.lead_anexos where interacao_id = v_id and ordem = 0 and caminho = v_txt;
    if v_n <> 1 then raise exception 'FALHOU: anexo não gravou'; end if;

    select count(*) into v_n from public.lead_interacoes where lead_id = l2;
    -- caminho de outro lead
    v_ok := true;
    begin
      perform public.fn_crm_registrar_interacao(l2, 'nota', 'forjado', false,
        jsonb_build_array(jsonb_build_object('caminho', l1::text || '/' || gen_random_uuid()::text || '.png',
                                             'tipo_mime', 'image/png', 'bytes', 10)));
    exception when sqlstate '22023' then v_ok := false;
    end;
    if v_ok then raise exception 'FALHOU: aceitou caminho de outro lead'; end if;
    -- caminho repetido (já é de outra nota)
    v_ok := true;
    begin
      perform public.fn_crm_registrar_interacao(l2, 'nota', 'repetido', false,
        jsonb_build_array(jsonb_build_object('caminho', v_txt, 'tipo_mime', 'image/webp', 'bytes', 10)));
    exception when unique_violation then v_ok := false;
    end;
    if v_ok then raise exception 'FALHOU: aceitou caminho repetido'; end if;
    -- 6 prints
    v_ok := true;
    begin
      select jsonb_agg(jsonb_build_object('caminho', l2::text || '/' || gen_random_uuid()::text || '.jpg',
                                          'tipo_mime', 'image/jpeg', 'bytes', 10))
        into v_j from generate_series(1, 6);
      perform public.fn_crm_registrar_interacao(l2, 'nota', 'seis', false, v_j);
    exception when sqlstate '22023' then v_ok := false;
    end;
    if v_ok then raise exception 'FALHOU: aceitou 6 prints'; end if;
    -- tipo fora da lista
    v_ok := true;
    begin
      perform public.fn_crm_registrar_interacao(l2, 'nota', 'gif', false,
        jsonb_build_array(jsonb_build_object('caminho', l2::text || '/' || gen_random_uuid()::text || '.png',
                                             'tipo_mime', 'image/gif', 'bytes', 10)));
    exception when check_violation then v_ok := false;
    end;
    if v_ok then raise exception 'FALHOU: aceitou GIF'; end if;
    -- as recusas não deixaram nota pela metade
    select count(*) - v_n into v_n from public.lead_interacoes where lead_id = l2;
    if v_n <> 0 then raise exception 'FALHOU: nota recusada ficou gravada (% linhas)', v_n; end if;

    -- remover print
    select id into v_anexo from public.lead_anexos where caminho = v_txt;
    if public.fn_crm_remover_anexo(v_anexo) is distinct from v_txt then
      raise exception 'FALHOU: remover print não devolveu o caminho';
    end if;
    if exists (select 1 from public.lead_anexos where id = v_anexo) then
      raise exception 'FALHOU: print removido continua na tabela';
    end if;
    select anexos_removidos into v_n from public.lead_interacoes where id = v_id;
    if v_n <> 1 then raise exception 'FALHOU: contador de print removido = %', v_n; end if;
    if public.fn_crm_remover_anexo(v_anexo) is not null then
      raise exception 'FALHOU: removeu duas vezes';
    end if;

    -- lead excluído: o print não sai
    v_txt := l2::text || '/' || gen_random_uuid()::text || '.png';
    v_id := public.fn_crm_registrar_interacao(l2, 'nota', 'com print', false,
              jsonb_build_array(jsonb_build_object('caminho', v_txt, 'tipo_mime', 'image/png', 'bytes', 99)));
    select id into v_anexo from public.lead_anexos where caminho = v_txt;
    perform public.fn_crm_excluir(l2);
    if public.fn_crm_remover_anexo(v_anexo) is not null then
      raise exception 'FALHOU: removeu print de lead excluído';
    end if;

    ---------------------------------------------------------------------------
    -- 7) Catálogo e permissões
    ---------------------------------------------------------------------------
    if to_regprocedure('public.fn_crm_excluir_spam(uuid)') is not null then
      raise exception 'FALHOU: fn_crm_excluir_spam ainda existe';
    end if;
    select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'fn_crm_registrar_interacao';
    if v_n <> 1 then raise exception 'FALHOU: % versões de fn_crm_registrar_interacao', v_n; end if;

    select relrowsecurity and relforcerowsecurity into v_ok
      from pg_class where oid = 'public.lead_anexos'::regclass;
    if not v_ok then raise exception 'FALHOU: lead_anexos sem RLS forçado'; end if;
    if has_table_privilege('anon', 'public.lead_anexos', 'select')
       or has_table_privilege('authenticated', 'public.lead_anexos', 'select') then
      raise exception 'FALHOU: lead_anexos legível pela chave pública';
    end if;

    if exists (select 1 from pg_namespace where nspname = 'storage') then
      execute $q$select coalesce((select not public from storage.buckets where id = 'crm-anexos'), false)$q$ into v_ok;
      if not v_ok then raise exception 'FALHOU: bucket crm-anexos ausente ou público'; end if;
    end if;

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

select '✅ CRM OK (db/54)' as resultado;
