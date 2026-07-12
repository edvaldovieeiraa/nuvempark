-- ============================================================================
-- ParkFlow — Fase 0: Schema multi-tenant + RLS
-- Projeto: xrwrsswhoywzzhutzrjx
-- Cole tudo no SQL Editor do Supabase e execute.
-- Idempotente: pode rodar mais de uma vez sem quebrar.
-- ============================================================================

-- Extensões (gen_random_uuid já vem no Postgres 17, mas garantimos)
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Helper: trigger de updated_at
-- ----------------------------------------------------------------------------
create or replace function public.fn_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

-- ----------------------------------------------------------------------------
-- Helper: gerar código de tenant de 4 dígitos único
-- ----------------------------------------------------------------------------
create or replace function public.fn_gerar_codigo_tenant()
returns text language plpgsql as $$
declare
  novo text;
  tentativas int := 0;
begin
  loop
    -- 4 dígitos, 1000..9999 (evita códigos começando com 0)
    novo := lpad((1000 + floor(random() * 9000))::int::text, 4, '0');
    exit when not exists (select 1 from public.tenants where codigo = novo);
    tentativas := tentativas + 1;
    if tentativas > 50 then
      raise exception 'Não foi possível gerar código de tenant único (esgotou tentativas)';
    end if;
  end loop;
  return novo;
end $$;

-- ============================================================================
-- HIERARQUIA RAIZ: tenants -> patios
-- ============================================================================

create table if not exists public.tenants (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  codigo         text not null unique,          -- 4 dígitos, gerado no super-admin
  branding       jsonb not null default '{}'::jsonb,  -- logo, cor, nome no ticket
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
drop trigger if exists trg_tenants_updated on public.tenants;
create trigger trg_tenants_updated before update on public.tenants
  for each row execute function public.fn_set_updated_at();

create table if not exists public.patios (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  nome           text not null,
  codigo         text,                          -- código interno do pátio (opcional)
  qtd_vagas      integer not null default 0,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index if not exists idx_patios_tenant on public.patios(tenant_id);
drop trigger if exists trg_patios_updated on public.patios;
create trigger trg_patios_updated before update on public.patios
  for each row execute function public.fn_set_updated_at();

-- ============================================================================
-- ASSINATURA (por tenant)
-- ============================================================================

create table if not exists public.assinaturas (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  valor_por_patio   numeric(10,2) not null default 0,
  estado            text not null default 'ativa'
                    check (estado in ('ativa','atrasada','suspensa')),
  vencimento        date,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  unique (tenant_id)
);
drop trigger if exists trg_assinaturas_updated on public.assinaturas;
create trigger trg_assinaturas_updated before update on public.assinaturas
  for each row execute function public.fn_set_updated_at();

-- ============================================================================
-- OPERADORES (app) + junção operador<->pátio + sessões
-- ============================================================================

create table if not exists public.operadores (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  nome           text not null,
  usuario        text not null,                 -- login (antigo "matrícula")
  senha_hash     text not null,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  unique (tenant_id, usuario)                    -- usuário único DENTRO do tenant
);
create index if not exists idx_operadores_tenant on public.operadores(tenant_id);
drop trigger if exists trg_operadores_updated on public.operadores;
create trigger trg_operadores_updated before update on public.operadores
  for each row execute function public.fn_set_updated_at();

-- Substitui o antigo operacao_ids UUID[] por junção real
create table if not exists public.operador_patios (
  operador_id    uuid not null references public.operadores(id) on delete cascade,
  patio_id       uuid not null references public.patios(id) on delete cascade,
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  primary key (operador_id, patio_id)
);
create index if not exists idx_operador_patios_patio on public.operador_patios(patio_id);
create index if not exists idx_operador_patios_tenant on public.operador_patios(tenant_id);

create table if not exists public.operador_sessoes (
  id                   uuid primary key default gen_random_uuid(),
  operador_id          uuid not null references public.operadores(id) on delete cascade,
  tenant_id            uuid not null references public.tenants(id) on delete cascade,
  refresh_token_hash   text not null unique,
  device_uuid          text not null,
  expires_at           timestamptz not null,
  criado_em            timestamptz not null default now()
);
create index if not exists idx_operador_sessoes_op on public.operador_sessoes(operador_id);
create index if not exists idx_operador_sessoes_exp on public.operador_sessoes(expires_at);

-- ============================================================================
-- CONFIG por pátio (inclui as 3 colunas que eram "fantasma" no E-Park)
-- ============================================================================

create table if not exists public.patio_config (
  id                    uuid primary key default gen_random_uuid(),
  patio_id              uuid not null references public.patios(id) on delete cascade,
  tenant_id             uuid not null references public.tenants(id) on delete cascade,
  patio_ativo           boolean not null default false,
  tipos_veiculo         jsonb not null default '["carro","moto","caminhonete","van"]'::jsonb,
  formas_pagamento      jsonb not null default '["dinheiro","cartao_debito","cartao_credito","pix"]'::jsonb,
  motivos_isencao       jsonb not null default '["funcionario","credenciado","cortesia"]'::jsonb,
  motivos_cancelamento  jsonb not null default '["erro_operador","veiculo_nao_saiu","teste"]'::jsonb,
  ticket_cabecalho      jsonb not null default '[]'::jsonb,   -- linhas do cabeçalho (max 4 x 48ch)
  ticket_rodape         jsonb not null default '[]'::jsonb,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),
  unique (patio_id)
);
create index if not exists idx_patio_config_tenant on public.patio_config(tenant_id);
drop trigger if exists trg_patio_config_updated on public.patio_config;
create trigger trg_patio_config_updated before update on public.patio_config
  for each row execute function public.fn_set_updated_at();

-- ============================================================================
-- TARIFAS (motor de tarifa lê estas colunas)
-- ============================================================================

create table if not exists public.tarifas (
  id                        uuid primary key default gen_random_uuid(),
  patio_id                  uuid not null references public.patios(id) on delete cascade,
  tenant_id                 uuid not null references public.tenants(id) on delete cascade,
  nome                      text not null default 'Padrão',
  tipo_veiculo              text not null default 'carro',
  ordem                     integer not null default 0,
  visivel_operador          boolean not null default true,
  fracao_inicial_minutos    integer not null default 15,
  fracao_inicial_valor      numeric(10,2) not null default 5.00,
  fracao_adicional_minutos  integer not null default 15,
  fracao_adicional_valor    numeric(10,2) not null default 3.00,
  teto_diaria               numeric(10,2) not null default 60.00,
  tolerancia_minutos        integer not null default 10,
  pernoite_valor            numeric(10,2) not null default 0.00,
  pernoite_hora_inicio      integer not null default 22,
  pernoite_hora_fim         integer not null default 8,
  vigencia_inicio           timestamptz not null default now(),
  vigencia_fim              timestamptz,
  ativo                     boolean not null default true,
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz not null default now()
);
create index if not exists idx_tarifas_patio_ativo on public.tarifas(patio_id, ativo);
create index if not exists idx_tarifas_patio_ativo_ordem on public.tarifas(patio_id, ativo, ordem);
create index if not exists idx_tarifas_tenant on public.tarifas(tenant_id);
drop trigger if exists trg_tarifas_updated on public.tarifas;
create trigger trg_tarifas_updated before update on public.tarifas
  for each row execute function public.fn_set_updated_at();

-- ============================================================================
-- PLANOS / CLIENTES / VEÍCULOS (mensalistas / livre-passagem)
-- ============================================================================

create table if not exists public.planos (
  id                uuid primary key default gen_random_uuid(),
  patio_id          uuid not null references public.patios(id) on delete cascade,
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  nome              text not null,
  tipo              text not null default 'mensalista'
                    check (tipo in ('mensalista','credenciado')),
  visivel_operador  boolean not null default true,
  ordem             integer not null default 0,
  ativo             boolean not null default true,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create index if not exists idx_planos_patio_ativo on public.planos(patio_id, ativo);
create index if not exists idx_planos_tenant on public.planos(tenant_id);
drop trigger if exists trg_planos_updated on public.planos;
create trigger trg_planos_updated before update on public.planos
  for each row execute function public.fn_set_updated_at();

create table if not exists public.clientes (
  id             uuid primary key default gen_random_uuid(),
  patio_id       uuid not null references public.patios(id) on delete cascade,
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  plano_id       uuid references public.planos(id) on delete set null,
  nome           text not null,
  documento      text,
  rg             text,
  cnh            text,
  email          text,
  telefone       text,
  vagas          integer not null default 1,
  vencimento     date,
  bloqueado      boolean not null default false,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index if not exists idx_clientes_patio_ativo on public.clientes(patio_id, ativo);
create index if not exists idx_clientes_plano on public.clientes(plano_id);
create index if not exists idx_clientes_tenant on public.clientes(tenant_id);
drop trigger if exists trg_clientes_updated on public.clientes;
create trigger trg_clientes_updated before update on public.clientes
  for each row execute function public.fn_set_updated_at();

create table if not exists public.cliente_veiculos (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes(id) on delete cascade,
  patio_id       uuid not null references public.patios(id) on delete cascade,
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  placa          text not null,
  descricao      text,
  codigo_cartao  text,
  criado_em      timestamptz not null default now(),
  unique (patio_id, placa)
);
create index if not exists idx_cliente_veiculos_cliente on public.cliente_veiculos(cliente_id);
create index if not exists idx_cliente_veiculos_tenant on public.cliente_veiculos(tenant_id);

-- ============================================================================
-- TABELAS "FANTASMA" formalizadas (escritas pelo sync — sem FK rígida entre si
-- para tolerar sync fora de ordem; mas tenant_id/patio_id SÃO FK reais)
-- ============================================================================

-- id é gerado no cliente (upsert key). Por isso TEXT, não uuid default.
create table if not exists public.tickets (
  id                  text primary key,          -- client-generated (upsert key)
  patio_id            uuid not null references public.patios(id) on delete cascade,
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  placa               text not null default '—',
  tipo_veiculo        text not null default 'carro',
  entrada             timestamptz not null,      -- NOT NULL (regra do E-Park)
  saida               timestamptz,
  valor_calculado     numeric(10,2),
  valor_cobrado       numeric(10,2),
  forma_pagamento     text,
  motivo_isencao      text,
  status              text not null default 'aberto'
                      check (status in ('aberto','fechado','removido','cancelado')),
  operador_id         uuid,                      -- join manual (sem FK rígida)
  caixa_sessao_id     text,                      -- join manual
  tabela_preco_id     uuid,                      -- join manual -> tarifas
  cliente_id          uuid,
  plano_id            uuid,
  origem              text not null default 'avulso'
                      check (origem in ('avulso','plano')),
  foto_entrada_path   text,                      -- <patio_id>/<ticket_id>.jpg no bucket privado
  -- Campos de pagamento (Stone hoje; Pix depois usa o mesmo formato agnóstico)
  atk                 text,
  itk                 text,
  authorization_code  text,
  brand               text,
  card_pan            text,
  installments        integer,
  payment_processor   text,
  atualizado_em       timestamptz not null default now(),
  sincronizado_em     timestamptz
);
create index if not exists idx_tickets_patio_status on public.tickets(patio_id, status);
create index if not exists idx_tickets_patio_placa on public.tickets(patio_id, placa, status);
create index if not exists idx_tickets_tenant on public.tickets(tenant_id);
create index if not exists idx_tickets_cliente on public.tickets(cliente_id);

create table if not exists public.caixa_sessoes (
  id                     text primary key,       -- client-generated
  patio_id               uuid not null references public.patios(id) on delete cascade,
  tenant_id              uuid not null references public.tenants(id) on delete cascade,
  operador_id            uuid,
  operador_nome          text,
  fundo_caixa            numeric(10,2) not null default 0,
  total_fechamento       numeric(10,2),
  status                 text not null default 'aberta'
                         check (status in ('aberta','fechada')),
  abertura               timestamptz not null default now(),
  fechamento             timestamptz,
  observacao_fechamento  text,
  atualizado_em          timestamptz not null default now(),
  sincronizado_em        timestamptz
);
create index if not exists idx_caixa_sessoes_patio on public.caixa_sessoes(patio_id, status);
create index if not exists idx_caixa_sessoes_tenant on public.caixa_sessoes(tenant_id);

-- Movimentos são IMUTÁVEIS (create-only). Sem trigger de update.
create table if not exists public.caixa_movimentos (
  id                text primary key,            -- client-generated
  caixa_sessao_id   text not null,               -- join manual -> caixa_sessoes.id
  patio_id          uuid not null references public.patios(id) on delete cascade,
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  tipo              text not null default 'entrada'
                    check (tipo in ('entrada','sangria','isencao')),
  valor             numeric(10,2) not null default 0,
  descricao         text,
  ticket_id         text,                        -- join manual -> tickets.id
  forma_pagamento   text,
  criado_em         timestamptz not null default now(),
  sincronizado_em   timestamptz
);
create index if not exists idx_caixa_mov_sessao on public.caixa_movimentos(caixa_sessao_id);
create index if not exists idx_caixa_mov_patio on public.caixa_movimentos(patio_id);
create index if not exists idx_caixa_mov_tenant on public.caixa_movimentos(tenant_id);

create table if not exists public.dispositivos (
  id             uuid primary key default gen_random_uuid(),
  patio_id       uuid not null references public.patios(id) on delete cascade,
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  device_uuid    text not null unique,           -- UNIQUE (regra do E-Park)
  nome           text,
  status         text not null default 'ativo'
                 check (status in ('ativo','revogado')),
  ultimo_acesso  timestamptz,
  criado_em      timestamptz not null default now()
);
create index if not exists idx_dispositivos_patio on public.dispositivos(patio_id);
create index if not exists idx_dispositivos_tenant on public.dispositivos(tenant_id);

-- ============================================================================
-- Fim do schema. RLS vem em arquivo/etapa separada (parkflow-fase0-rls.sql).
-- ============================================================================
