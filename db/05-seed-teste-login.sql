-- ============================================================================
-- ParkFlow — Seed de teste p/ validar o login da API (Fase 1)
-- Cria 1 tenant + 1 pátio + 1 operador vinculado. Senha do operador = "senha123".
-- Rodar no SQL Editor. Idempotente (usa códigos fixos de teste).
-- Depois de validar, dá pra apagar com o bloco de limpeza no fim.
-- ============================================================================

do $$
declare
  t uuid; p uuid; o uuid;
begin
  -- Tenant de teste com código FIXO '1234' (pra login previsível)
  select id into t from public.tenants where codigo = '1234';
  if t is null then
    insert into public.tenants (nome, codigo) values ('Tenant Teste', '1234') returning id into t;
  end if;

  insert into public.assinaturas (tenant_id, valor_por_patio, estado)
    values (t, 199.00, 'ativa')
    on conflict (tenant_id) do nothing;

  -- Pátio
  select id into p from public.patios where tenant_id = t and nome = 'Pátio Teste';
  if p is null then
    insert into public.patios (tenant_id, nome, codigo, qtd_vagas)
      values (t, 'Pátio Teste', 'P1', 40) returning id into p;
  end if;

  -- Operador (usuario 'ADMIN', senha 'senha123')
  select id into o from public.operadores where tenant_id = t and usuario = 'ADMIN';
  if o is null then
    insert into public.operadores (tenant_id, nome, usuario, senha_hash)
      values (t, 'Operador Teste', 'ADMIN',
              '$2a$10$wMPlVuJ8uoTj90OK48Mku.4h/pUhb6VuSNaSxwGgvkiyYO4WyPavC')
      returning id into o;
  end if;

  -- Vínculo operador <-> pátio
  insert into public.operador_patios (operador_id, patio_id, tenant_id)
    values (o, p, t)
    on conflict (operador_id, patio_id) do nothing;

  raise notice 'SEED LOGIN OK — tenant código=1234, usuario=ADMIN, senha=senha123, patio=%', p;
end $$;

-- ----------------------------------------------------------------------------
-- LIMPEZA (rode depois de validar, se quiser remover o seed de teste)
-- ----------------------------------------------------------------------------
-- delete from public.tenants where codigo = '1234';  -- cascata remove o resto
