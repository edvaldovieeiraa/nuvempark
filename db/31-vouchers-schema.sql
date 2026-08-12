-- ============================================================================
-- NuvemPark — 31: Vouchers (esquema)
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor. Idempotente.
--
-- O lojista vizinho libera o ticket do cliente dele; o pátio define as regras,
-- quem pode usá-las e quanto cada parceiro pode gastar.
--
-- A generalidade mora em TRÊS NÚMEROS, e não numa linguagem de regras:
--
--   isenção de 2h .......... abater_minutos = 120
--   isenção de 12h ......... abater_minutos = 720
--   isenção de 24h ......... abater_minutos = 1440
--   isenção total .......... desconto_percentual = 100
--   metade do valor ........ desconto_percentual = 50
--   R$ 5 de abatimento ..... desconto_valor = 5,00
--
-- O cálculo é `entrada + abater_minutos` -> motor de tarifa existente ->
-- aplica percentual -> aplica valor fixo. O TarifaEngine do app NÃO muda.
--
-- `usuarios_parceiro` entra aqui, e não numa migração posterior, porque
-- `liberacoes` a referencia: separar obrigaria a uma FK adiantada ou a um
-- `alter table` existindo só para consertar a ordem dos arquivos.
-- ============================================================================

-- ── Catálogo de regras do pátio ─────────────────────────────────────────────
create table if not exists public.voucher_regras (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants(id) on delete cascade,
  patio_id             uuid not null references public.patios(id) on delete cascade,
  nome                 text not null,
  abater_minutos       integer not null default 0,
  desconto_percentual  integer not null default 0,
  desconto_valor       numeric(10,2) not null default 0,
  ativo                boolean not null default true,
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),
  constraint voucher_regras_abater_nao_negativo
    check (abater_minutos >= 0),
  constraint voucher_regras_percentual_valido
    check (desconto_percentual between 0 and 100),
  constraint voucher_regras_valor_nao_negativo
    check (desconto_valor >= 0),
  -- Regra com os três campos zerados não desconta nada: seria um voucher que
  -- consome a cota do parceiro, frustra o cliente e não faz nada. Barrar aqui
  -- é mais barato que descobrir em produção.
  constraint voucher_regras_faz_algo
    check (abater_minutos > 0 or desconto_percentual > 0 or desconto_valor > 0)
);
create index if not exists idx_voucher_regras_patio
  on public.voucher_regras(patio_id, ativo);
create index if not exists idx_voucher_regras_tenant
  on public.voucher_regras(tenant_id);

drop trigger if exists trg_voucher_regras_updated on public.voucher_regras;
create trigger trg_voucher_regras_updated before update on public.voucher_regras
  for each row execute function public.fn_set_updated_at();

-- ── Parceiros ───────────────────────────────────────────────────────────────
create table if not exists public.parceiros (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants(id) on delete cascade,
  patio_id           uuid not null references public.patios(id) on delete cascade,
  nome               text not null,
  documento          text,
  -- 'cortesia': o pátio banca a isenção como acordo comercial.
  -- 'faturado': o valor abatido é somado e cobrado do parceiro na competência.
  -- O REGISTRO é idêntico nos dois; só o painel diverge, e só no fechamento.
  modo_custo         text not null default 'cortesia'
                     check (modo_custo in ('cortesia','faturado')),
  -- Cota em QUANTIDADE de liberações, não em dinheiro: o valor só é conhecido
  -- na saída, e a liberação acontece antes dela. Um teto em reais seria sempre
  -- aproximado; um teto em unidades é exato no instante em que importa.
  limite_quantidade  integer,
  limite_periodo     text check (limite_periodo in ('mes','total')),
  ativo              boolean not null default true,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  constraint parceiros_limite_positivo
    check (limite_quantidade is null or limite_quantidade > 0),
  -- Ou os dois campos existem, ou nenhum. Quantidade sem período não tem
  -- como ser contada; período sem quantidade não limita nada.
  constraint parceiros_limite_coerente
    check ((limite_quantidade is null) = (limite_periodo is null))
);
create index if not exists idx_parceiros_patio on public.parceiros(patio_id, ativo);
create index if not exists idx_parceiros_tenant on public.parceiros(tenant_id);

drop trigger if exists trg_parceiros_updated on public.parceiros;
create trigger trg_parceiros_updated before update on public.parceiros
  for each row execute function public.fn_set_updated_at();

-- ── Quais regras cada parceiro pode usar ────────────────────────────────────
-- Parceiro sem nenhuma linha aqui não libera nada. É o default seguro: criar
-- o parceiro não concede poder nenhum até alguém dizer qual.
create table if not exists public.parceiro_regras (
  parceiro_id  uuid not null references public.parceiros(id) on delete cascade,
  regra_id     uuid not null references public.voucher_regras(id) on delete cascade,
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  criado_em    timestamptz not null default now(),
  primary key (parceiro_id, regra_id)
);
create index if not exists idx_parceiro_regras_tenant
  on public.parceiro_regras(tenant_id);
-- `parceiro_id` já é a coluna inicial da PK. `regra_id` não é coberto por
-- nenhum índice, e o Postgres NÃO indexa chave estrangeira sozinho: sem isto,
-- apagar uma regra varre a tabela inteira para achar os vínculos.
create index if not exists idx_parceiro_regras_regra
  on public.parceiro_regras(regra_id);

-- ── Usuários do parceiro ────────────────────────────────────────────────────
-- Um parceiro pode ter vários (o balcão troca de gente). Toda liberação grava
-- QUEM fez, e é isso que torna o acesso auditável quando algo é contestado.
create table if not exists public.usuarios_parceiro (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  parceiro_id   uuid not null references public.parceiros(id) on delete cascade,
  auth_user_id  uuid not null unique references auth.users(id) on delete cascade,
  email         text not null,
  nome          text not null,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists idx_usuarios_parceiro_email
  on public.usuarios_parceiro(lower(email));
create index if not exists idx_usuarios_parceiro_parceiro
  on public.usuarios_parceiro(parceiro_id, ativo);
create index if not exists idx_usuarios_parceiro_tenant
  on public.usuarios_parceiro(tenant_id);

drop trigger if exists trg_usuarios_parceiro_updated on public.usuarios_parceiro;
create trigger trg_usuarios_parceiro_updated before update on public.usuarios_parceiro
  for each row execute function public.fn_set_updated_at();

-- ── Liberações ──────────────────────────────────────────────────────────────
-- `ticket_id` é TEXT, e não uuid: o id do ticket é gerado no cliente (ver
-- db/01-schema.sql), porque o app registra entradas offline e só depois
-- sincroniza. Errar esse tipo aqui quebraria a FK inteira.
create table if not exists public.liberacoes (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants(id) on delete cascade,
  patio_id             uuid not null references public.patios(id) on delete cascade,
  ticket_id            text not null references public.tickets(id) on delete cascade,
  parceiro_id          uuid not null references public.parceiros(id),
  regra_id             uuid not null references public.voucher_regras(id),
  usuario_parceiro_id  uuid references public.usuarios_parceiro(id),
  liberado_em          timestamptz not null default now(),
  cancelada_em         timestamptz,
  cancelada_motivo     text,
  -- Nulo até a saída. O desconto só tem valor quando existe hora de saída, e
  -- quem fecha o ticket é o app — este número sobe pelo outbox, junto do
  -- fechamento, e não é gravado no instante da liberação.
  valor_abatido        numeric(10,2),
  -- 'YYYY-MM', carimbado no fechamento da competência.
  competencia          text
);

-- Um ticket tem no máximo UMA liberação ativa. Índice único parcial, e não
-- checagem na aplicação: duas abas abertas no balcão do lojista disputariam a
-- mesma linha, e o banco é o único lugar onde essa corrida termina certo.
create unique index if not exists idx_liberacoes_ticket_ativa
  on public.liberacoes(ticket_id) where cancelada_em is null;

create index if not exists idx_liberacoes_parceiro
  on public.liberacoes(parceiro_id, liberado_em desc);
create index if not exists idx_liberacoes_competencia
  on public.liberacoes(parceiro_id, competencia);

-- Índices de CHAVE ESTRANGEIRA. O Postgres não cria nenhum sozinho, e cada FK
-- sem índice transforma o `on delete cascade` do pai numa varredura completa
-- desta tabela — que é a que mais cresce do módulo.
--
-- `ticket_id` precisa de índice CHEIO mesmo já existindo o único parcial acima:
-- o parcial só enxerga liberações ativas, então uma liberação cancelada ficaria
-- de fora e o cascade de `tickets` não a encontraria pelo índice.
create index if not exists idx_liberacoes_ticket
  on public.liberacoes(ticket_id);
create index if not exists idx_liberacoes_patio
  on public.liberacoes(patio_id);
create index if not exists idx_liberacoes_regra
  on public.liberacoes(regra_id);
create index if not exists idx_liberacoes_usuario
  on public.liberacoes(usuario_parceiro_id);
create index if not exists idx_liberacoes_tenant
  on public.liberacoes(tenant_id);
-- Sustenta a tela de divergências: liberação ativa cujo ticket já fechou sem
-- o desconto ter sido aplicado.
create index if not exists idx_liberacoes_sem_valor
  on public.liberacoes(patio_id) where cancelada_em is null and valor_abatido is null;

-- ── Fechamento por competência ──────────────────────────────────────────────
create table if not exists public.parceiro_competencias (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  parceiro_id       uuid not null references public.parceiros(id) on delete cascade,
  competencia       text not null,
  fechada_em        timestamptz not null default now(),
  total_liberacoes  integer not null default 0,
  total_abatido     numeric(10,2) not null default 0,
  constraint parceiro_competencias_formato
    check (competencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);
-- Fechar duas vezes a mesma competência do mesmo parceiro é erro de operação,
-- e daria cobrança em duplicidade. O banco recusa.
create unique index if not exists idx_parceiro_competencias_unica
  on public.parceiro_competencias(parceiro_id, competencia);
create index if not exists idx_parceiro_competencias_tenant
  on public.parceiro_competencias(tenant_id);

-- ============================================================================
-- VALIDAÇÃO (rodar como service_role; deve retornar 6 linhas)
--
-- select table_name from information_schema.tables
--  where table_schema = 'public'
--    and table_name in ('voucher_regras','parceiros','parceiro_regras',
--                       'usuarios_parceiro','liberacoes','parceiro_competencias')
--  order by table_name;
--
-- A regra neutra tem de ser recusada:
-- insert into public.voucher_regras (tenant_id, patio_id, nome)
--   values ('00000000-0000-0000-0000-000000000000',
--           '00000000-0000-0000-0000-000000000000', 'nao faz nada');
--   -- espera-se: violates check constraint "voucher_regras_faz_algo"
--
-- Limite incoerente tem de ser recusado:
-- insert into public.parceiros (tenant_id, patio_id, nome, limite_quantidade)
--   values ('00000000-0000-0000-0000-000000000000',
--           '00000000-0000-0000-0000-000000000000', 'Loja X', 10);
--   -- espera-se: violates check constraint "parceiros_limite_coerente"
--
-- Nenhuma chave estrangeira do módulo pode ficar sem índice (0 linhas):
-- select conrelid::regclass as tabela, a.attname as coluna
--   from pg_constraint c
--   join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
--  where c.contype = 'f'
--    and conrelid::regclass::text in ('voucher_regras','parceiros','parceiro_regras',
--                                     'usuarios_parceiro','liberacoes','parceiro_competencias')
--    and not exists (
--      select 1 from pg_index i
--       where i.indrelid = c.conrelid
--         and a.attnum = i.indkey[0]        -- coluna INICIAL do índice
--         and i.indpred is null             -- índice parcial não serve p/ cascade
--    );
-- ============================================================================
