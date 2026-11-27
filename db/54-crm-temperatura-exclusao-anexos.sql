-- ============================================================================
-- NuvemPark — 54: CRM com temperatura, exclusão que guarda e prints nas notas
-- Spec: .planning/specs/crm-temperatura-arrastar-prints.md
-- Plano: .planning/plans/crm-temperatura-arrastar-prints.md
--
-- O que muda:
--   1) leads_site ganha `temperatura` (quente/morno/frio) e `excluido_em`
--      (excluir guarda o lead; ele sai do quadro, mas fica no banco);
--   2) a nota pode ficar sem texto quando tem print; `lead_anexos` guarda os
--      prints (no bucket PRIVADO `crm-anexos`);
--   3) funções novas: temperatura, excluir, restaurar, remover print;
--   4) o banco respeita o excluído: o formulário e a conta criada o trazem de
--      volta; a assinatura de uma rede excluída não cria outro card;
--   5) sai `fn_crm_excluir_spam`: nada mais é apagado de vez pela interface.
--
-- Ordem em produção: aplicar LOGO ANTES do deploy 1. A tela que está no ar
-- continua funcionando (a gravação de nota aceita a chamada antiga, de 4
-- argumentos), exceto o "Excluir: é spam", que fica dando erro até o deploy.
--
-- Não reaplicar a 47 depois desta: a 47 recria a versão antiga das funções.
-- Sem begin/commit: o ensaio roda esta migração dentro de `begin; … rollback;`.
-- Prova: db/55-crm-teste-temperatura-exclusao-anexos.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Colunas novas
-- ----------------------------------------------------------------------------
alter table public.leads_site
  add column if not exists temperatura text,
  add column if not exists excluido_em timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.leads_site'::regclass
                    and conname = 'leads_site_temperatura_check') then
    alter table public.leads_site
      add constraint leads_site_temperatura_check
      check (temperatura in ('quente','morno','frio'));
  end if;
end $$;

comment on column public.leads_site.temperatura is
  'Marcada à mão no CRM: quente, morno ou frio. Null = sem marca.';
comment on column public.leads_site.excluido_em is
  'Excluído do CRM (some do quadro, o histórico fica). Null = no quadro.';

-- A nota pode ficar sem texto quando tem print. A regra "texto OU print" mora
-- em fn_crm_registrar_interacao; o check da tabela só limita o tamanho.
do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
     where conrelid = 'public.lead_interacoes'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%length(texto)%'
       and conname <> 'lead_interacoes_texto_tamanho'
  loop
    execute format('alter table public.lead_interacoes drop constraint %I', r.conname);
  end loop;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.lead_interacoes'::regclass
                    and conname = 'lead_interacoes_texto_tamanho') then
    alter table public.lead_interacoes
      add constraint lead_interacoes_texto_tamanho check (length(texto) <= 4000);
  end if;
end $$;

alter table public.lead_interacoes
  add column if not exists anexos_removidos smallint not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.lead_interacoes'::regclass
                    and conname = 'lead_interacoes_anexos_removidos_check') then
    alter table public.lead_interacoes
      add constraint lead_interacoes_anexos_removidos_check
      check (anexos_removidos between 0 and 100);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2) Prints das notas
--
-- Sem soft delete: remover um print tira de vez a linha e o arquivo, porque o
-- motivo de remover é tirar um dado que não devia estar ali. Fica só o
-- contador `anexos_removidos` na interação.
-- ----------------------------------------------------------------------------
create table if not exists public.lead_anexos (
  id           uuid primary key default gen_random_uuid(),
  interacao_id uuid not null references public.lead_interacoes(id) on delete cascade,
  caminho      text not null unique check (length(caminho) between 3 and 200),
  tipo_mime    text not null check (tipo_mime in ('image/webp','image/jpeg','image/png')),
  bytes        int  not null check (bytes between 1 and 5242880),
  largura      int  check (largura between 1 and 20000),
  altura       int  check (altura between 1 and 20000),
  ordem        smallint not null check (ordem between 0 and 4),
  criado_em    timestamptz not null default now()
);

create index if not exists idx_lead_anexos_interacao
  on public.lead_anexos (interacao_id, ordem);

comment on table public.lead_anexos is
  'Prints das notas do CRM (bucket privado crm-anexos). Só service_role lê e escreve.';

alter table public.lead_anexos enable row level security;
alter table public.lead_anexos force  row level security;
revoke all on public.lead_anexos from public, anon, authenticated;
grant all on public.lead_anexos to service_role;

-- O bucket só existe no Supabase. No Postgres local de prova não há o schema
-- `storage`, e o bloco é pulado.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('crm-anexos', 'crm-anexos', false, 5242880,
            array['image/webp','image/jpeg','image/png'])
    on conflict (id) do update
      set public             = false,
          file_size_limit    = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 3) Policy de INSERT anônimo: a da 47, mais temperatura e exclusão
--    Pela chave pública não dá para criar lead já marcado nem já escondido.
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
    and telefone is not null and telefone ~ '^[0-9]{10,11}$'
    and length(origem) <= 200
    and length(coalesce(user_agent, '')) <= 500
    and length(coalesce(ip, '')) <= 60
    and length(coalesce(utm_source, ''))   <= 100
    and length(coalesce(utm_medium, ''))   <= 100
    and length(coalesce(utm_campaign, '')) <= 100
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
    and temperatura is null
    and excluido_em is null
  );

-- ----------------------------------------------------------------------------
-- 4) crm_leads_v com as colunas novas
--    A view NÃO filtra os excluídos: quem filtra é a consulta, porque a visão
--    "Excluídos" e o painel em modo leitura também leem daqui.
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
       l.temperatura,
       l.excluido_em,
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
  'Leitura do CRM do console master. security_invoker; só service_role. Não filtra excluídos.';

revoke all on public.crm_leads_v from public, anon, authenticated;
grant select on public.crm_leads_v to service_role;

-- ----------------------------------------------------------------------------
-- 5) fn_crm_casar diz se o lead casado está excluído
--    O retorno muda de forma, então é drop + create (e o grant de novo).
--    Quem escolhe entre os casados (dedupe e vínculo) ordena por
--    `excluido, criado_em desc`: um lead ativo sempre vence um excluído.
-- ----------------------------------------------------------------------------
drop function if exists public.fn_crm_casar(text, text);
create function public.fn_crm_casar(p_email text, p_telefone text)
returns table (lead_id uuid, casou_por text, tenant_id uuid, criado_em timestamptz, excluido boolean)
language sql stable
set search_path = public, pg_temp
as $$
  with p as (
    select nullif(lower(btrim(coalesce(p_email, ''))), '')                       as email,
           nullif(regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g'), '') as tel
  ), m as (
    select l.id, l.tenant_id, l.criado_em, l.excluido_em,
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
         m.criado_em,
         m.excluido_em is not null
    from m
   order by m.excluido_em is not null, m.criado_em desc, m.id;
$$;

-- ----------------------------------------------------------------------------
-- 6) Restaurar (um lugar só para o texto e para o estágio)
--
-- Com mudança de estágio, o texto vai pelo `crm.motivo` e o trigger de
-- estágio grava UMA interação (sem "Estágio: X → Novo" duplicado). Sem
-- mudança, a própria função grava a interação.
-- Devolve false se o lead não existe ou não está excluído.
-- ----------------------------------------------------------------------------
create or replace function public.fn_crm_restaurar_interno(
  p_id    uuid,
  p_texto text,
  p_para  text default null
) returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_lead record;
begin
  select l.id, l.status, l.excluido_em into v_lead
    from public.leads_site l where l.id = p_id
     for update;
  if v_lead.id is null or v_lead.excluido_em is null then
    return false;
  end if;

  if p_para is not null and p_para is distinct from v_lead.status then
    perform set_config('crm.motivo', left(p_texto, 4000), true);
    update public.leads_site
       set excluido_em  = null,
           status       = p_para,
           motivo_perda = case when p_para = 'perdido' then motivo_perda else null end
     where id = p_id;
    perform set_config('crm.motivo', '', true);
  else
    update public.leads_site set excluido_em = null where id = p_id;
    insert into public.lead_interacoes (lead_id, tipo, texto)
    values (p_id, 'sistema', left(p_texto, 4000));
  end if;
  return true;
end $$;

create or replace function public.fn_crm_restaurar(p_id uuid)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
begin
  return public.fn_crm_restaurar_interno(p_id, 'Restaurado no CRM', null);
end $$;

-- Exclui (guarda): só preenche `excluido_em` se ainda estava no quadro.
create or replace function public.fn_crm_excluir(p_id uuid)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
begin
  update public.leads_site
     set excluido_em = now()
   where id = p_id
     and excluido_em is null;
  if not found then
    return false;
  end if;
  insert into public.lead_interacoes (lead_id, tipo, texto)
  values (p_id, 'sistema', 'Excluído do CRM');
  return true;
end $$;

-- ----------------------------------------------------------------------------
-- 7) Temperatura, com compare-and-set
-- Retorno: 'ok' | 'mudou' | 'excluido' | 'nao_encontrado'
-- ----------------------------------------------------------------------------
create or replace function public.fn_crm_rotulo_temperatura(p text)
returns text
language sql immutable
set search_path = public, pg_temp
as $$
  select case p when 'quente' then 'Quente'
                when 'morno'  then 'Morno'
                when 'frio'   then 'Frio'
                else '—' end;
$$;

create or replace function public.fn_crm_definir_temperatura(
  p_id   uuid,
  p_de   text,
  p_para text
) returns text
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_linhas int;
begin
  if p_para is not null and p_para not in ('quente','morno','frio') then
    raise exception 'temperatura inválida: %', p_para using errcode = '22023';
  end if;
  if p_para is not distinct from p_de then
    raise exception 'a temperatura já é essa' using errcode = '22023';
  end if;

  update public.leads_site
     set temperatura = p_para
   where id = p_id
     and temperatura is not distinct from p_de
     and excluido_em is null;
  get diagnostics v_linhas = row_count;

  if v_linhas = 0 then
    if not exists (select 1 from public.leads_site where id = p_id) then
      return 'nao_encontrado';
    end if;
    if exists (select 1 from public.leads_site where id = p_id and excluido_em is not null) then
      return 'excluido';
    end if;
    return 'mudou';
  end if;

  insert into public.lead_interacoes (lead_id, tipo, texto)
  values (p_id, 'sistema',
          'Temperatura: ' || public.fn_crm_rotulo_temperatura(p_de)
          || ' → ' || public.fn_crm_rotulo_temperatura(p_para));
  return 'ok';
end $$;

-- ----------------------------------------------------------------------------
-- 8) Mover: recusa lead excluído
-- Retorno: 'ok' | 'mudou' | 'excluido' | 'nao_encontrado'
-- ----------------------------------------------------------------------------
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
  v_linhas int;
begin
  if p_para not in ('novo','em_contato','trial','ganho','perdido') then
    raise exception 'destino inválido: %', p_para using errcode = '22023';
  end if;
  if p_para = p_de then
    raise exception 'o lead já está em %', p_para using errcode = '22023';
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

  perform set_config('crm.motivo', '', true);

  update public.leads_site l
     set status       = p_para,
         motivo_perda = case when p_para = 'perdido' then p_motivo_perda else null end
   where l.id = p_id
     and l.status = p_de
     and l.excluido_em is null;
  get diagnostics v_linhas = row_count;

  perform set_config('crm.motivo', '', true);

  if v_linhas = 0 then
    if not exists (select 1 from public.leads_site where id = p_id) then
      return 'nao_encontrado';
    end if;
    if exists (select 1 from public.leads_site where id = p_id and excluido_em is not null) then
      return 'excluido';
    end if;
    return 'mudou';
  end if;

  if v_texto is not null then
    insert into public.lead_interacoes (lead_id, tipo, texto, criado_em)
    values (p_id, 'nota', v_texto, clock_timestamp());
  end if;

  return 'ok';
end $$;

-- ----------------------------------------------------------------------------
-- 9) Registrar interação com prints
--
-- Substitui a versão de 4 parâmetros (drop antes, para não ficar sobrecarga).
-- O `default '[]'` mantém a tela no ar funcionando entre a migração e o
-- deploy. Os dados de cada print (tipo, bytes, dimensões) vêm do que a action
-- leu no Storage, nunca do navegador. Aqui ficam as invariantes:
--   - caminho `{lead_id}/{uuid}.{webp|jpg|png}` deste lead;
--   - no máximo 5;
--   - nota com texto OU print.
-- Lead inexistente: null. Lead excluído: erro 55000.
-- ----------------------------------------------------------------------------
drop function if exists public.fn_crm_registrar_interacao(uuid, text, text, boolean);
create or replace function public.fn_crm_registrar_interacao(
  p_lead_id  uuid,
  p_tipo     text,
  p_texto    text,
  p_concluir boolean default false,
  p_anexos   jsonb   default '[]'::jsonb
) returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_texto   text  := btrim(coalesce(p_texto, ''));
  v_anexos  jsonb := coalesce(p_anexos, '[]'::jsonb);
  v_n       int;
  v_id      uuid;
  v_lead    record;
  a         record;
begin
  if p_tipo not in ('nota','ligacao','whatsapp','email','reuniao') then
    raise exception 'tipo de interação inválido: %', p_tipo using errcode = '22023';
  end if;
  if jsonb_typeof(v_anexos) <> 'array' then
    raise exception 'anexos inválidos' using errcode = '22023';
  end if;
  v_n := jsonb_array_length(v_anexos);
  if v_n > 5 then
    raise exception 'no máximo 5 prints por nota' using errcode = '22023';
  end if;
  if length(v_texto) > 4000 then
    raise exception 'texto da interação longo demais' using errcode = '22023';
  end if;
  if v_texto = '' and v_n = 0 then
    raise exception 'texto da interação vazio' using errcode = '22023';
  end if;

  select l.id, l.excluido_em into v_lead
    from public.leads_site l where l.id = p_lead_id;
  if v_lead.id is null then
    return null;
  end if;
  if v_lead.excluido_em is not null then
    raise exception 'lead excluído' using errcode = '55000';
  end if;

  insert into public.lead_interacoes (lead_id, tipo, texto)
  values (p_lead_id, p_tipo, v_texto)
  returning id into v_id;

  for a in
    select e.value as v, e.ordinality - 1 as ordem
      from jsonb_array_elements(v_anexos) with ordinality as e(value, ordinality)
  loop
    if jsonb_typeof(a.v) <> 'object'
       or coalesce(a.v->>'caminho', '') !~
          ('^' || p_lead_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$') then
      raise exception 'caminho de print inválido' using errcode = '22023';
    end if;
    insert into public.lead_anexos (interacao_id, caminho, tipo_mime, bytes, largura, altura, ordem)
    values (v_id,
            a.v->>'caminho',
            a.v->>'tipo_mime',
            (a.v->>'bytes')::int,
            nullif(a.v->>'largura', '')::int,
            nullif(a.v->>'altura', '')::int,
            a.ordem);
  end loop;

  if coalesce(p_concluir, false) then
    update public.leads_site
       set proxima_acao = null, proxima_acao_em = null
     where id = p_lead_id;
  end if;

  return v_id;
end $$;

-- Remove um print salvo. A action apaga o arquivo ANTES e só então chama esta
-- função. Devolve o caminho removido, ou null se o print não existe ou se o
-- lead está excluído.
create or replace function public.fn_crm_remover_anexo(p_anexo_id uuid)
returns text
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v record;
begin
  select a.id, a.caminho, a.interacao_id into v
    from public.lead_anexos a
    join public.lead_interacoes i on i.id = a.interacao_id
    join public.leads_site      l on l.id = i.lead_id
   where a.id = p_anexo_id
     and l.excluido_em is null
     for update of a;
  if v.id is null then
    return null;
  end if;

  delete from public.lead_anexos where id = v.id;
  update public.lead_interacoes
     set anexos_removidos = anexos_removidos + 1
   where id = v.interacao_id;
  return v.caminho;
end $$;

-- ----------------------------------------------------------------------------
-- 10) Lead manual e edição de contato: o excluído aparece como tal
-- ----------------------------------------------------------------------------
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
      order by excluido, criado_em desc limit 1)
    union
    (select lead_id, casou_por from c where casou_por in ('telefone','ambos')
      order by excluido, criado_em desc limit 1)
  )
  select jsonb_agg(jsonb_build_object(
           'id', l.id, 'nome', l.nome, 'empresa', l.empresa,
           'status', l.status, 'casou_por', e.casou_por,
           'excluido', l.excluido_em is not null,
           'excluido_em', l.excluido_em)
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

-- Retorno: {"ok": true} | {"ok": false, "nao_encontrado": true}
--        | {"ok": false, "excluido": true} | {"ok": false, "duplicados": [...]}
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
  if exists (select 1 from public.leads_site where id = p_id and excluido_em is not null) then
    return jsonb_build_object('ok', false, 'excluido', true);
  end if;

  select jsonb_agg(jsonb_build_object(
           'id', l.id, 'nome', l.nome, 'empresa', l.empresa,
           'status', l.status, 'casou_por', c.casou_por,
           'excluido', l.excluido_em is not null,
           'excluido_em', l.excluido_em)
         order by c.criado_em desc)
    into v_dups
    from (select * from public.fn_crm_casar(v_email, v_tel) where lead_id <> p_id
           order by excluido, criado_em desc limit 2) c
    join public.leads_site l on l.id = c.lead_id;

  if v_dups is not null then
    return jsonb_build_object('ok', false, 'duplicados', v_dups);
  end if;

  update public.leads_site
     set nome = v_nome, empresa = v_empresa, email = v_email, telefone = v_tel
   where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- ----------------------------------------------------------------------------
-- 11) Dedupe do contato do site: o excluído volta
--
-- Igual à 47, mais:
--   - entre os casados, um ativo vence um excluído;
--   - casou com um excluído: restaura. Sem rede, vai para Novo; com rede,
--     fica no estágio da assinatura. O texto começa com "Novo contato pelo
--     site" para entrar no limite de 3 por 24 h. A restauração acontece
--     mesmo acima do limite; o que o limite descarta são as notas extras.
-- ----------------------------------------------------------------------------
create or replace function public.fn_crm_dedupe_contato()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_existente uuid;
  v_excluido  boolean;
  v_tenant    uuid;
  v_recentes  int;
  v_texto     text;
begin
  begin
    perform pg_advisory_xact_lock(hashtext('crm:' || lower(btrim(new.email))));
    perform pg_advisory_xact_lock(hashtext('crm:' || new.telefone));

    select c.lead_id, c.excluido, c.tenant_id into v_existente, v_excluido, v_tenant
      from public.fn_crm_casar(new.email, new.telefone) c
     where c.lead_id <> new.id
     order by c.excluido, c.criado_em desc
     limit 1;

    if v_existente is null then
      return null;  -- lead novo de verdade: a linha fica
    end if;

    if v_excluido then
      v_texto := left('Novo contato pelo site (voltou do Excluídos): ' || coalesce(new.assunto, ''), 4000);
      perform public.fn_crm_restaurar_interno(
        v_existente, v_texto, case when v_tenant is null then 'novo' end);
    else
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
    end if;

    delete from public.leads_site where id = new.id;
  exception when others then
    perform set_config('crm.motivo', '', true);
    raise warning '[crm] dedupe do contato falhou (lead % fica como novo): % %',
      new.id, sqlstate, sqlerrm;
  end;
  return null;
end $$;

-- ----------------------------------------------------------------------------
-- 12) Vínculo com a rede: um excluído sem rede é ligado e restaurado
--
-- Igual à 51, mais: entre os leads sem rede que casam, um ativo vence um
-- excluído. Um ativo ligado a OUTRA rede continua não servindo (regra de
-- hoje: a segunda rede não rouba o card); nesse caso, o excluído sem rede é
-- o escolhido, e volta.
-- ----------------------------------------------------------------------------
create or replace function public.fn_crm_ligar_ou_criar(
  p_tenant_id    uuid,
  p_email        text,
  p_alvo         text,
  p_motivo_perda text,
  p_fonte        text,
  p_estagio_em   timestamptz,
  p_criado_em    timestamptz,
  p_texto        text
) returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant record;
  v_lead   record;
  v_id     uuid;
  v_novo   text;
begin
  select t.id, t.nome, nullif(regexp_replace(coalesce(t.telefone, ''), '[^0-9]', '', 'g'), '') as telefone
    into v_tenant
    from public.tenants t where t.id = p_tenant_id;

  select l.* into v_lead
    from public.fn_crm_casar(p_email, v_tenant.telefone) c
    join public.leads_site l on l.id = c.lead_id
   where c.tenant_id is null
   order by c.excluido, c.criado_em desc
   limit 1;

  if v_lead.id is not null then
    v_novo := p_alvo;

    if v_novo is distinct from v_lead.status then
      perform set_config('crm.motivo', left(p_texto, 4000), true);
      update public.leads_site
         set tenant_id             = p_tenant_id,
             estagio_antes_vinculo = v_lead.status,
             empresa               = coalesce(empresa, v_tenant.nome),
             status                = v_novo,
             motivo_perda          = case when v_novo = 'perdido' then p_motivo_perda else null end,
             estagio_em            = case when p_estagio_em = v_lead.estagio_em
                                          then p_estagio_em + interval '1 microsecond'
                                          else p_estagio_em end
       where id = v_lead.id;
      perform set_config('crm.motivo', '', true);
    else
      update public.leads_site
         set tenant_id             = p_tenant_id,
             estagio_antes_vinculo = v_lead.status,
             empresa               = coalesce(empresa, v_tenant.nome)
       where id = v_lead.id;
      insert into public.lead_interacoes (lead_id, tipo, texto)
      values (v_lead.id, 'sistema', left(p_texto, 4000));
    end if;

    if v_lead.excluido_em is not null then
      perform public.fn_crm_restaurar_interno(v_lead.id, 'Voltou do Excluídos: rede ligada', null);
    end if;
    return v_lead.id;
  end if;

  insert into public.leads_site
    (nome, empresa, email, telefone, status, fonte, motivo_perda, tenant_id,
     vinculo_criou_lead, estagio_em, criado_em)
  values
    (v_tenant.nome, v_tenant.nome, p_email, v_tenant.telefone, p_alvo, p_fonte,
     case when p_alvo = 'perdido' then p_motivo_perda end, p_tenant_id,
     p_fonte <> 'importacao', p_estagio_em, p_criado_em)
  returning id into v_id;

  insert into public.lead_interacoes (lead_id, tipo, texto)
  values (v_id, 'sistema', left(p_texto, 4000));

  return v_id;
end $$;

-- ----------------------------------------------------------------------------
-- 13) Sai a exclusão de spam (apagava de vez)
-- ----------------------------------------------------------------------------
drop function if exists public.fn_crm_excluir_spam(uuid);

-- ----------------------------------------------------------------------------
-- 14) Permissões: tudo fechado para anon e authenticated
-- ----------------------------------------------------------------------------
revoke all on function public.fn_crm_casar(text, text)                                   from public, anon, authenticated;
revoke all on function public.fn_crm_restaurar_interno(uuid, text, text)                 from public, anon, authenticated;
revoke all on function public.fn_crm_restaurar(uuid)                                     from public, anon, authenticated;
revoke all on function public.fn_crm_excluir(uuid)                                       from public, anon, authenticated;
revoke all on function public.fn_crm_rotulo_temperatura(text)                            from public, anon, authenticated;
revoke all on function public.fn_crm_definir_temperatura(uuid, text, text)               from public, anon, authenticated;
revoke all on function public.fn_crm_mover(uuid, text, text, text, text)                 from public, anon, authenticated;
revoke all on function public.fn_crm_registrar_interacao(uuid, text, text, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.fn_crm_remover_anexo(uuid)                                 from public, anon, authenticated;
revoke all on function public.fn_crm_criar_lead_manual(text, text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.fn_crm_editar_contato(uuid, text, text, text, text)        from public, anon, authenticated;
revoke all on function public.fn_crm_dedupe_contato()                                    from public, anon, authenticated;
revoke all on function public.fn_crm_ligar_ou_criar(uuid, text, text, text, text, timestamptz, timestamptz, text) from public, anon, authenticated;

grant execute on function public.fn_crm_casar(text, text)                                   to service_role;
grant execute on function public.fn_crm_restaurar_interno(uuid, text, text)                 to service_role;
grant execute on function public.fn_crm_restaurar(uuid)                                     to service_role;
grant execute on function public.fn_crm_excluir(uuid)                                       to service_role;
grant execute on function public.fn_crm_rotulo_temperatura(text)                            to service_role;
grant execute on function public.fn_crm_definir_temperatura(uuid, text, text)               to service_role;
grant execute on function public.fn_crm_mover(uuid, text, text, text, text)                 to service_role;
grant execute on function public.fn_crm_registrar_interacao(uuid, text, text, boolean, jsonb) to service_role;
grant execute on function public.fn_crm_remover_anexo(uuid)                                 to service_role;
grant execute on function public.fn_crm_criar_lead_manual(text, text, text, text, text, text, text, timestamptz) to service_role;
grant execute on function public.fn_crm_editar_contato(uuid, text, text, text, text)        to service_role;
