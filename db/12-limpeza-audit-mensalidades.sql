-- ============================================================================
-- NuvemPark — 12: Limpeza de pátio + Audit log + Mensalidades
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor DEPOIS do 11. Idempotente.
--
-- Blocos:
--   A) tickets: colunas de remoção (soft-delete auditável p/ Limpeza de Pátio)
--   B) audit_log: histórico de alterações do painel (imutável, RLS por tenant)
--   C) planos.valor: preço do plano (pré-preenche o registro de pagamento)
--   D) mensalidade_pagamentos: pagamentos de mensalista/credenciado
--      (id client-gen p/ sync do app — padrão caixa_movimento, create-only;
--       SEM unique de competência — decisão B2: duplicidade visível+cancelável)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) TICKETS — remoção auditável
--    removido_por pode ser gestor (auth user) OU operador — guardamos uuid +
--    nome desnormalizado p/ exibição na página de removidos sem join.
-- ----------------------------------------------------------------------------
alter table public.tickets
  add column if not exists removido_em       timestamptz;
alter table public.tickets
  add column if not exists removido_por      uuid;
alter table public.tickets
  add column if not exists removido_por_nome text;
alter table public.tickets
  add column if not exists remocao_motivo    text;

-- Página de removidos + bootstrap (janela de 30 dias) leem por aqui:
create index if not exists idx_tickets_removidos
  on public.tickets (patio_id, removido_em desc)
  where status = 'removido';

-- ----------------------------------------------------------------------------
-- B) AUDIT LOG — imutável. Registra QUALQUER alteração feita no painel.
--    Captura na aplicação (helper registrarAuditoria) — decisão 4.2 = A.
-- ----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  patio_id       uuid references public.patios(id) on delete set null,
  usuario_id     uuid,                              -- auth.users.id do gestor
  usuario_email  text,
  usuario_nome   text,
  modulo         text not null,                     -- 'tarifas','operadores','operacao','mensalistas','config','tipos-veiculo'...
  acao           text not null,                     -- 'criou','alterou','removeu','limpeza_patio','cancelou_pagamento'...
  descricao      text not null,                     -- legível: "Alterou tarifa Padrão: fração inicial R$5→R$6"
  dados          jsonb not null default '{}'::jsonb, -- antes/depois opcional p/ perícia
  criado_em      timestamptz not null default now()
);
create index if not exists idx_audit_tenant_data on public.audit_log (tenant_id, criado_em desc);
create index if not exists idx_audit_modulo      on public.audit_log (tenant_id, modulo);

alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;

drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log
  for insert to authenticated
  with check (tenant_id = public.current_tenant_id());

-- SEM policy de UPDATE/DELETE => log imutável para authenticated.
-- (service_role bypassa, mas service_role não roda no caminho do gestor.)

-- ----------------------------------------------------------------------------
-- C) PLANOS — preço do plano (pré-preenche o valor do pagamento)
-- ----------------------------------------------------------------------------
alter table public.planos
  add column if not exists valor numeric(10,2) not null default 0;

-- ----------------------------------------------------------------------------
-- D) MENSALIDADE_PAGAMENTOS
--    id TEXT client-generated: o app cria offline e sincroniza depois
--    (4ª entidade do sync, estratégia do caixa_movimento: create-only,
--     upsert ignoreDuplicates — re-envio é no-op).
--    cliente_id/plano_id/caixa_* SEM FK rígida (tolerar sync fora de ordem),
--    tenant_id/patio_id FK reais + RLS (padrão do schema).
--    Imutável exceto cancelamento (trigger abaixo). Sem unique de competência.
-- ----------------------------------------------------------------------------
create table if not exists public.mensalidade_pagamentos (
  id                   text primary key,            -- client-gen (sync) ou uuid do painel
  patio_id             uuid not null references public.patios(id) on delete cascade,
  tenant_id            uuid not null references public.tenants(id) on delete cascade,
  cliente_id           uuid not null,               -- join manual -> clientes.id
  plano_id             uuid,                        -- join manual -> planos.id (congela o plano da época)
  competencia          date not null,               -- 1º dia do mês de referência
  valor                numeric(10,2) not null,
  forma_pagamento      text,
  pago_em              timestamptz not null default now(),
  origem               text not null default 'painel'
                       check (origem in ('app','painel')),
  registrado_por       uuid,                        -- operador.id (app) ou auth user (painel)
  registrado_por_nome  text,
  -- amarração com o caixa quando o operador recebe no app (decisão A = sim):
  caixa_sessao_id      text,                        -- join manual -> caixa_sessoes.id
  caixa_movimento_id   text,                        -- join manual -> caixa_movimentos.id
  observacao           text,
  -- cancelamento (soft — decisão B2):
  cancelado_em         timestamptz,
  cancelado_por        uuid,
  cancelado_por_nome   text,
  cancelamento_motivo  text,
  criado_em            timestamptz not null default now(),
  sincronizado_em      timestamptz
);
create index if not exists idx_mens_pag_cliente     on public.mensalidade_pagamentos (cliente_id, competencia desc);
create index if not exists idx_mens_pag_patio_comp  on public.mensalidade_pagamentos (patio_id, competencia desc);
create index if not exists idx_mens_pag_tenant      on public.mensalidade_pagamentos (tenant_id);
create index if not exists idx_mens_pag_pago_em     on public.mensalidade_pagamentos (patio_id, pago_em desc);

-- Imutabilidade: UPDATE só pode tocar os campos de cancelamento e
-- sincronizado_em. Qualquer outro campo alterado => exceção.
create or replace function public.fn_mensalidade_pag_imutavel()
returns trigger language plpgsql as $$
begin
  if new.id                  is distinct from old.id
     or new.patio_id         is distinct from old.patio_id
     or new.tenant_id        is distinct from old.tenant_id
     or new.cliente_id       is distinct from old.cliente_id
     or new.plano_id         is distinct from old.plano_id
     or new.competencia      is distinct from old.competencia
     or new.valor            is distinct from old.valor
     or new.forma_pagamento  is distinct from old.forma_pagamento
     or new.pago_em          is distinct from old.pago_em
     or new.origem           is distinct from old.origem
     or new.registrado_por   is distinct from old.registrado_por
     or new.registrado_por_nome is distinct from old.registrado_por_nome
     or new.caixa_sessao_id  is distinct from old.caixa_sessao_id
     or new.caixa_movimento_id is distinct from old.caixa_movimento_id
     or new.observacao       is distinct from old.observacao
     or new.criado_em        is distinct from old.criado_em
  then
    raise exception 'mensalidade_pagamentos é imutável — só cancelamento é permitido';
  end if;
  return new;
end $$;

drop trigger if exists trg_mens_pag_imutavel on public.mensalidade_pagamentos;
create trigger trg_mens_pag_imutavel
  before update on public.mensalidade_pagamentos
  for each row execute function public.fn_mensalidade_pag_imutavel();

-- RLS padrão do projeto (select/insert/update por tenant; SEM delete)
alter table public.mensalidade_pagamentos enable row level security;
alter table public.mensalidade_pagamentos force row level security;

drop policy if exists mens_pag_select on public.mensalidade_pagamentos;
create policy mens_pag_select on public.mensalidade_pagamentos
  for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists mens_pag_insert on public.mensalidade_pagamentos;
create policy mens_pag_insert on public.mensalidade_pagamentos
  for insert to authenticated
  with check (tenant_id = public.current_tenant_id());

drop policy if exists mens_pag_update on public.mensalidade_pagamentos;
create policy mens_pag_update on public.mensalidade_pagamentos
  for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
-- (o trigger acima garante que esse UPDATE só serve para cancelar)

-- ============================================================================
-- VALIDAÇÃO RÁPIDA (rode após aplicar — tudo deve retornar sem erro):
--
-- select removido_em, removido_por_nome, remocao_motivo from public.tickets limit 1;
-- select * from public.audit_log limit 1;
-- select valor from public.planos limit 1;
-- select * from public.mensalidade_pagamentos limit 1;
--
-- Teste do trigger de imutabilidade (deve FALHAR com a exceção):
-- insert into public.mensalidade_pagamentos (id, patio_id, tenant_id, cliente_id, competencia, valor)
--   select 'teste-imutavel', p.id, p.tenant_id, gen_random_uuid(), date_trunc('month', now())::date, 100
--   from public.patios p limit 1;
-- update public.mensalidade_pagamentos set valor = 200 where id = 'teste-imutavel';  -- ❌ deve dar erro
-- update public.mensalidade_pagamentos
--   set cancelado_em = now(), cancelamento_motivo = 'teste' where id = 'teste-imutavel';  -- ✅ deve passar
-- delete from public.mensalidade_pagamentos where id = 'teste-imutavel'; -- (limpeza; roda como owner)
-- ============================================================================
