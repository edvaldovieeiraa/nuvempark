-- ============================================================================
-- NuvemPark — 47: CRM no painel master (parte 1: schema, dedupe, estágio, RPCs)
-- Projeto: xrwrsswhoywzzhutzrjx · Rodar no SQL Editor. Idempotente.
-- Spec: .planning/specs/crm-painel-master.md · Prova: db/49-crm-teste-schema.sql
--
-- O QUE ESTA MIGRAÇÃO FAZ
--   1) `leads_site` ganha as colunas do CRM (fonte, rede ligada, próxima ação,
--      UTM, motivo de perda, data do estágio) e o estágio `trial`.
--   2) `lead_interacoes`: a linha do tempo do lead, só de acréscimo.
--   3) A policy de INSERT anônimo passa a travar toda coluna interna.
--   4) Dedupe do contato do site: a mesma pessoa vira um card só.
--   5) Trigger de estágio: data do estágio, primeiro atendimento e interação
--      `sistema` em toda mudança, manual ou automática.
--   6) Funções das escritas em mais de uma tabela (as server actions chamam).
--   7) `crm_leads_v`, a leitura do console.
--   8) Tudo o que é novo fica fechado para anon e authenticated.
--
-- O QUE ELA NÃO FAZ: não liga os triggers que criam leads a partir das
-- assinaturas nem importa a base. Isso é a 48, que entra DEPOIS do deploy do
-- web novo (a tela antiga quebra com lead sem telefone).
--
-- COMPATÍVEL COM O WEB QUE ESTÁ NO AR: os defaults deixam o insert antigo do
-- formulário passar no CHECK novo, nenhuma coluna é removida e nada aqui cria
-- lead com telefone, e-mail ou assunto nulo.
--
-- SEM begin/commit e sem `create index concurrently`: o ensaio roda esta
-- migração dentro de `begin; … rollback;`.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) Colunas novas em leads_site
-- ----------------------------------------------------------------------------
alter table public.leads_site
  add column if not exists fonte                 text not null default 'contato',
  add column if not exists tenant_id             uuid references public.tenants(id) on delete set null,
  add column if not exists empresa               text,
  add column if not exists motivo_perda          text,
  add column if not exists proxima_acao          text,
  add column if not exists proxima_acao_em       timestamptz,
  add column if not exists utm_source            text,
  add column if not exists utm_medium            text,
  add column if not exists utm_campaign          text,
  add column if not exists estagio_em            timestamptz,
  add column if not exists vinculo_criou_lead    boolean not null default false,
  add column if not exists estagio_antes_vinculo text;

-- Lead manual e importado podem não ter e-mail, telefone ou assunto.
-- A policy anônima (abaixo) continua exigindo os três.
alter table public.leads_site alter column email    drop not null;
alter table public.leads_site alter column telefone drop not null;
alter table public.leads_site alter column assunto  drop not null;

-- Nos leads que já existem, `estagio_em` vem de `atualizado_em`: sem isso, todo
-- ganho e perdido antigo cairia na janela de 30 dias do kanban no primeiro dia.
-- O trigger de `atualizado_em` fica desligado só durante este UPDATE, para a
-- data não virar "agora".
alter table public.leads_site disable trigger trg_leads_site_updated;
update public.leads_site set estagio_em = atualizado_em where estagio_em is null;
alter table public.leads_site enable trigger trg_leads_site_updated;

alter table public.leads_site alter column estagio_em set default now();
alter table public.leads_site alter column estagio_em set not null;

-- CHECK de status: o nome criado pela db/39 não é garantido, então qualquer
-- CHECK de leads_site que fale de `status` sai e entra o novo, com `trial`.
do $$
declare r record;
begin
  for r in
    select conname
      from pg_constraint
     where conrelid = 'public.leads_site'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%status%'
       and conname <> 'leads_site_estagio_antes_vinculo_check'
  loop
    execute format('alter table public.leads_site drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.leads_site
  add constraint leads_site_status_check
  check (status in ('novo','em_contato','trial','ganho','perdido'));

alter table public.leads_site drop constraint if exists leads_site_fonte_check;
alter table public.leads_site
  add constraint leads_site_fonte_check
  check (fonte in ('contato','trial','master','manual','importacao'));

-- Motivo nulo é permitido: os perdidos de antes do CRM não têm. A exigência
-- fica na action (req. 2). `cancelou` é só do sistema.
alter table public.leads_site drop constraint if exists leads_site_motivo_perda_check;
alter table public.leads_site
  add constraint leads_site_motivo_perda_check
  check (motivo_perda is null or motivo_perda in
         ('preco','sem_retorno','concorrente','sem_perfil','desistiu','outro','cancelou'));

alter table public.leads_site drop constraint if exists leads_site_proxima_acao_check;
alter table public.leads_site
  add constraint leads_site_proxima_acao_check
  check (proxima_acao is null or length(proxima_acao) <= 200);

alter table public.leads_site drop constraint if exists leads_site_utm_check;
alter table public.leads_site
  add constraint leads_site_utm_check
  check (    length(coalesce(utm_source, ''))   <= 100
         and length(coalesce(utm_medium, ''))   <= 100
         and length(coalesce(utm_campaign, '')) <= 100);

alter table public.leads_site drop constraint if exists leads_site_estagio_antes_vinculo_check;
alter table public.leads_site
  add constraint leads_site_estagio_antes_vinculo_check
  check (estagio_antes_vinculo is null or estagio_antes_vinculo in
         ('novo','em_contato','trial','ganho','perdido'));

comment on column public.leads_site.fonte is
  'Por onde o lead entrou: contato (formulário do site), trial (cadastro), master (rede criada no console), manual, importacao.';
comment on column public.leads_site.tenant_id is
  'Rede ligada ao lead. Um lead por rede (índice único parcial). Ligado pelo trigger das assinaturas (db/48).';
comment on column public.leads_site.estagio_em is
  'Quando o lead entrou no estágio atual. Ganho e Perdido do kanban mostram só os últimos 30 dias por esta data.';
comment on column public.leads_site.vinculo_criou_lead is
  'O lead nasceu do vínculo com a rede (não existia antes). Decide se o rollback do cadastro apaga ou só desliga o lead.';
comment on column public.leads_site.estagio_antes_vinculo is
  'Estágio do lead antes de ser ligado a uma rede. O rollback do cadastro devolve o lead a ele.';

-- ----------------------------------------------------------------------------
-- 2) Índices
-- ----------------------------------------------------------------------------
create index if not exists idx_leads_site_email_lower
  on public.leads_site (lower(email)) where email is not null;
create index if not exists idx_leads_site_telefone
  on public.leads_site (telefone) where telefone is not null;
create unique index if not exists idx_leads_site_tenant_unique
  on public.leads_site (tenant_id) where tenant_id is not null;
create index if not exists idx_leads_site_proxima_acao
  on public.leads_site (proxima_acao_em) where proxima_acao_em is not null;
create index if not exists idx_leads_site_status_estagio
  on public.leads_site (status, estagio_em desc);

-- ----------------------------------------------------------------------------
-- 3) lead_interacoes: linha do tempo, só de acréscimo
-- ----------------------------------------------------------------------------
create table if not exists public.lead_interacoes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads_site(id) on delete cascade,
  tipo       text not null
             check (tipo in ('nota','ligacao','whatsapp','email','reuniao','sistema')),
  texto      text not null check (length(texto) between 1 and 4000),
  criado_em  timestamptz not null default now()
);

create index if not exists idx_lead_interacoes_lead_data
  on public.lead_interacoes (lead_id, criado_em desc);

comment on table public.lead_interacoes is
  'Linha do tempo dos leads do CRM. Só de acréscimo (sem UPDATE/DELETE na aplicação). Só service_role lê e escreve.';

-- RLS ligado e forçado, sem nenhuma policy: anon e authenticated não veem nada.
alter table public.lead_interacoes enable row level security;
alter table public.lead_interacoes force  row level security;
revoke all on public.lead_interacoes from public, anon, authenticated;
grant all on public.lead_interacoes to service_role;

-- ----------------------------------------------------------------------------
-- 4) Policy de INSERT anônimo (a defesa real; ver db/39)
-- ----------------------------------------------------------------------------
drop policy if exists leads_site_insert_publico on public.leads_site;
create policy leads_site_insert_publico on public.leads_site
  for insert to anon, authenticated
  with check (
        nome is not null and length(btrim(nome)) between 2 and 120
    and assunto is not null and length(btrim(assunto)) between 5 and 2000
    and email is not null
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and length(email) <= 254
    -- só dígitos, 10 (fixo) ou 11 (celular): mesma regra de lib/telefone.ts
    and telefone is not null and telefone ~ '^[0-9]{10,11}$'
    and length(origem) <= 200
    and length(coalesce(user_agent, '')) <= 500
    and length(coalesce(ip, '')) <= 60
    and length(coalesce(utm_source, ''))   <= 100
    and length(coalesce(utm_medium, ''))   <= 100
    and length(coalesce(utm_campaign, '')) <= 100
    -- campos internos ficam fora do alcance de quem escreve pelo site
    and status = 'novo'
    and fonte = 'contato'
    and observacao is null
    and atendido_em is null
    and tenant_id is null
    and empresa is null
    and motivo_perda is null
    and proxima_acao is null
    and proxima_acao_em is null
    and vinculo_criou_lead = false
    and estagio_antes_vinculo is null
  );

-- ----------------------------------------------------------------------------
-- 5) fn_crm_casar: leads que casam por e-mail (sem caixa) ou telefone (dígitos)
--
-- A regra de casamento mora só aqui: dedupe do contato, lead manual, edição de
-- contato e vínculo com a rede (db/48) usam esta função. Vazio conta como
-- ausente nos dois lados, senão um e-mail vazio casaria com todo lead vazio.
-- Mais recente primeiro (edge 3: e-mail casa com A e telefone com B → o mais
-- recente ganha).
-- ----------------------------------------------------------------------------
create or replace function public.fn_crm_casar(p_email text, p_telefone text)
returns table (lead_id uuid, casou_por text, tenant_id uuid, criado_em timestamptz)
language sql stable
set search_path = public, pg_temp
as $$
  with p as (
    select nullif(lower(btrim(coalesce(p_email, ''))), '')                       as email,
           nullif(regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g'), '') as tel
  ), m as (
    select l.id, l.tenant_id, l.criado_em,
           (p.email is not null and lower(l.email) = p.email) as por_email,
           (p.tel   is not null and l.telefone     = p.tel)   as por_tel
      from public.leads_site l, p
     where (p.email is not null and lower(l.email) = p.email)
        or (p.tel   is not null and l.telefone     = p.tel)
  )
  select m.id,
         case when m.por_email and m.por_tel then 'ambos'
              when m.por_email then 'email'
              else 'telefone' end,
         m.tenant_id,
         m.criado_em
    from m
   order by m.criado_em desc, m.id;
$$;

-- ----------------------------------------------------------------------------
-- 6) Dedupe do contato do site (req. 7 e 8)
--
-- É um trigger AFTER INSERT, e não BEFORE com `return null`, por dois motivos:
--   - a policy de INSERT (WITH CHECK) já validou a linha antes de um trigger
--     AFTER rodar, então os limites do formulário não se repetem aqui;
--   - a resposta ao anon é a mesma com ou sem lead existente, inclusive para
--     quem chama o PostgREST direto pedindo a linha de volta. Com `return null`
--     a resposta mudaria (lista vazia × erro de RLS) e revelaria quem já é
--     contato ou cliente.
--
-- Se casar com um lead que já existe: grava "Novo contato pelo site" nele
-- (no máximo 3 por lead a cada 24 h; acima disso, descarta em silêncio) e
-- apaga a linha recém-inserida. Em erro: WARNING e a linha fica como lead
-- novo. Perder o lead é pior que duplicá-lo.
--
-- `security definer`: quem insere é o anon, que não lê leads_site nem escreve
-- em lead_interacoes. Quem executa é o dono da função (postgres, com
-- BYPASSRLS no Supabase). O db/49 prova que isso vale com o RLS forçado.
-- ----------------------------------------------------------------------------
create or replace function public.fn_crm_dedupe_contato()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_existente uuid;
  v_recentes  int;
begin
  begin
    -- Dois envios simultâneos do mesmo contato: um espera o outro, e o segundo
    -- já enxerga o primeiro (lock por e-mail e por telefone).
    perform pg_advisory_xact_lock(hashtext('crm:' || lower(btrim(new.email))));
    perform pg_advisory_xact_lock(hashtext('crm:' || new.telefone));

    select c.lead_id into v_existente
      from public.fn_crm_casar(new.email, new.telefone) c
     where c.lead_id <> new.id
     order by c.criado_em desc
     limit 1;

    if v_existente is null then
      return null;  -- lead novo de verdade: a linha fica
    end if;

    select count(*) into v_recentes
      from public.lead_interacoes i
     where i.lead_id = v_existente
       and i.tipo = 'sistema'
       and i.texto like 'Novo contato pelo site%'
       and i.criado_em > now() - interval '24 hours';

    if v_recentes < 3 then
      insert into public.lead_interacoes (lead_id, tipo, texto)
      values (v_existente, 'sistema',
              left('Novo contato pelo site: ' || coalesce(new.assunto, ''), 4000));
    end if;

    delete from public.leads_site where id = new.id;
  exception when others then
    raise warning '[crm] dedupe do contato falhou (lead % fica como novo): % %',
      new.id, sqlstate, sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists trg_leads_site_dedupe on public.leads_site;
create trigger trg_leads_site_dedupe
  after insert on public.leads_site
  for each row
  when (new.fonte = 'contato')
  execute function public.fn_crm_dedupe_contato();

-- ----------------------------------------------------------------------------
-- 7) Trigger de estágio (req. 4, 6 e 14)
--
-- BEFORE: carimba `estagio_em` (só se o próprio UPDATE não informou outra data;
-- a importação da 48 informa a data real) e o primeiro `atendido_em` ao sair
-- de `novo`, sem sobrescrever.
-- AFTER: grava a interação `sistema`. O texto vem de `crm.motivo` quando quem
-- mudou o estágio o definiu (`set_config('crm.motivo', '…', true)`); depois de
-- usado, ele é limpo, porque vale até o fim da transação.
-- Em erro: WARNING e o UPDATE segue (req. 10 vale para todos os triggers).
-- ----------------------------------------------------------------------------
create or replace function public.fn_crm_rotulo_estagio(p text)
returns text language sql immutable
set search_path = public, pg_temp
as $$
  select case p
    when 'novo'       then 'Novo'
    when 'em_contato' then 'Em contato'
    when 'trial'      then 'Trial'
    when 'ganho'      then 'Ganho'
    when 'perdido'    then 'Perdido'
    else coalesce(p, '—') end;
$$;

create or replace function public.fn_crm_rotulo_motivo(p text)
returns text language sql immutable
set search_path = public, pg_temp
as $$
  select case p
    when 'preco'       then 'preço'
    when 'sem_retorno' then 'sem retorno'
    when 'concorrente' then 'foi para um concorrente'
    when 'sem_perfil'  then 'sem perfil'
    when 'desistiu'    then 'desistiu'
    when 'outro'       then 'outro'
    when 'cancelou'    then 'cancelou o trial'
    else p end;
$$;

create or replace function public.fn_crm_estagio()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_texto text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if tg_when = 'BEFORE' then
    begin
      if new.estagio_em is not distinct from old.estagio_em then
        new.estagio_em := now();
      end if;
      if old.status = 'novo' and old.atendido_em is null and new.atendido_em is null then
        new.atendido_em := now();
      end if;
    exception when others then
      raise warning '[crm] trigger de estágio (antes) falhou no lead %: % %',
        new.id, sqlstate, sqlerrm;
    end;
    return new;
  end if;

  -- AFTER
  begin
    v_texto := nullif(current_setting('crm.motivo', true), '');
    if v_texto is null then
      v_texto := 'Estágio: ' || public.fn_crm_rotulo_estagio(old.status)
              || ' → ' || public.fn_crm_rotulo_estagio(new.status);
      if new.status = 'perdido' and new.motivo_perda is not null then
        v_texto := v_texto || ' (motivo: ' || public.fn_crm_rotulo_motivo(new.motivo_perda) || ')';
      end if;
    end if;
    perform set_config('crm.motivo', '', true);

    insert into public.lead_interacoes (lead_id, tipo, texto)
    values (new.id, 'sistema', left(v_texto, 4000));
  exception when others then
    raise warning '[crm] trigger de estágio (depois) falhou no lead %: % %',
      new.id, sqlstate, sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists trg_leads_site_estagio_antes on public.leads_site;
create trigger trg_leads_site_estagio_antes
  before update of status on public.leads_site
  for each row execute function public.fn_crm_estagio();

drop trigger if exists trg_leads_site_estagio_depois on public.leads_site;
create trigger trg_leads_site_estagio_depois
  after update of status on public.leads_site
  for each row
  when (old.status is distinct from new.status)
  execute function public.fn_crm_estagio();

-- ----------------------------------------------------------------------------
-- 8) Funções das server actions (escritas atômicas; só service_role executa)
--
-- A matriz de estágio (quem pode ir para onde) mora em `lib/crm/regras.ts`.
-- Aqui ficam só as invariantes que nunca mudam: Ganho não é destino manual,
-- `cancelou` é do sistema e Trial só volta com a rede ainda em trial.
-- ----------------------------------------------------------------------------

-- Muda o estágio com compare-and-set: só grava se o estágio ainda for `p_de`.
-- Retorna 'ok', 'mudou' (alguém mudou antes; recarregar) ou 'nao_encontrado'.
create or replace function public.fn_crm_mover(
  p_id           uuid,
  p_de           text,
  p_para         text,
  p_motivo_perda text default null,
  p_texto        text default null
) returns text
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_texto  text := nullif(btrim(coalesce(p_texto, '')), '');
  v_motivo text;
  v_linhas int;
begin
  if p_para not in ('novo','em_contato','trial','perdido') then
    raise exception 'destino inválido: %', p_para using errcode = '22023';
  end if;
  if p_para = 'perdido' then
    if p_motivo_perda is null
       or p_motivo_perda not in ('preco','sem_retorno','concorrente','sem_perfil','desistiu','outro') then
      raise exception 'motivo de perda inválido: %', p_motivo_perda using errcode = '22023';
    end if;
    if p_motivo_perda = 'outro' and v_texto is null then
      raise exception 'motivo "outro" exige comentário' using errcode = '22023';
    end if;
  end if;
  if v_texto is not null and length(v_texto) > 4000 then
    raise exception 'comentário longo demais' using errcode = '22023';
  end if;

  if p_para = 'trial' then
    v_motivo := 'Reaberto: voltou para Trial';
  end if;
  perform set_config('crm.motivo', coalesce(v_motivo, ''), true);

  update public.leads_site l
     set status       = p_para,
         motivo_perda = case when p_para = 'perdido' then p_motivo_perda else null end
   where l.id = p_id
     and l.status = p_de
     and l.status <> 'ganho'
     and (p_para <> 'trial' or exists (
           select 1 from public.assinaturas a
            where a.tenant_id = l.tenant_id and a.estado = 'trial'));
  get diagnostics v_linhas = row_count;

  -- O trigger limpa ao usar; aqui cobre o caso em que ele não disparou.
  perform set_config('crm.motivo', '', true);

  if v_linhas = 0 then
    if exists (select 1 from public.leads_site where id = p_id) then
      return 'mudou';
    end if;
    return 'nao_encontrado';
  end if;

  -- clock_timestamp(): a nota fica depois da linha do sistema, que usa now().
  if v_texto is not null then
    insert into public.lead_interacoes (lead_id, tipo, texto, criado_em)
    values (p_id, 'nota', v_texto, clock_timestamp());
  end if;

  return 'ok';
end $$;

-- Acrescenta uma interação do master e, se pedido, conclui a próxima ação.
-- Retorna o id da interação, ou null se o lead não existe.
create or replace function public.fn_crm_registrar_interacao(
  p_lead_id  uuid,
  p_tipo     text,
  p_texto    text,
  p_concluir boolean default false
) returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_texto text := btrim(coalesce(p_texto, ''));
  v_id    uuid;
begin
  if p_tipo not in ('nota','ligacao','whatsapp','email','reuniao') then
    raise exception 'tipo de interação inválido: %', p_tipo using errcode = '22023';
  end if;
  if length(v_texto) not between 1 and 4000 then
    raise exception 'texto da interação vazio ou longo demais' using errcode = '22023';
  end if;
  if not exists (select 1 from public.leads_site where id = p_lead_id) then
    return null;
  end if;

  insert into public.lead_interacoes (lead_id, tipo, texto)
  values (p_lead_id, p_tipo, v_texto)
  returning id into v_id;

  if coalesce(p_concluir, false) then
    update public.leads_site
       set proxima_acao = null, proxima_acao_em = null
     where id = p_lead_id;
  end if;

  return v_id;
end $$;

-- Cria um lead à mão (req. 18 e 19). Se o e-mail ou o telefone já existe, NÃO
-- cria e devolve até 2 leads que casaram (um pelo e-mail, outro pelo telefone,
-- quando forem diferentes). Retorno:
--   {"ok": true,  "id": "…"}
--   {"ok": false, "duplicados": [{"id","nome","empresa","status","casou_por"}]}
create or replace function public.fn_crm_criar_lead_manual(
  p_nome            text,
  p_empresa         text,
  p_email           text,
  p_telefone        text,
  p_status          text,
  p_nota            text default null,
  p_proxima_acao    text default null,
  p_proxima_acao_em timestamptz default null
) returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_nome    text := btrim(coalesce(p_nome, ''));
  v_empresa text := nullif(btrim(coalesce(p_empresa, '')), '');
  v_email   text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_tel     text := nullif(regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g'), '');
  v_nota    text := nullif(btrim(coalesce(p_nota, '')), '');
  v_acao    text := nullif(btrim(coalesce(p_proxima_acao, '')), '');
  v_dups    jsonb;
  v_id      uuid;
begin
  if length(v_nome) not between 1 and 120 then
    raise exception 'nome obrigatório (até 120 caracteres)' using errcode = '22023';
  end if;
  if p_status not in ('novo','em_contato') then
    raise exception 'estágio inicial inválido: %', p_status using errcode = '22023';
  end if;
  if v_email is null and v_tel is null then
    raise exception 'informe pelo menos um contato' using errcode = '22023';
  end if;
  if v_acao is null and p_proxima_acao_em is not null then
    raise exception 'data da próxima ação sem a ação' using errcode = '22023';
  end if;

  -- Dois cadastros simultâneos do mesmo contato: um espera o outro.
  if v_email is not null then
    perform pg_advisory_xact_lock(hashtext('crm:' || v_email));
  end if;
  if v_tel is not null then
    perform pg_advisory_xact_lock(hashtext('crm:' || v_tel));
  end if;

  with c as (
    select * from public.fn_crm_casar(v_email, v_tel)
  ), escolhidos as (
    (select lead_id, casou_por from c where casou_por in ('email','ambos')
      order by criado_em desc limit 1)
    union
    (select lead_id, casou_por from c where casou_por in ('telefone','ambos')
      order by criado_em desc limit 1)
  )
  select jsonb_agg(jsonb_build_object(
           'id', l.id, 'nome', l.nome, 'empresa', l.empresa,
           'status', l.status, 'casou_por', e.casou_por)
         order by l.criado_em desc)
    into v_dups
    from (select distinct on (lead_id) lead_id, casou_por from escolhidos
           order by lead_id, casou_por) e
    join public.leads_site l on l.id = e.lead_id;

  if v_dups is not null then
    return jsonb_build_object('ok', false, 'duplicados', v_dups);
  end if;

  insert into public.leads_site
    (nome, empresa, email, telefone, status, fonte, proxima_acao, proxima_acao_em)
  values
    (v_nome, v_empresa, v_email, v_tel, p_status, 'manual', v_acao, p_proxima_acao_em)
  returning id into v_id;

  insert into public.lead_interacoes (lead_id, tipo, texto)
  values (v_id, 'sistema', 'Lead cadastrado à mão em ' || public.fn_crm_rotulo_estagio(p_status));

  if v_nota is not null then
    insert into public.lead_interacoes (lead_id, tipo, texto, criado_em)
    values (v_id, 'nota', left(v_nota, 4000), clock_timestamp());
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- Edita nome, empresa e contatos de um lead. Mesma regra do lead manual:
-- pelo menos um contato e nenhum outro lead com o mesmo e-mail ou telefone,
-- checado e gravado sob o mesmo lock (não há janela entre os dois).
-- Retorno:
--   {"ok": true}
--   {"ok": false, "nao_encontrado": true}
--   {"ok": false, "duplicados": [{"id","nome","empresa","status","casou_por"}]}
create or replace function public.fn_crm_editar_contato(
  p_id       uuid,
  p_nome     text,
  p_empresa  text,
  p_email    text,
  p_telefone text
) returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_nome    text := btrim(coalesce(p_nome, ''));
  v_empresa text := nullif(btrim(coalesce(p_empresa, '')), '');
  v_email   text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_tel     text := nullif(regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g'), '');
  v_dups    jsonb;
begin
  if length(v_nome) not between 1 and 120 then
    raise exception 'nome obrigatório (até 120 caracteres)' using errcode = '22023';
  end if;
  if v_email is null and v_tel is null then
    raise exception 'informe pelo menos um contato' using errcode = '22023';
  end if;

  if v_email is not null then
    perform pg_advisory_xact_lock(hashtext('crm:' || v_email));
  end if;
  if v_tel is not null then
    perform pg_advisory_xact_lock(hashtext('crm:' || v_tel));
  end if;

  if not exists (select 1 from public.leads_site where id = p_id) then
    return jsonb_build_object('ok', false, 'nao_encontrado', true);
  end if;

  select jsonb_agg(jsonb_build_object(
           'id', l.id, 'nome', l.nome, 'empresa', l.empresa,
           'status', l.status, 'casou_por', c.casou_por)
         order by c.criado_em desc)
    into v_dups
    from (select * from public.fn_crm_casar(v_email, v_tel) where lead_id <> p_id
           order by criado_em desc limit 2) c
    join public.leads_site l on l.id = c.lead_id;

  if v_dups is not null then
    return jsonb_build_object('ok', false, 'duplicados', v_dups);
  end if;

  update public.leads_site
     set nome = v_nome, empresa = v_empresa, email = v_email, telefone = v_tel
   where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- Apaga de vez um lead de spam (Revisão 3): só do formulário, sem rede ligada
-- e sem interação humana (nem observação antiga). As condições estão no
-- próprio DELETE, então não há janela entre checar e apagar.
create or replace function public.fn_crm_excluir_spam(p_id uuid)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
begin
  delete from public.leads_site l
   where l.id = p_id
     and l.fonte = 'contato'
     and l.tenant_id is null
     and coalesce(btrim(l.observacao), '') = ''
     and not exists (
           select 1 from public.lead_interacoes i
            where i.lead_id = l.id and i.tipo <> 'sistema');
  return found;
end $$;

-- ----------------------------------------------------------------------------
-- 9) crm_leads_v: a leitura do console
--
-- `security_invoker = true`: a view respeita o RLS de quem consulta. Uma view
-- comum roda como o dono, pularia o RLS e entregaria os leads à chave pública.
-- ----------------------------------------------------------------------------
drop view if exists public.crm_leads_v;
create view public.crm_leads_v
with (security_invoker = true) as
select l.id,
       l.nome,
       l.empresa,
       l.email,
       l.telefone,
       l.assunto,
       l.origem,
       l.status,
       l.fonte,
       l.motivo_perda,
       l.proxima_acao,
       l.proxima_acao_em,
       l.utm_source,
       l.utm_medium,
       l.utm_campaign,
       l.tenant_id,
       l.vinculo_criou_lead,
       l.atendido_em,
       l.estagio_em,
       l.criado_em,
       l.atualizado_em,
       t.codigo          as tenant_codigo,
       t.nome            as tenant_nome,
       a.estado          as assinatura_estado,
       a.trial_expira_em as trial_expira_em,
       (   coalesce(btrim(l.observacao), '') <> ''
        or exists (select 1 from public.lead_interacoes i
                    where i.lead_id = l.id and i.tipo <> 'sistema')
       ) as tem_interacao_humana
  from public.leads_site l
  left join public.tenants     t on t.id = l.tenant_id
  left join public.assinaturas a on a.tenant_id = l.tenant_id;

comment on view public.crm_leads_v is
  'Leitura do CRM do console master. security_invoker; só service_role.';

-- ----------------------------------------------------------------------------
-- 10) Tudo o que é novo fica fechado para anon e authenticated
--
-- O PostgREST expõe o schema public, e o Supabase dá EXECUTE em função nova
-- para anon e authenticated por padrão. `fn_crm_casar` aberta seria um oráculo
-- de "esse e-mail já é lead?".
-- ----------------------------------------------------------------------------
revoke all on public.crm_leads_v from public, anon, authenticated;
grant select on public.crm_leads_v to service_role;

revoke all on function public.fn_crm_casar(text, text)                 from public, anon, authenticated;
revoke all on function public.fn_crm_dedupe_contato()                  from public, anon, authenticated;
revoke all on function public.fn_crm_rotulo_estagio(text)              from public, anon, authenticated;
revoke all on function public.fn_crm_rotulo_motivo(text)               from public, anon, authenticated;
revoke all on function public.fn_crm_estagio()                         from public, anon, authenticated;
revoke all on function public.fn_crm_mover(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.fn_crm_registrar_interacao(uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.fn_crm_criar_lead_manual(text, text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.fn_crm_excluir_spam(uuid)                from public, anon, authenticated;
revoke all on function public.fn_crm_editar_contato(uuid, text, text, text, text) from public, anon, authenticated;

grant execute on function public.fn_crm_casar(text, text)                 to service_role;
grant execute on function public.fn_crm_mover(uuid, text, text, text, text) to service_role;
grant execute on function public.fn_crm_registrar_interacao(uuid, text, text, boolean) to service_role;
grant execute on function public.fn_crm_criar_lead_manual(text, text, text, text, text, text, text, timestamptz) to service_role;
grant execute on function public.fn_crm_excluir_spam(uuid)                to service_role;
grant execute on function public.fn_crm_editar_contato(uuid, text, text, text, text) to service_role;

-- ============================================================================
-- VALIDAÇÃO: db/49-crm-teste-schema.sql (ensaio: begin; 47; 47; 49; rollback;)
-- ============================================================================
