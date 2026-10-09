-- ============================================================================
-- NuvemPark — 42 (teste): regra de pagamento de estadia
-- Rodar no SQL Editor DEPOIS de db/42-estadias.sql.
--
-- Tudo acontece dentro de BEGIN … ROLLBACK: nenhuma linha fica no banco.
-- Sucesso = termina com "✅ ESTADIAS OK". Qualquer falha aborta com ❌.
--
-- O que prova (spec estadia-hospede, Revisão 2):
--   1. contratação não estende a estadia;
--   2. renovação com a estadia válida conta a partir do vencimento;
--   3. duas renovações sobre o MESMO vencimento entregam todas as diárias
--      pagas (+1 e +2 = +72 h, não +48 h);
--   4. renovação "a partir de agora" (base depois do vencimento) conta da base;
--   5. reenvio do mesmo pagamento não aplica de novo;
--   6. pagamento de estadia que ainda não existe devolve 'estadia_ausente';
--   7. pagamento é imutável.
-- ============================================================================
begin;

do $$
declare
  t uuid; p uuid; tar uuid;
  v0 timestamptz := '2026-10-11 14:30:00+00';
  r text;
  e record;
  n int;
begin
  insert into public.tenants (nome, codigo)
    values ('Teste Estadias', public.fn_gerar_codigo_tenant()) returning id into t;
  insert into public.patios (tenant_id, nome, qtd_vagas)
    values (t, 'Pátio Teste', 10) returning id into p;
  insert into public.tarifas (tenant_id, patio_id, nome, tipo_veiculo, modalidade, diaria_valor, diaria_horas)
    values (t, p, 'Hóspede', 'carro', 'hospede', 30, 24) returning id into tar;

  insert into public.estadias (id, tenant_id, patio_id, placa, tipo_veiculo, tarifa_id,
                               diaria_valor, diaria_horas, inicio, valida_ate, diarias, valor_total)
    values ('est-1', t, p, 'RTO4F21', 'carro', tar, 30, 24,
            v0 - interval '72 hours', v0, 3, 90);

  -- 1) contratação: grava e não estende
  r := public.fn_estadia_registrar_pagamento('pg-0', t, p, 'est-1', 'contratacao', 3, 90,
         'pix', null, null, 'cx-1', 'mv-0', v0 - interval '72 hours');
  select * into e from public.estadias where id = 'est-1';
  if r <> 'ok' or e.valida_ate <> v0 or e.diarias <> 3 or e.valor_total <> 90 then
    raise exception '❌ 1 contratação: r=% valida_ate=% diarias=% total=%', r, e.valida_ate, e.diarias, e.valor_total;
  end if;

  -- 2) renovação +1 a partir do vencimento
  r := public.fn_estadia_registrar_pagamento('pg-1', t, p, 'est-1', 'renovacao', 1, 30,
         'dinheiro', v0, null, 'cx-1', 'mv-1', v0 - interval '1 hour');
  select * into e from public.estadias where id = 'est-1';
  if r <> 'ok' or e.valida_ate <> v0 + interval '24 hours' or e.diarias <> 4 or e.valor_total <> 120 then
    raise exception '❌ 2 renovação válida: r=% valida_ate=% diarias=%', r, e.valida_ate, e.diarias;
  end if;

  -- 3) segunda renovação feita em OUTRO aparelho sobre o mesmo vencimento v0
  r := public.fn_estadia_registrar_pagamento('pg-2', t, p, 'est-1', 'renovacao', 2, 60,
         'pix', v0, null, 'cx-2', 'mv-2', v0 - interval '50 minutes');
  select * into e from public.estadias where id = 'est-1';
  if r <> 'ok' or e.valida_ate <> v0 + interval '72 hours' or e.diarias <> 6 or e.valor_total <> 180 then
    raise exception '❌ 3 renovações concorrentes: valida_ate=% (esperado v0+72h) diarias=%', e.valida_ate, e.diarias;
  end if;

  -- 4) base depois do vencimento (carro fora, renovação "a partir de agora")
  r := public.fn_estadia_registrar_pagamento('pg-3', t, p, 'est-1', 'renovacao', 1, 30,
         'pix', v0 + interval '100 hours', null, 'cx-2', 'mv-3', v0 + interval '100 hours');
  select * into e from public.estadias where id = 'est-1';
  if r <> 'ok' or e.valida_ate <> v0 + interval '124 hours' then
    raise exception '❌ 4 renovação a partir de agora: valida_ate=% (esperado v0+124h)', e.valida_ate;
  end if;

  -- 5) reenvio do pg-3: não aplica de novo
  r := public.fn_estadia_registrar_pagamento('pg-3', t, p, 'est-1', 'renovacao', 1, 30,
         'pix', v0 + interval '100 hours', null, 'cx-2', 'mv-3', v0 + interval '100 hours');
  select * into e from public.estadias where id = 'est-1';
  select count(*) into n from public.estadia_pagamentos where estadia_id = 'est-1';
  if r <> 'duplicado' or e.valida_ate <> v0 + interval '124 hours' or e.diarias <> 7 or n <> 4 then
    raise exception '❌ 5 idempotência: r=% valida_ate=% diarias=% pagamentos=%', r, e.valida_ate, e.diarias, n;
  end if;

  -- rastro da extensão no pagamento
  perform 1 from public.estadia_pagamentos
   where id = 'pg-2' and valida_ate_antes = v0 + interval '24 hours'
     and valida_ate_depois = v0 + interval '72 hours';
  if not found then
    raise exception '❌ rastro valida_ate_antes/depois do pg-2 errado';
  end if;

  -- 6) estadia que ainda não chegou
  r := public.fn_estadia_registrar_pagamento('pg-9', t, p, 'est-nao-existe', 'renovacao', 1, 30,
         'pix', v0, null, 'cx-1', 'mv-9', v0);
  select count(*) into n from public.estadia_pagamentos where id = 'pg-9';
  if r <> 'estadia_ausente' or n <> 0 then
    raise exception '❌ 6 estadia ausente: r=% gravou=%', r, n;
  end if;

  -- 7) imutabilidade
  begin
    update public.estadia_pagamentos set valor = 1 where id = 'pg-1';
    raise exception '❌ 7 pagamento aceitou update de valor';
  exception when others then
    if sqlerrm like '❌%' then raise; end if;
  end;

  raise notice '✅ ESTADIAS OK';
end $$;

rollback;
