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

/** Páginas 2, 3, … de uma categoria. Mesma regra da paginação da home. */
export const revalidate = 300;

/** Vazia: liga o ISR sem depender do Supabase no build (ver /blog/[slug]). */
export function generateStaticParams(): { slug: string; n: string }[] {
  return [];
}

type Props = { params: Promise<{ slug: string; n: string }> };

function paginaValida(bruto: string): number | null {
  if (!/^[1-9]\d*$/.test(bruto)) return null;
  const n = Number(bruto);
  return Number.isSafeInteger(n) ? n : null;
}

export default async function CategoriaPaginaPage({ params }: Props) {
  const { slug, n } = await params;
  const pagina = paginaValida(n);
  if (!pagina || pagina === 1) notFound(); // página 1 é a rota sem /pagina

  const categoria = await obterCategoriaPorSlug(slug);
  if (!categoria) notFound();

  const [categorias, listagem] = await Promise.all([
    listarCategorias(),
    listarPosts({ pagina, porPagina: POSTS_POR_PAGINA, categoriaId: categoria.id }),
  ]);

  // Página fora do intervalo é 404 (ver /blog/pagina/[n]).
  if (pagina > listagem.totalPaginas) notFound();

  const base = `/blog/categoria/${categoria.slug}`;

  return (
    <div className="pt-16">
      <CabecalhoBlog
        chip={`${categoria.nome} · página ${pagina}`}
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
          />
        </div>
      </div>
    </div>
  );
}
