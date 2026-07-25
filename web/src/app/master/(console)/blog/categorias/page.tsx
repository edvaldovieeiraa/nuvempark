import { createAdminClient } from "@/lib/supabase/admin";
import {
  BlogTaxonomiaClient,
  type AutorRow,
  type CategoriaRow,
} from "@/components/master/blog-taxonomia-client";

/** CRUD de categorias e autores do blog. Console master, sem cache. */
export const dynamic = "force-dynamic";

export default async function MasterBlogTaxonomiaPage() {
  const sb = createAdminClient();

  const [{ data: categorias }, { data: autores }, { data: posts }] =
    await Promise.all([
      sb
        .from("blog_categorias")
        .select("id, nome, slug, descricao, ordem")
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true }),
      sb
        .from("blog_autores")
        .select("id, nome, bio, avatar_url")
        .order("nome", { ascending: true }),
      // Contagem de uso: o console avisa quantos posts perdem o vínculo antes
      // de alguém excluir uma categoria ou um autor.
      sb.from("blog_posts").select("categoria_id, autor_id"),
    ]);

  const porCategoria = new Map<string, number>();
  const porAutor = new Map<string, number>();
  for (const p of posts ?? []) {
    if (p.categoria_id)
      porCategoria.set(p.categoria_id, (porCategoria.get(p.categoria_id) ?? 0) + 1);
    if (p.autor_id)
      porAutor.set(p.autor_id, (porAutor.get(p.autor_id) ?? 0) + 1);
  }

  const linhasCategorias: CategoriaRow[] = (categorias ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    slug: c.slug,
    descricao: c.descricao,
    ordem: c.ordem,
    posts: porCategoria.get(c.id) ?? 0,
  }));

  const linhasAutores: AutorRow[] = (autores ?? []).map((a) => ({
    id: a.id,
    nome: a.nome,
    bio: a.bio,
    avatarUrl: a.avatar_url,
    posts: porAutor.get(a.id) ?? 0,
  }));

  return (
    <BlogTaxonomiaClient
      categorias={linhasCategorias}
      autores={linhasAutores}
    />
  );
}
