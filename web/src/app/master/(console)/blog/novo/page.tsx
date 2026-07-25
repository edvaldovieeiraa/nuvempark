import { createAdminClient } from "@/lib/supabase/admin";
import {
  BlogEditorClient,
  type OpcaoSimples,
} from "@/components/master/blog-editor-client";

/** Criação de post. Mesma tela do editar, só sem `inicial`. */
export const dynamic = "force-dynamic";

export default async function NovoPostPage() {
  const sb = createAdminClient();

  const [{ data: categorias }, { data: autores }] = await Promise.all([
    sb.from("blog_categorias").select("id, nome").order("ordem"),
    sb.from("blog_autores").select("id, nome").order("nome"),
  ]);

  return (
    <BlogEditorClient
      inicial={null}
      categorias={(categorias ?? []) as OpcaoSimples[]}
      autores={(autores ?? []) as OpcaoSimples[]}
    />
  );
}
