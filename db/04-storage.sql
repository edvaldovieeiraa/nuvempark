-- ============================================================================
-- ParkFlow — Fase 1: Storage (bucket privado de fotos de entrada)
-- Rodar no SQL Editor do projeto xrwrsswhoywzzhutzrjx.
-- Idempotente.
-- ============================================================================

-- Bucket privado. Caminho dos objetos: <patio_id>/<ticket_id>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('parkflow-entradas', 'parkflow-entradas', false, 6291456,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- Policies: acesso só ao próprio tenant.
-- O caminho começa com <patio_id>/... e o cliente tenant-scoped (JWT com tenant_id)
-- só enxerga pátios do seu tenant. Amarramos a policy ao tenant via join em patios.
-- ----------------------------------------------------------------------------

drop policy if exists parkflow_entradas_select on storage.objects;
drop policy if exists parkflow_entradas_insert on storage.objects;
drop policy if exists parkflow_entradas_update on storage.objects;
drop policy if exists parkflow_entradas_delete on storage.objects;

-- Helper local: extrai o patio_id (primeiro segmento do path) e confirma que
-- pertence ao tenant do JWT atual.
create or replace function public.fn_storage_patio_do_tenant(objeto_name text)
returns boolean language sql stable as $$
  select exists (
    select 1
    from public.patios p
    where p.id = split_part(objeto_name, '/', 1)::uuid
      and p.tenant_id = public.current_tenant_id()
  )
$$;

create policy parkflow_entradas_select on storage.objects
  for select to authenticated
  using (bucket_id = 'parkflow-entradas'
         and public.fn_storage_patio_do_tenant(name));

create policy parkflow_entradas_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'parkflow-entradas'
              and public.fn_storage_patio_do_tenant(name));

create policy parkflow_entradas_update on storage.objects
  for update to authenticated
  using (bucket_id = 'parkflow-entradas'
         and public.fn_storage_patio_do_tenant(name))
  with check (bucket_id = 'parkflow-entradas'
              and public.fn_storage_patio_do_tenant(name));

create policy parkflow_entradas_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'parkflow-entradas'
         and public.fn_storage_patio_do_tenant(name));

-- ============================================================================
-- Fim.
-- ============================================================================
