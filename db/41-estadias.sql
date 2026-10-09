-- ============================================================================
-- NuvemPark — 41: Estadia de hóspede (hotéis)
-- Projeto: xrwrsswhoywzzhutzrjx · Idempotente. Aplicar MANUALMENTE no SQL Editor
-- ANTES do deploy da API (o pipeline não aplica migrations).
-- Teste: db/41-estadias-teste.sql (roda em BEGIN … ROLLBACK).
--
-- Spec: .planning/specs/estadia-hospede.md
--
--   tarifas            ganha a modalidade 'hospede' (valor por diária, duração,
--                      tabela avulsa usada no atraso)
--   estadias           a estadia contratada; nasce no app (id gerado lá) e chega
--                      pelo /sync como create-only
--   estadia_pagamentos contratação e renovações, imutáveis
--   tickets            estadia_id + origem 'estadia'
--   caixa_movimentos   estadia_pagamento_id (o movimento da diária não tem ticket)
--
-- Quem estende o vencimento é SÓ fn_estadia_registrar_pagamento, com trava de
-- linha: valida_ate = greatest(valida_ate_atual, base) + diarias × diaria_horas.
-- Duas renovações feitas em aparelhos diferentes sobre o mesmo vencimento somam
-- as duas — nenhuma diária paga se perde (Revisão 2 da spec).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) tarifas: modalidade de hóspede
-- ----------------------------------------------------------------------------
alter table public.tarifas add column if not exists modalidade text not null default 'avulso';
alter table public.tarifas add column if not exists diaria_valor numeric(10,2);
alter table public.tarifas add column if not exists diaria_horas integer;
alter table public.tarifas add column if not exists tarifa_atraso_id uuid;  -- join manual -> tarifas.id

alter table public.tarifas drop constraint if exists tarifas_modalidade_check;
alter table public.tarifas add constraint tarifas_modalidade_check
  check (modalidade in ('avulso', 'hospede'));

alter table public.tarifas drop constraint if exists tarifas_hospede_campos_check;
alter table public.tarifas add constraint tarifas_hospede_campos_check
  check (
    modalidade <> 'hospede'
    or (diaria_valor is not null and diaria_valor > 0
        and diaria_horas is not null and diaria_horas between 1 and 168)
  );

comment on column public.tarifas.modalidade is
  'avulso = cobra pelo tempo na saída; hospede = diárias pagas na contratação';
comment on column public.tarifas.tarifa_atraso_id is
  'Tabela avulsa usada para cobrar o atraso da estadia; nulo = primeira avulsa visível do tipo';

-- ----------------------------------------------------------------------------
-- 2) estadias
-- ----------------------------------------------------------------------------
create table if not exists public.estadias (
  id               text primary key,                -- gerado no app (sync)
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  patio_id         uuid not null references public.patios(id) on delete cascade,
  placa            text not null,
  tipo_veiculo     text not null,
  tarifa_id        uuid not null,                   -- join manual -> tarifas.id
  diaria_valor     numeric(10,2) not null,          -- congelado na contratação
  diaria_horas     integer not null,                -- congelado na contratação
  inicio           timestamptz not null,
  valida_ate       timestamptz not null,
  diarias          integer not null check (diarias > 0),
  valor_total      numeric(10,2) not null check (valor_total >= 0),
  operador_id      uuid,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  sincronizado_em  timestamptz
);
create index if not exists idx_estadias_patio_valida on public.estadias (patio_id, valida_ate desc);
create index if not exists idx_estadias_patio_placa  on public.estadias (patio_id, placa);
create index if not exists idx_estadias_tenant       on public.estadias (tenant_id);

drop trigger if exists trg_estadias_updated on public.estadias;
create trigger trg_estadias_updated before update on public.estadias
  for each row execute function public.fn_set_updated_at();

-- ----------------------------------------------------------------------------
-- 3) estadia_pagamentos (imutável)
-- ----------------------------------------------------------------------------
create table if not exists public.estadia_pagamentos (
  id                  text primary key,             -- gerado no app (sync)
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  patio_id            uuid not null references public.patios(id) on delete cascade,
  estadia_id          text not null,                -- join manual -> estadias.id
  tipo                text not null check (tipo in ('contratacao', 'renovacao')),
  diarias             integer not null check (diarias > 0),
  valor               numeric(10,2) not null check (valor >= 0),
  forma_pagamento     text not null,
  base                timestamptz,                  -- renovação: de onde conta
  valida_ate_antes    timestamptz,
  valida_ate_depois   timestamptz,
  operador_id         uuid,
  caixa_sessao_id     text,                         -- join manual
  caixa_movimento_id  text,                         -- join manual
  pago_em             timestamptz not null,
  criado_em           timestamptz not null default now(),
  sincronizado_em     timestamptz
);
create index if not exists idx_estadia_pag_estadia on public.estadia_pagamentos (estadia_id);
create index if not exists idx_estadia_pag_patio   on public.estadia_pagamentos (patio_id, pago_em desc);
create index if not exists idx_estadia_pag_tenant  on public.estadia_pagamentos (tenant_id);

create or replace function public.fn_estadia_pag_imutavel()
returns trigger language plpgsql as $$
begin
  if (to_jsonb(new) - 'sincronizado_em') is distinct from (to_jsonb(old) - 'sincronizado_em') then
    raise exception 'estadia_pagamentos é imutável';
  end if;
  return new;
end $$;

drop trigger if exists trg_estadia_pag_imutavel on public.estadia_pagamentos;
create trigger trg_estadia_pag_imutavel
  before update on public.estadia_pagamentos
  for each row execute function public.fn_estadia_pag_imutavel();

-- ----------------------------------------------------------------------------
-- 4) tickets e caixa_movimentos
-- ----------------------------------------------------------------------------
alter table public.tickets add column if not exists estadia_id text;   -- join manual
create index if not exists idx_tickets_estadia on public.tickets (estadia_id) where estadia_id is not null;

-- O check de origem nasceu inline e sem nome (db/01). Achamos pelo conteúdo,
-- como db/26 faz, em vez de supor o nome gerado pelo Postgres.
do $$
declare c record;
begin
  for c in
    select con.conname
      from pg_constraint con
     where con.conrelid = 'public.tickets'::regclass
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%origem%'
  loop
    execute format('alter table public.tickets drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.tickets add constraint tickets_origem_check
  check (origem in ('avulso', 'plano', 'estadia'));

alter table public.caixa_movimentos add column if not exists estadia_pagamento_id text;  -- join manual

-- ----------------------------------------------------------------------------
-- 5) RLS — padrão do projeto, sem delete
-- ----------------------------------------------------------------------------
alter table public.estadias enable row level security;
alter table public.estadias force row level security;
alter table public.estadia_pagamentos enable row level security;
alter table public.estadia_pagamentos force row level security;

drop policy if exists estadias_select on public.estadias;
create policy estadias_select on public.estadias
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

drop policy if exists estadias_insert on public.estadias;
create policy estadias_insert on public.estadias
  for insert to authenticated
  with check (tenant_id = (select public.current_tenant_id()));

drop policy if exists estadias_update on public.estadias;
create policy estadias_update on public.estadias
  for update to authenticated
  using (tenant_id = (select public.current_tenant_id()))
  with check (tenant_id = (select public.current_tenant_id()));

drop policy if exists estadia_pag_select on public.estadia_pagamentos;
create policy estadia_pag_select on public.estadia_pagamentos
  for select to authenticated
  using (tenant_id = (select public.current_tenant_id()));

drop policy if exists estadia_pag_insert on public.estadia_pagamentos;
create policy estadia_pag_insert on public.estadia_pagamentos
  for insert to authenticated
  with check (tenant_id = (select public.current_tenant_id()));

-- ----------------------------------------------------------------------------
-- 6) Registro de pagamento — a ÚNICA porta que estende uma estadia
-- ----------------------------------------------------------------------------
-- Retorno: 'ok' | 'duplicado' (reenvio do app) | 'estadia_ausente' (o pagamento
-- chegou antes da estadia — a API responde erro transitório e o app tenta de
-- novo). SECURITY INVOKER: roda sob o RLS do tenant que chamou.
create or replace function public.fn_estadia_registrar_pagamento(
  p_id                 text,
  p_tenant_id          uuid,
  p_patio_id           uuid,
  p_estadia_id         text,
  p_tipo               text,
  p_diarias            integer,
  p_valor              numeric,
  p_forma_pagamento    text,
  p_base               timestamptz,
  p_operador_id        uuid,
  p_caixa_sessao_id    text,
  p_caixa_movimento_id text,
  p_pago_em            timestamptz
) returns text
language plpgsql
as $$
declare
  e record;
  novo timestamptz;
begin
  perform 1 from public.estadia_pagamentos where id = p_id;
  if found then
    return 'duplicado';
  end if;

  select id, valida_ate, diaria_horas
    into e
    from public.estadias
   where id = p_estadia_id and patio_id = p_patio_id
   for update;
  if not found then
    return 'estadia_ausente';
  end if;

  if p_tipo = 'renovacao' then
    novo := greatest(e.valida_ate, coalesce(p_base, e.valida_ate))
            + make_interval(hours => p_diarias * e.diaria_horas);
    update public.estadias
       set valida_ate  = novo,
           diarias     = diarias + p_diarias,
           valor_total = valor_total + p_valor
     where id = e.id;
  else
    novo := e.valida_ate;   -- contratação: a estadia já nasceu com o vencimento
  end if;

  insert into public.estadia_pagamentos (
    id, tenant_id, patio_id, estadia_id, tipo, diarias, valor, forma_pagamento,
    base, valida_ate_antes, valida_ate_depois, operador_id,
    caixa_sessao_id, caixa_movimento_id, pago_em, sincronizado_em
  ) values (
    p_id, p_tenant_id, p_patio_id, p_estadia_id, p_tipo, p_diarias, p_valor, p_forma_pagamento,
    p_base, e.valida_ate, novo, p_operador_id,
    p_caixa_sessao_id, p_caixa_movimento_id, p_pago_em, now()
  );
  return 'ok';
end $$;

-- Só o tenant autenticado (a API assina como `authenticated`). Função nova
-- nasce executável por PUBLIC no Postgres: tira de PUBLIC e de anon.
revoke execute on function public.fn_estadia_registrar_pagamento(
  text, uuid, uuid, text, text, integer, numeric, text, timestamptz, uuid, text, text, timestamptz
) from public, anon;
grant execute on function public.fn_estadia_registrar_pagamento(
  text, uuid, uuid, text, text, integer, numeric, text, timestamptz, uuid, text, text, timestamptz
) to authenticated;
