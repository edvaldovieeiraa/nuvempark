-- ============================================================================
-- NuvemPark — Bucket público para distribuição do APK do app do operador
-- Projeto: xrwrsswhoywzzhutzrjx · Idempotente.
--
-- A página /painel/download aponta o botão de baixar para a URL pública deste
-- bucket. Bucket PÚBLICO: o endpoint /storage/v1/object/public/... serve o
-- arquivo sem autenticação (um APK de instalação não é dado sensível), e sem
-- precisar de policy de RLS em storage.objects.
--
-- Depois de aplicar: suba o APK pelo painel do Supabase (Storage → downloads)
-- com o nome EXATO `nuvempark.apk` — é o nome que a página espera.
-- ============================================================================

-- file_size_limit folgado (200 MB) para o APK nunca esbarrar no limite padrão
-- do projeto (50 MB) no upload pelo painel.
insert into storage.buckets (id, name, public, file_size_limit)
values ('downloads', 'downloads', true, 209715200)
on conflict (id) do update
  set public = true,
      file_size_limit = greatest(coalesce(storage.buckets.file_size_limit, 0), 209715200);

-- ============================================================================
-- URL pública resultante (com o objeto `nuvempark.apk`):
--   https://xrwrsswhoywzzhutzrjx.supabase.co/storage/v1/object/public/downloads/nuvempark.apk
-- Fim.
-- ============================================================================
