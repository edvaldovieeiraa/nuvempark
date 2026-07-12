-- ============================================================================
-- NuvemPark — Fase Financeiro (console master): FATURAS
-- Projeto: xrwrsswhoywzzhutzrjx
-- Cole no SQL Editor do Supabase e execute. Idempotente.
--
-- Modelo: cada assinatura (1 por tenant) gera 1 fatura por mês de competência.
-- Valor = valor_por_patio × pátios ativos do tenant no momento da geração.
-- Pagamento pode ser manual (marca pago) OU via gateway (Asaas) — as colunas
-- gateway_* ficam prontas; o webhook baixa a fatura quando o PSP confirma.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Estende assinaturas: dia de vencimento + dados do cliente para cobrança
-- ----------------------------------------------------------------------------
alter table public.assinaturas
  add column if not exists dia_vencimento int not null default 10
    check (dia_vencimento between 1 and 28);
alter table public.assinaturas
  add column if not exists email_cobranca text;
alter table public.assinaturas
  add column if not exists cpf_cnpj text;
-- id do cliente no gateway (Asaas), criado sob demanda
alter table public.assinaturas
  add column if not exists gateway_cliente_id text;

-- ----------------------------------------------------------------------------
-- FATURAS: uma linha por (tenant, competência mensal)
-- ----------------------------------------------------------------------------
create table if not exists public.faturas (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  -- competência = 1º dia do mês de referência (ex.: 2026-07-01)
  competencia       date not null,
  vencimento        date not null,
  -- congela o cenário de precificação usado
  valor             numeric(10,2) not null default 0,
  valor_por_patio   numeric(10,2) not null default 0,
  qtd_patios        int not null default 0,
  estado            text not null default 'aberta'
                    check (estado in ('aberta','paga','vencida','cancelada')),
  pago_em           timestamptz,
  forma_pagamento   text, -- 'manual','pix','boleto','cartao'
  -- Gateway (Asaas) — preenchido quando a cobrança é emitida no PSP
  gateway_cobranca_id text,
  gateway_link        text,   -- URL da fatura/checkout
  gateway_pix_copia   text,   -- pix copia-e-cola
  gateway_boleto_url  text,
  -- Cobrança por e-mail
  email_enviado_em    timestamptz,
  email_enviado_para  text,
  observacao          text,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  unique (tenant_id, competencia)
);

drop trigger if exists trg_faturas_updated on public.faturas;
create trigger trg_faturas_updated before update on public.faturas
  for each row execute function public.fn_set_updated_at();

create index if not exists idx_faturas_tenant on public.faturas (tenant_id);
create index if not exists idx_faturas_estado on public.faturas (estado);
create index if not exists idx_faturas_vencimento on public.faturas (vencimento);
create index if not exists idx_faturas_competencia on public.faturas (competencia);

-- ----------------------------------------------------------------------------
-- RLS: faturas são dados da PLATAFORMA. O gestor (sessão anon/authenticated)
-- NÃO deve ver. Só o console master (service_role) acessa. Portanto habilitamos
-- RLS sem policies de leitura para authenticated — service_role ignora RLS.
-- ----------------------------------------------------------------------------
alter table public.faturas enable row level security;
-- (sem policy para authenticated => bloqueado; service_role bypassa RLS)

-- ----------------------------------------------------------------------------
-- fn_marcar_faturas_vencidas: abre->vencida quando passou do vencimento
-- ----------------------------------------------------------------------------
create or replace function public.fn_marcar_faturas_vencidas()
returns int language plpgsql as $$
declare
  afetadas int;
begin
  update public.faturas
     set estado = 'vencida'
   where estado = 'aberta'
     and vencimento < current_date;
  get diagnostics afetadas = row_count;
  return afetadas;
end $$;

-- ----------------------------------------------------------------------------
-- fn_gerar_faturas_mes(competencia date): gera/garante 1 fatura por tenant ativo
-- com assinatura ativa, para a competência dada (default: mês corrente).
-- Idempotente: não duplica (ON CONFLICT DO NOTHING pelo unique).
-- Retorna a quantidade de faturas criadas nesta chamada.
-- ----------------------------------------------------------------------------
create or replace function public.fn_gerar_faturas_mes(p_competencia date default date_trunc('month', current_date)::date)
returns int language plpgsql as $$
declare
  criadas int := 0;
  r record;
  v_qtd int;
  v_venc date;
begin
  for r in
    select a.tenant_id, a.valor_por_patio, a.dia_vencimento
      from public.assinaturas a
      join public.tenants t on t.id = a.tenant_id
     where a.estado <> 'suspensa'
       and t.ativo = true
  loop
    -- pátios ativos do tenant agora
    select count(*) into v_qtd
      from public.patios p
     where p.tenant_id = r.tenant_id and p.ativo = true;

    -- vencimento = dia configurado dentro do mês da competência
    v_venc := (date_trunc('month', p_competencia)
               + (least(r.dia_vencimento, 28) - 1) * interval '1 day')::date;

    insert into public.faturas
      (tenant_id, competencia, vencimento, valor, valor_por_patio, qtd_patios)
    values
      (r.tenant_id,
       date_trunc('month', p_competencia)::date,
       v_venc,
       coalesce(r.valor_por_patio,0) * v_qtd,
       coalesce(r.valor_por_patio,0),
       v_qtd)
    on conflict (tenant_id, competencia) do nothing;

    if found then
      criadas := criadas + 1;
    end if;
  end loop;

  return criadas;
end $$;

-- ============================================================================
-- Pronto. Rode fn_gerar_faturas_mes() no início de cada mês (ou pelo botão do
-- painel). fn_marcar_faturas_vencidas() pode rodar por cron/diariamente.
-- ============================================================================
