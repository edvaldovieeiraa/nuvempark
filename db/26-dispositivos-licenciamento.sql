-- ============================================================================
-- NuvemPark — Licenciamento de dispositivos por pátio
-- Projeto: xrwrsswhoywzzhutzrjx · 100% IDEMPOTENTE (rodar 2x sem quebrar).
--
-- Regra de negócio: 1 dispositivo INCLUSO por pátio. Do 2º em diante no MESMO
-- pátio, R$ 39,00/mês recorrente. A licença é o par (pátio, dispositivo).
--
-- Dois eixos independentes em public.dispositivos:
--   status  = pode operar?  -> pendente | ativo | bloqueado | revogado
--   licenca = gera cobrança? -> nenhuma | incluso | licenciado | cortesia
--
-- Invariantes:
--   - No máximo 1 dispositivo com licenca='incluso' por pátio (entre não-revogados).
--   - Cobrança conta licenca='licenciado' AND status IN ('ativo','bloqueado').
--   - revogado libera o slot e para de cobrar. bloqueado não opera, mas se for
--     licenciado continua cobrando.
--
-- A REGRA DE OURO de acesso mora em fn_dispositivo_pode_logar() — API, painel e
-- master leem SÓ daqui. Nada de duplicar a lógica em TS.
--
-- OBS: nº da migration = 26 (db/25 já estava ocupado por 25-pagamento-online-origem.sql).
-- ============================================================================

-- ============================================================================
-- PASSO 1 — estender public.dispositivos
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1a) Trocar o UNIQUE global de device_uuid por UNIQUE(patio_id, device_uuid).
--     A constraint antiga é INLINE e não-nomeada (auto-nome do Postgres, tipo
--     dispositivos_device_uuid_key). Não hardcodamos o nome: descobrimos via
--     pg_constraint qualquer UNIQUE cujo conjunto de colunas seja exatamente
--     {device_uuid} e derrubamos.
-- ----------------------------------------------------------------------------
do $$
declare c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
     where rel.relname = 'dispositivos'
       and rel.relnamespace = 'public'::regnamespace
       and con.contype = 'u'
       and (
         select array_agg(att.attname order by att.attnum)
           from unnest(con.conkey) as k(attnum)
           join pg_attribute att
             on att.attrelid = con.conrelid and att.attnum = k.attnum
       ) = array['device_uuid']
  loop
    execute format('alter table public.dispositivos drop constraint %I', c.conname);
  end loop;
end $$;

-- Nova unique composta (idempotente).
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'uq_dispositivo_patio_device'
       and conrelid = 'public.dispositivos'::regclass
  ) then
    alter table public.dispositivos
      add constraint uq_dispositivo_patio_device unique (patio_id, device_uuid);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1b) Recriar o CHECK de status para o novo domínio de 4 valores.
--     O CHECK antigo também é inline/não-nomeado (auto-nome tipo
--     dispositivos_status_check). Derrubamos dinamicamente todo CHECK cujo
--     conjunto de colunas seja exatamente {status}.
-- ----------------------------------------------------------------------------
do $$
declare c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
     where rel.relname = 'dispositivos'
       and rel.relnamespace = 'public'::regnamespace
       and con.contype = 'c'
       and (
         select array_agg(att.attname order by att.attnum)
           from unnest(con.conkey) as k(attnum)
           join pg_attribute att
             on att.attrelid = con.conrelid and att.attnum = k.attnum
       ) = array['status']
  loop
    execute format('alter table public.dispositivos drop constraint %I', c.conname);
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'dispositivos_status_check_v2'
       and conrelid = 'public.dispositivos'::regclass
  ) then
    alter table public.dispositivos
      add constraint dispositivos_status_check_v2
      check (status in ('pendente','ativo','bloqueado','revogado'));
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1c) Novas colunas (add column if not exists).
-- ----------------------------------------------------------------------------
alter table public.dispositivos
  add column if not exists licenca text not null default 'nenhuma';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'dispositivos_licenca_check'
       and conrelid = 'public.dispositivos'::regclass
  ) then
    alter table public.dispositivos
      add constraint dispositivos_licenca_check
      check (licenca in ('nenhuma','incluso','licenciado','cortesia'));
  end if;
end $$;

alter table public.dispositivos
  add column if not exists android_id_hash text;  -- sha256 do ANDROID_ID; NUNCA o valor cru
alter table public.dispositivos
  add column if not exists fabricante text;
alter table public.dispositivos
  add column if not exists modelo text;
alter table public.dispositivos
  add column if not exists so_versao text;
alter table public.dispositivos
  add column if not exists app_versao text;
alter table public.dispositivos
  add column if not exists apelido text;          -- dado pelo gestor ("Guarita 1")
alter table public.dispositivos
  add column if not exists vinculado_em timestamptz;
alter table public.dispositivos
  add column if not exists bloqueado_em timestamptz;
alter table public.dispositivos
  add column if not exists revogado_em timestamptz;
alter table public.dispositivos
  add column if not exists atualizado_em timestamptz not null default now();

-- Trigger de atualizado_em (mesma fn_set_updated_at do db/01).
drop trigger if exists trg_dispositivos_updated on public.dispositivos;
create trigger trg_dispositivos_updated before update on public.dispositivos
  for each row execute function public.fn_set_updated_at();

-- ----------------------------------------------------------------------------
-- 1d) Código de pareamento: 6 dígitos, GERADO e IMUTÁVEL, derivado do device_uuid.
--     28 bits garante inteiro positivo; md5 e casts são IMMUTABLE.
--     Exibido na tela de bloqueio do app e na lista do gestor.
-- ----------------------------------------------------------------------------
alter table public.dispositivos
  add column if not exists codigo_pareamento text generated always as (
    lpad((('x' || substr(md5(device_uuid), 1, 7))::bit(28)::int % 1000000)::text, 6, '0')
  ) stored;

-- ----------------------------------------------------------------------------
-- 1e) Índices.
-- ----------------------------------------------------------------------------
create index if not exists idx_dispositivos_patio_status
  on public.dispositivos (patio_id, status);
create index if not exists idx_dispositivos_patio_android
  on public.dispositivos (patio_id, android_id_hash);
create index if not exists idx_dispositivos_tenant_status
  on public.dispositivos (tenant_id, status);

-- Invariante forte: no máximo 1 incluso por pátio (entre os não-revogados).
create unique index if not exists uq_dispositivo_incluso_por_patio
  on public.dispositivos (patio_id)
  where licenca = 'incluso' and status <> 'revogado';

-- ============================================================================
-- PASSO 2 — public.dispositivo_licencas (trilha de cobrança)
-- ============================================================================
create table if not exists public.dispositivo_licencas (
  id               uuid primary key default gen_random_uuid(),
  dispositivo_id   uuid not null references public.dispositivos(id) on delete cascade,
  patio_id         uuid not null references public.patios(id) on delete cascade,
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  valor_mensal     numeric(10,2) not null default 39.00,
  origem           text not null check (origem in ('gestor','master','cortesia')),
  concedida_por    text,          -- e-mail/uuid de quem autorizou (auditoria da cobrança)
  vigencia_inicio  timestamptz not null default now(),
  vigencia_fim     timestamptz,
  criado_em        timestamptz not null default now()
);
create index if not exists idx_disp_licencas_tenant_vig
  on public.dispositivo_licencas (tenant_id, vigencia_fim);
create index if not exists idx_disp_licencas_dispositivo
  on public.dispositivo_licencas (dispositivo_id);

-- ============================================================================
-- PASSO 3 — public.dispositivo_acessos (histórico de transições)
-- ATENÇÃO: o heartbeat (60s) NÃO grava aqui — só atualiza dispositivos.ultimo_acesso.
-- Esta tabela registra apenas transições de estado / eventos de login.
-- ============================================================================
create table if not exists public.dispositivo_acessos (
  id               uuid primary key default gen_random_uuid(),
  patio_id         uuid not null references public.patios(id) on delete cascade,
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  dispositivo_id   uuid,          -- join manual, pode ser null (login negado antes de vincular)
  device_uuid      text not null,
  operador_id      uuid,
  evento           text not null check (evento in
                     ('login_ok','login_negado','vinculado','licenciado','revogado',
                      'bloqueado','desbloqueado','reidentificado')),
  motivo           text,          -- 'limite_atingido','bloqueado','assinatura_bloqueada'...
  fabricante       text,
  modelo           text,
  app_versao       text,
  ip               text,
  email_enviado_em timestamptz,   -- anti-duplicação do Resend
  criado_em        timestamptz not null default now()
);
create index if not exists idx_disp_acessos_patio_data
  on public.dispositivo_acessos (patio_id, criado_em desc);
create index if not exists idx_disp_acessos_tenant_data
  on public.dispositivo_acessos (tenant_id, criado_em desc);
create index if not exists idx_disp_acessos_evento
  on public.dispositivo_acessos (evento);

-- ============================================================================
-- PASSO 4 — RLS (padrão idêntico ao db/02: tenant_id = current_tenant_id())
-- ============================================================================
do $$
declare
  t text;
  tabelas text[] := array['dispositivo_licencas','dispositivo_acessos'];
begin
  foreach t in array tabelas loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);

    execute format('drop policy if exists %I on public.%I;', 'tenant_select_'||t, t);
    execute format('drop policy if exists %I on public.%I;', 'tenant_insert_'||t, t);
    execute format('drop policy if exists %I on public.%I;', 'tenant_update_'||t, t);
    execute format('drop policy if exists %I on public.%I;', 'tenant_delete_'||t, t);

    execute format($f$
      create policy %I on public.%I
        for select to authenticated
        using (tenant_id = public.current_tenant_id());
    $f$, 'tenant_select_'||t, t);

    execute format($f$
      create policy %I on public.%I
        for insert to authenticated
        with check (tenant_id = public.current_tenant_id());
    $f$, 'tenant_insert_'||t, t);

    execute format($f$
      create policy %I on public.%I
        for update to authenticated
        using (tenant_id = public.current_tenant_id())
        with check (tenant_id = public.current_tenant_id());
    $f$, 'tenant_update_'||t, t);

    execute format($f$
      create policy %I on public.%I
        for delete to authenticated
        using (tenant_id = public.current_tenant_id());
    $f$, 'tenant_delete_'||t, t);
  end loop;
end $$;

-- ============================================================================
-- PASSO 5 — assinaturas e faturas: preço do dispositivo extra + congelamento
-- ============================================================================
alter table public.assinaturas
  add column if not exists valor_dispositivo_extra numeric(10,2) not null default 39.00;
alter table public.faturas
  add column if not exists qtd_dispositivos_extras int not null default 0;
alter table public.faturas
  add column if not exists valor_dispositivo_extra numeric(10,2) not null default 0;

-- ============================================================================
-- PASSO 6 — funções
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6a) fn_dispositivo_pode_logar — a REGRA DE OURO. Retorna {pode, motivo, acao}.
--     Ordem de avaliação conforme spec.
-- ----------------------------------------------------------------------------
create or replace function public.fn_dispositivo_pode_logar(
  p_patio_id uuid,
  p_device_uuid text
) returns jsonb
language plpgsql stable as $$
declare
  v_tenant  uuid;
  v_disp    record;
  v_incluso boolean;
  v_pend    int;
begin
  -- tenant do pátio
  select tenant_id into v_tenant from public.patios where id = p_patio_id;
  if v_tenant is null then
    return jsonb_build_object('pode', false, 'motivo', 'patio_inexistente', 'acao', 'negar');
  end if;

  -- 1) assinatura libera?
  if not public.fn_assinatura_libera(v_tenant) then
    return jsonb_build_object('pode', false, 'motivo', 'assinatura_bloqueada', 'acao', 'negar');
  end if;

  -- 2) dispositivo existe naquele pátio?
  select id, status into v_disp
    from public.dispositivos
   where patio_id = p_patio_id and device_uuid = p_device_uuid
   limit 1;

  if found then
    if v_disp.status = 'revogado' then
      return jsonb_build_object('pode', false, 'motivo', 'revogado', 'acao', 'negar');
    elsif v_disp.status = 'bloqueado' then
      return jsonb_build_object('pode', false, 'motivo', 'bloqueado', 'acao', 'negar');
    elsif v_disp.status = 'pendente' then
      return jsonb_build_object('pode', false, 'motivo', 'pendente_aprovacao', 'acao', 'negar');
    elsif v_disp.status = 'ativo' then
      return jsonb_build_object('pode', true, 'motivo', 'ok', 'acao', 'permitir');
    end if;
    -- fallback defensivo (status fora do domínio conhecido)
    return jsonb_build_object('pode', false, 'motivo', 'status_desconhecido', 'acao', 'negar');
  end if;

  -- 3) não existe: pátio tem slot incluso livre?
  select exists (
    select 1 from public.dispositivos
     where patio_id = p_patio_id and licenca = 'incluso' and status <> 'revogado'
  ) into v_incluso;

  if not v_incluso then
    return jsonb_build_object('pode', true, 'motivo', 'slot_incluso_livre', 'acao', 'criar_incluso');
  end if;

  -- slot incluso ocupado: entra na fila de pendentes (até 5)
  select count(*) into v_pend
    from public.dispositivos
   where patio_id = p_patio_id and status = 'pendente';

  if v_pend < 5 then
    return jsonb_build_object('pode', false, 'motivo', 'limite_atingido', 'acao', 'criar_pendente');
  else
    return jsonb_build_object('pode', false, 'motivo', 'limite_pendentes', 'acao', 'negar');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 6b) fn_contar_dispositivos_cobraveis — extras que geram cobrança no tenant.
-- ----------------------------------------------------------------------------
create or replace function public.fn_contar_dispositivos_cobraveis(p_tenant uuid)
returns int language sql stable as $$
  select count(*)::int
    from public.dispositivos
   where tenant_id = p_tenant
     and licenca = 'licenciado'
     and status in ('ativo','bloqueado');
$$;

-- ----------------------------------------------------------------------------
-- 6c) fn_gerar_faturas_mes — RECRIA preservando a regra do db/11
--     (estado in ('ativa','atrasada') — trial NÃO é cobrado; tenant ativo).
--     Mudança: valor = (valor_por_patio × pátios ativos)
--                    + (extras cobráveis × valor_dispositivo_extra),
--     gravando qtd_dispositivos_extras e valor_dispositivo_extra CONGELADOS.
-- ----------------------------------------------------------------------------
create or replace function public.fn_gerar_faturas_mes(
  p_competencia date default date_trunc('month', current_date)::date
) returns int language plpgsql as $$
declare
  criadas       int := 0;
  r             record;
  v_qtd         int;
  v_venc        date;
  v_extras      int;
  v_valor_extra numeric(10,2);
  v_valor_total numeric(10,2);
begin
  for r in
    select a.tenant_id,
           a.valor_por_patio,
           a.dia_vencimento,
           coalesce(a.valor_dispositivo_extra, 39.00) as valor_dispositivo_extra
      from public.assinaturas a
      join public.tenants t on t.id = a.tenant_id
     where a.estado in ('ativa','atrasada')   -- exclui trial/suspensa/cancelada
       and t.ativo = true
  loop
    select count(*) into v_qtd
      from public.patios p
     where p.tenant_id = r.tenant_id and p.ativo = true;

    v_extras      := public.fn_contar_dispositivos_cobraveis(r.tenant_id);
    v_valor_extra := coalesce(r.valor_dispositivo_extra, 39.00);

    v_venc := (date_trunc('month', p_competencia)
               + (least(r.dia_vencimento, 28) - 1) * interval '1 day')::date;

    v_valor_total := coalesce(r.valor_por_patio, 0) * v_qtd
                     + v_extras * v_valor_extra;

    insert into public.faturas
      (tenant_id, competencia, vencimento, valor, valor_por_patio, qtd_patios,
       qtd_dispositivos_extras, valor_dispositivo_extra)
    values
      (r.tenant_id,
       date_trunc('month', p_competencia)::date,
       v_venc,
       v_valor_total,
       coalesce(r.valor_por_patio, 0),
       v_qtd,
       v_extras,
       v_valor_extra)
    on conflict (tenant_id, competencia) do nothing;

    if found then
      criadas := criadas + 1;
    end if;
  end loop;

  return criadas;
end $$;

-- ----------------------------------------------------------------------------
-- 6d) fn_purgar_dispositivo_acessos — housekeeping > 90 dias, EXCETO os eventos
--     licenciado/revogado (prova permanente da cobrança).
-- ----------------------------------------------------------------------------
create or replace function public.fn_purgar_dispositivo_acessos()
returns int language plpgsql as $$
declare apagados int;
begin
  delete from public.dispositivo_acessos
   where criado_em < now() - interval '90 days'
     and evento not in ('licenciado','revogado');
  get diagnostics apagados = row_count;
  return apagados;
end $$;

-- ============================================================================
-- PASSO 7 — backfill (idempotente)
-- Por pátio: promove o dispositivo "campeão" a incluso/ativo, revoga os
-- fantasmas de reinstalação (UUID aleatório e morto) e bloqueia o resto.
-- Guarda de idempotência: pula qualquer pátio que JÁ tenha um incluso
-- não-revogado (ou seja, já processado).
-- ============================================================================
do $$
declare
  p          record;
  v_campeao  uuid;
begin
  for p in select distinct patio_id from public.dispositivos loop
    -- já processado? (tem incluso não-revogado) -> pula
    if exists (
      select 1 from public.dispositivos
       where patio_id = p.patio_id and licenca = 'incluso' and status <> 'revogado'
    ) then
      continue;
    end if;

    -- campeão do pátio: acesso mais recente; empate/sem acesso -> criado_em mais recente
    select id into v_campeao
      from public.dispositivos
     where patio_id = p.patio_id
     order by ultimo_acesso desc nulls last, criado_em desc
     limit 1;

    if v_campeao is null then
      continue;  -- defensivo: pátio sem dispositivos (não deveria ocorrer no loop)
    end if;

    -- 1) fantasmas: NÃO campeão e (sem acesso OU acesso < now()-30d) -> revogado
    update public.dispositivos
       set status = 'revogado', licenca = 'nenhuma', revogado_em = now()
     where patio_id = p.patio_id
       and id <> v_campeao
       and (ultimo_acesso is null or ultimo_acesso < now() - interval '30 days');

    -- 2) campeão -> ativo / incluso
    update public.dispositivos
       set status = 'ativo', licenca = 'incluso', vinculado_em = coalesce(criado_em, now())
     where id = v_campeao;

    -- 3) demais restantes (não campeão, não revogado) -> bloqueado
    update public.dispositivos
       set status = 'bloqueado', licenca = 'nenhuma', bloqueado_em = now()
     where patio_id = p.patio_id
       and id <> v_campeao
       and status <> 'revogado'
       and licenca <> 'incluso';

    -- log: revogados deste pátio
    insert into public.dispositivo_acessos
      (patio_id, tenant_id, dispositivo_id, device_uuid, evento, motivo)
    select patio_id, tenant_id, id, device_uuid, 'revogado', 'backfill_licenciamento'
      from public.dispositivos
     where patio_id = p.patio_id and status = 'revogado';

    -- log: bloqueados deste pátio
    insert into public.dispositivo_acessos
      (patio_id, tenant_id, dispositivo_id, device_uuid, evento, motivo)
    select patio_id, tenant_id, id, device_uuid, 'bloqueado', 'backfill_licenciamento'
      from public.dispositivos
     where patio_id = p.patio_id and status = 'bloqueado';
  end loop;
end $$;

-- ============================================================================
-- PASSO 8 — Realtime: card de pendências do dashboard atualiza ao vivo.
--   (dispositivos já foi adicionada à publication no db/24)
-- ============================================================================
do $$
begin
  alter publication supabase_realtime add table public.dispositivo_acessos;
exception when duplicate_object then
  null; -- já adicionada
end $$;

-- ============================================================================
-- PASSO 9 — relatório de conferência (rode À MÃO depois de aplicar)
-- ============================================================================
-- select
--   pt.nome                                                            as patio,
--   count(*)                                                           as total,
--   count(*) filter (where d.status = 'ativo')                         as ativos,
--   count(*) filter (where d.licenca = 'incluso' and d.status <> 'revogado') as inclusos,
--   count(*) filter (where d.licenca = 'licenciado')                   as licenciados,
--   count(*) filter (where d.status = 'bloqueado')                     as bloqueados,
--   count(*) filter (where d.status = 'pendente')                      as pendentes,
--   count(*) filter (where d.status = 'revogado')                      as revogados
-- from public.dispositivos d
-- join public.patios pt on pt.id = d.patio_id
-- group by pt.nome
-- order by pt.nome;

-- ============================================================================
-- Fim da migration 26.
-- ============================================================================
