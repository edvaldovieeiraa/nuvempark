-- ============================================================================
-- NuvemPark — Bucket de fotos: nuvempark-entradas
-- (marca do produto mudou de ParkFlow para NuvemPark, 2026-07-09).
-- Rodar no SQL Editor do projeto xrwrsswhoywzzhutzrjx.
--
-- ⚠️ NÃO inclui delete do bucket antigo 'parkflow-entradas': o Supabase bloqueia
--    delete direto em storage.* por SQL (storage.protect_delete). Se quiser
--    remover o bucket antigo (está vazio, inofensivo), use a UI:
--    Storage → parkflow-entradas → Delete bucket.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nuvempark-entradas', 'nuvempark-entradas', false, 6291456,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists nuvempark_entradas_select on storage.objects;
drop policy if exists nuvempark_entradas_insert on storage.objects;
drop policy if exists nuvempark_entradas_update on storage.objects;
drop policy if exists nuvempark_entradas_delete on storage.objects;

create policy nuvempark_entradas_select on storage.objects
  for select to authenticated
  using (bucket_id = 'nuvempark-entradas' and public.fn_storage_patio_do_tenant(name));

create policy nuvempark_entradas_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'nuvempark-entradas' and public.fn_storage_patio_do_tenant(name));

create policy nuvempark_entradas_update on storage.objects
  for update to authenticated
  using (bucket_id = 'nuvempark-entradas' and public.fn_storage_patio_do_tenant(name))
  with check (bucket_id = 'nuvempark-entradas' and public.fn_storage_patio_do_tenant(name));

create policy nuvempark_entradas_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'nuvempark-entradas' and public.fn_storage_patio_do_tenant(name));

-- ============================================================================
-- Fim. (Remover o bucket antigo parkflow-entradas = pela UI de Storage.)
-- ============================================================================
