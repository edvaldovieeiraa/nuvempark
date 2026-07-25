import { createAdminClient } from "@/lib/supabase/admin";
import {
  BlogPostsClient,
  type CategoriaOpcao,
  type PostRow,
} from "@/components/master/blog-posts-client";

/**
 * Listagem de posts do blog no console master.
 *
 * `force-dynamic` como o resto do /master: o console mostra o estado do banco
 * AGORA (inclusive rascunhos), sem cache. Quem tem ISR é o blog público.
 */
export const dynamic = "force-dynamic";

type LinhaCrua = {
  id: string;
  slug: string;
  titulo: string;
  status: string;
  destaque: boolean;
  publicado_em: string | null;
  atualizado_em: string;
  categoria_id: string | null;
  autor_id: string | null;
};

export default async function MasterBlogPage() {
  const sb = createAdminClient();

  const [{ data: posts }, { data: categorias }, { data: autores }] =
    await Promise.all([
      sb
        .from("blog_posts")
        .select(
          "id, slug, titulo, status, destaque, publicado_em, atualizado_em, categoria_id, autor_id",
        )
        // Rascunho novo ainda não tem publicado_em: ordenar por atualizado_em
        // mantém "no que eu mexi por último" no topo, que é o que o editor quer.
        .order("atualizado_em", { ascending: false }),
      sb
        .from("blog_categorias")
        .select("id, nome, slug, ordem")
        .order("ordem", { ascending: true }),
      sb.from("blog_autores").select("id, nome"),
    ]);

  const nomeCategoria = new Map<string, string>();
  const opcoes: CategoriaOpcao[] = [];
  for (const c of categorias ?? []) {
    nomeCategoria.set(c.id, c.nome);
    opcoes.push({ id: c.id, nome: c.nome, slug: c.slug });
  }

  const nomeAutor = new Map<string, string>();
  for (const a of autores ?? []) nomeAutor.set(a.id, a.nome);

  const linhas: PostRow[] = ((posts ?? []) as LinhaCrua[]).map((p) => ({
    id: p.id,
    slug: p.slug,
    titulo: p.titulo,
    status: p.status,
    destaque: p.destaque,
    publicadoEm: p.publicado_em,
    atualizadoEm: p.atualizado_em,
    categoriaId: p.categoria_id,
    categoriaNome: p.categoria_id
      ? (nomeCategoria.get(p.categoria_id) ?? null)
      : null,
    autorNome: p.autor_id ? (nomeAutor.get(p.autor_id) ?? null) : null,
  }));

  return <BlogPostsClient posts={linhas} categorias={opcoes} />;
}
