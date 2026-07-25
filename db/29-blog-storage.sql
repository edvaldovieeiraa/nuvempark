-- ============================================================================
-- NuvemPark — Bucket de imagens do blog (capas dos posts)
-- Projeto: xrwrsswhoywzzhutzrjx · 100% IDEMPOTENTE (rodar 2x sem quebrar).
--
-- Complementa db/28-blog.sql (schema do blog). Rodar DEPOIS dela.
--
-- Modelo de acesso — o mesmo do resto do blog:
--   LEITURA  : pública. O bucket é `public = true`, então
--              /storage/v1/object/public/blog-assets/... serve sem autenticação
--              (capa de post de marketing não é dado sensível).
--   ESCRITA  : NENHUMA policy. Ninguém sobe, troca ou apaga arquivo com a chave
--              anon. O upload acontece SÓ no console master, pelo admin client
--              (service_role, que ignora RLS) — mesma regra da tabela
--              blog_posts em db/28.
--
-- OBS: nº da migration = 29. O 18 pedido no plano já estava ocupado
-- (18-ticket-operador-saida.sql), assim como o 17 na etapa anterior.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Bucket público, 5 MB por arquivo, só formatos de imagem de web.
--    O `do update` mantém a migration idempotente E corrige o bucket caso ele
--    já exista com configuração diferente (ex.: criado à mão pelo painel).
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-assets',
  'blog-assets',
  true,
  5242880,                                                   -- 5 MB
  array['image/jpeg','image/png','image/webp','image/avif','image/gif']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = 5242880,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 2) Policy de LEITURA. Um bucket público já serve o objeto pela URL pública
--    sem passar por policy; esta existe para que `list()` e o download pela
--    API do supabase-js também funcionem com a chave anon — e para deixar a
--    intenção explícita em vez de depender só da flag do bucket.
-- ----------------------------------------------------------------------------
drop policy if exists blog_assets_select_publico on storage.objects;
create policy blog_assets_select_publico on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'blog-assets');

-- ----------------------------------------------------------------------------
-- 3) Sem policy de INSERT/UPDATE/DELETE — de propósito.
--    RLS é fail-closed: quem não tem policy não escreve. Qualquer tentativa de
--    upload com a chave anon (do navegador, por exemplo) é recusada pelo banco,
--    não por validação no código.
--    Se um dia o upload precisar sair do master, crie a policy AQUI e deixe
--    registrado por quê — não afrouxe no cliente.
-- ----------------------------------------------------------------------------

-- Limpa policies de escrita que possam ter sido criadas à mão no painel.
drop policy if exists blog_assets_insert_publico on storage.objects;
drop policy if exists blog_assets_update_publico on storage.objects;
drop policy if exists blog_assets_delete_publico on storage.objects;

-- ============================================================================
-- URL pública resultante (objeto `capas/<uuid>-<nome>.webp`):
--   https://xrwrsswhoywzzhutzrjx.supabase.co/storage/v1/object/public/blog-assets/capas/...
--
-- Esse host já está liberado em web/next.config.ts (images.remotePatterns,
-- restrito a /storage/v1/object/public/**), então as capas passam pelo
-- next/image sem mais nenhuma configuração.
--
-- Conferência rápida:
--   select id, public, file_size_limit from storage.buckets where id = 'blog-assets';
--   select policyname, cmd from pg_policies
--    where schemaname = 'storage' and tablename = 'objects'
--      and policyname like 'blog_assets%';
-- ============================================================================
