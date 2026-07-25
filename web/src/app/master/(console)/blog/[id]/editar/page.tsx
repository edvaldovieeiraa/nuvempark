import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BlogEditorClient,
  type OpcaoSimples,
  type PostInicial,
} from "@/components/master/blog-editor-client";
import { normalizarFaq, type PostCruMaster } from "@/lib/blog-master";

/** Edição de post. Mesma tela do /novo, com os campos preenchidos. */
export const dynamic = "force-dynamic";

export default async function EditarPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = createAdminClient();

  const [{ data: post }, { data: categorias }, { data: autores }] =
    await Promise.all([
      sb
        .from("blog_posts")
        .select(
          "id, titulo, slug, resumo, conteudo_md, capa_url, categoria_id, autor_id, destaque, faq, seo_titulo, palavras_chave, status, publicado_em",
        )
        .eq("id", id)
        .maybeSingle<PostCruMaster>(),
      sb.from("blog_categorias").select("id, nome").order("ordem"),
      sb.from("blog_autores").select("id, nome").order("nome"),
    ]);

  if (!post) notFound();

  const inicial: PostInicial = {
    id: post.id,
    titulo: post.titulo,
    slug: post.slug,
    resumo: post.resumo,
    conteudoMd: post.conteudo_md,
    capaUrl: post.capa_url,
    categoriaId: post.categoria_id,
    autorId: post.autor_id,
    destaque: post.destaque,
    faq: normalizarFaq(post.faq),
    seoTitulo: post.seo_titulo,
    palavrasChave: post.palavras_chave ?? [],
    status: post.status,
    publicadoEm: post.publicado_em,
  };

  return (
    <BlogEditorClient
      inicial={inicial}
      categorias={(categorias ?? []) as OpcaoSimples[]}
      autores={(autores ?? []) as OpcaoSimples[]}
    />
  );
}
