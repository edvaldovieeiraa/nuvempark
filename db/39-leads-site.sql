-- ============================================================================
-- NuvemPark — 39: Captura de leads do site (formulário de contato)
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor. Idempotente.
--
-- O site deixou de publicar contato@nuvempark.com e passou a ter formulário.
-- O lead cai aqui e aparece em /master/leads.
--
-- ⚠️ O MODELO DE AMEAÇA DESTA TABELA
--
-- A gravação usa a chave ANON, que é pública por definição (vai no bundle do
-- browser). Logo: qualquer pessoa consegue falar com o PostgREST direto, sem
-- passar pela nossa rota, pelo honeypot ou pelo rate-limit. Tudo o que a rota
-- em `/api/contato` faz é conveniência e freio para bot burro — **a defesa real
-- é o CHECK da policy abaixo**, porque é a única coisa que roda sempre.
--
-- Daí o CHECK ser tão específico: ele fixa `status='novo'`, exige `observacao`
-- e `atendido_em` nulos e limita o tamanho de cada campo. Sem isso, um curioso
-- com a anon key poderia marcar leads como "ganho", escrever na observação
-- interna do comercial ou despejar megabytes de texto na tabela.
--
-- E não há policy de SELECT: a lista é invisível para anon/authenticated. Só o
-- service_role (console master) lê — mesmo desenho de `blog_inscritos` (db/28).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) Tabela
-- ----------------------------------------------------------------------------
create table if not exists public.leads_site (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  telefone     text not null,                    -- só dígitos, com DDD (10 ou 11)
  email        text not null,
  assunto      text not null,                    -- o que a pessoa escreveu
  -- De onde veio: caminho da página que exibiu o formulário. Serve para saber
  -- qual conteúdo converte (home × /sistema-para-estacionamento × cidade).
  origem       text not null default '/',
  ip           text,
  user_agent   text,
  -- Trilha comercial. NÃO é preenchida pelo site: o CHECK obriga 'novo'.
  status       text not null default 'novo'
               check (status in ('novo','em_contato','ganho','perdido')),
  observacao   text,
  atendido_em  timestamptz,
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

drop trigger if exists trg_leads_site_updated on public.leads_site;
create trigger trg_leads_site_updated before update on public.leads_site
  for each row execute function public.fn_set_updated_at();

comment on table public.leads_site is
  'Leads do formulário de contato do site público. Escrita: anon (só INSERT, via policy). Leitura: service_role (console master).';
comment on column public.leads_site.origem is
  'Caminho da página que exibiu o formulário — para medir qual conteúdo converte.';

-- ----------------------------------------------------------------------------
-- 2) Índice da listagem do master: WHERE status=… ORDER BY criado_em DESC.
-- ----------------------------------------------------------------------------
create index if not exists idx_leads_site_status_data
  on public.leads_site (status, criado_em desc);

-- ----------------------------------------------------------------------------
-- 3) RLS
-- ----------------------------------------------------------------------------
alter table public.leads_site enable row level security;
alter table public.leads_site force  row level security;

-- Só INSERT, e só o que um formulário de verdade produziria.
drop policy if exists leads_site_insert_publico on public.leads_site;
create policy leads_site_insert_publico on public.leads_site
  for insert to anon, authenticated
  with check (
        length(btrim(nome))    between 2 and 120
    and length(btrim(assunto)) between 5 and 2000
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and length(email) <= 254
    -- só dígitos, 10 (fixo) ou 11 (celular) — mesma regra de lib/telefone.ts
    and telefone ~ '^[0-9]{10,11}$'
    and length(origem) <= 200
    and length(coalesce(user_agent, '')) <= 500
    and length(coalesce(ip, '')) <= 60
    -- campos internos ficam fora do alcance de quem escreve pelo site
    and status = 'novo'
    and observacao is null
    and atendido_em is null
  );

-- Sem policy de SELECT/UPDATE/DELETE: fail-closed. Só service_role enxerga.

-- ============================================================================
-- VALIDAÇÃO
--   -- deve INSERIR:
--   -- (rode como anon no SQL Editor só se quiser testar a policy)
--   select count(*) from public.leads_site;             -- service_role: ok
--   select * from pg_policies where tablename = 'leads_site';
-- ============================================================================
