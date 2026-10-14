-- ============================================================================
-- NuvemPark — 44 (teste): modalidade contrato em tarifas
-- Rodar no SQL Editor DEPOIS de db/44-tarifa-contrato.sql.
--
-- Tudo acontece dentro de BEGIN … ROLLBACK: nenhuma linha fica no banco.
-- Sucesso = termina com "✅ CONTRATO OK". Qualquer falha aborta com ❌.
--
-- O que prova:
--   1. tarifa contrato com objeto é aceita;
--   2. contrato nulo, array ou texto com modalidade contrato é recusado;
--   3. avulso e hospede continuam válidos sem a coluna;
--   4. modalidade desconhecida continua recusada.
-- ============================================================================
begin;

do $$
declare
  t uuid; p uuid;
begin
  insert into public.tenants (nome, codigo)
    values ('Teste Contrato', public.fn_gerar_codigo_tenant()) returning id into t;
  insert into public.patios (tenant_id, nome, qtd_vagas)
    values (t, 'Pátio Teste', 10) returning id into p;

  -- 1) objeto: aceito
  insert into public.tarifas (tenant_id, patio_id, nome, modalidade, contrato)
    values (t, p, 'Contrato', 'contrato', '{"versao": 1, "regras": []}'::jsonb);

  -- 2) nulo, array e texto: recusados
  begin
    insert into public.tarifas (tenant_id, patio_id, nome, modalidade, contrato)
      values (t, p, 'Sem contrato', 'contrato', null);
    raise exception '❌ 2a contrato nulo foi aceito';
  exception when check_violation then null;
  end;
  begin
    insert into public.tarifas (tenant_id, patio_id, nome, modalidade, contrato)
      values (t, p, 'Array', 'contrato', '[]'::jsonb);
    raise exception '❌ 2b contrato array foi aceito';
  exception when check_violation then null;
  end;
  begin
    insert into public.tarifas (tenant_id, patio_id, nome, modalidade, contrato)
      values (t, p, 'Texto', 'contrato', '"x"'::jsonb);
    raise exception '❌ 2c contrato texto foi aceito';
  exception when check_violation then null;
  end;

  -- 3) avulso e hospede sem a coluna
  insert into public.tarifas (tenant_id, patio_id, nome) values (t, p, 'Avulso');
  insert into public.tarifas (tenant_id, patio_id, nome, modalidade, diaria_valor, diaria_horas)
    values (t, p, 'Hóspede', 'hospede', 30, 24);

  -- 4) modalidade desconhecida
  begin
    insert into public.tarifas (tenant_id, patio_id, nome, modalidade)
      values (t, p, 'X', 'mensal');
    raise exception '❌ 4 modalidade desconhecida foi aceita';
  exception when check_violation then null;
  end;

  raise notice '✅ CONTRATO OK';
end $$;

rollback;
