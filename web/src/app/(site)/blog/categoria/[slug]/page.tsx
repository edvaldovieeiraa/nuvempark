import { notFound } from "next/navigation";
import { CabecalhoBlog } from "@/components/blog/cabecalho";
import { ListaPosts } from "@/components/blog/listagem";
import { PilulasCategoria } from "@/components/blog/navegacao";
import {
  listarCategorias,
  listarPosts,
  obterCategoriaPorSlug,
  POSTS_POR_PAGINA,
} from "@/lib/blog";

/** Listagem filtrada por categoria (página 1). ISR de 5 minutos. */
export const revalidate = 300;

/** Vazia: liga o ISR sem depender do Supabase no build (ver /blog/[slug]). */
export function generateStaticParams(): { slug: string }[] {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export default async function CategoriaPage({ params }: Props) {
  const { slug } = await params;
  const categoria = await obterCategoriaPorSlug(slug);
  if (!categoria) notFound();

  const [categorias, listagem] = await Promise.all([
    listarCategorias(),
    listarPosts({
      pagina: 1,
      porPagina: POSTS_POR_PAGINA,
      categoriaId: categoria.id,
    }),
  ]);

  const base = `/blog/categoria/${categoria.slug}`;

  return (
    <div className="pt-16">
      <CabecalhoBlog
        chip="Categoria"
        titulo={categoria.nome}
        descricao={
          categoria.descricao ??
          `Tudo o que publicamos sobre ${categoria.nome.toLowerCase()}.`
        }
        mostrarBusca={false}
      />

      <div className="mx-auto max-w-6xl px-5 py-14">
        <PilulasCategoria categorias={categorias} ativa={categoria.slug} />

        <div className="mt-10">
          <ListaPosts
            posts={listagem.posts}
            pagina={listagem.pagina}
            totalPaginas={listagem.totalPaginas}
            base={base}
            vazio={{
              titulo: `Ainda não há artigos em ${categoria.nome}`,
              descricao:
                "Esta categoria acabou de nascer. Enquanto isso, veja o que já publicamos nas outras.",
            }}
          />
        </div>
      </div>
    </div>
  );
}
