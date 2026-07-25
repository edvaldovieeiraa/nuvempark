import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CabecalhoBlog } from "@/components/blog/cabecalho";
import { JsonLd } from "@/components/blog/jsonld";
import { ListaPosts } from "@/components/blog/listagem";
import { PilulasCategoria } from "@/components/blog/navegacao";
import { listarCategorias, listarPosts, POSTS_POR_PAGINA } from "@/lib/blog";
import { schemaColecao, schemaMigalhas } from "@/lib/blog-seo";
import { urlSite } from "@/lib/urls";

/**
 * Páginas 2, 3, … da home do blog.
 *
 * Paginação por caminho (e não por `?pagina=2`) de propósito: cada página tem
 * URL indexável, canonical próprio e continua estática com ISR. Ler
 * `searchParams` jogaria a listagem inteira para render dinâmico.
 */
export const revalidate = 300;

/** Vazia: liga o ISR sem depender do Supabase no build (ver /blog/[slug]). */
export function generateStaticParams(): { n: string }[] {
  return [];
}

type Props = { params: Promise<{ n: string }> };

/** Aceita só inteiro positivo sem zero à esquerda — "01" e "2x" caem no 404. */
function paginaValida(bruto: string): number | null {
  if (!/^[1-9]\d*$/.test(bruto)) return null;
  const n = Number(bruto);
  return Number.isSafeInteger(n) ? n : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { n } = await params;
  const pagina = paginaValida(n);
  if (!pagina) return { title: "Página não encontrada | Blog NuvemPark" };

  const titulo = `Blog NuvemPark — página ${pagina}`;
  const descricao = `Artigos sobre gestão de estacionamento, tecnologia de pátio e controle financeiro — página ${pagina}.`;

  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: urlSite(`/blog/pagina/${pagina}`) },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "NuvemPark",
      url: urlSite(`/blog/pagina/${pagina}`),
      title: titulo,
      description: descricao,
    },
    twitter: { card: "summary_large_image", title: titulo, description: descricao },
  };
}

export default async function BlogPaginaPage({ params }: Props) {
  const { n } = await params;
  const pagina = paginaValida(n);
  // A página 1 é /blog: manter as duas vivas criaria conteúdo duplicado.
  if (!pagina || pagina === 1) notFound();

  const [categorias, listagem] = await Promise.all([
    listarCategorias(),
    listarPosts({ pagina, porPagina: POSTS_POR_PAGINA }),
  ]);

  // Página fora do intervalo é 404, não uma listagem vazia com status 200 —
  // senão /blog/pagina/999 vira conteúdo indexável e sem conteúdo.
  if (pagina > listagem.totalPaginas) notFound();

  return (
    <div className="pt-16">
      <CabecalhoBlog
        chip={`Página ${pagina}`}
        titulo="Todos os artigos"
        descricao="Gestão de estacionamento, tecnologia de pátio e controle financeiro — do começo ao fim do arquivo."
      />

      <div className="mx-auto max-w-6xl px-5 py-14">
        <PilulasCategoria categorias={categorias} />

        <div className="mt-10">
          <ListaPosts
            posts={listagem.posts}
            pagina={listagem.pagina}
            totalPaginas={listagem.totalPaginas}
            base="/blog"
          />
        </div>
      </div>

      <JsonLd
        dados={schemaMigalhas([
          { nome: "Início", caminho: "/" },
          { nome: "Blog", caminho: "/blog" },
          { nome: `Página ${pagina}`, caminho: `/blog/pagina/${pagina}` },
        ])}
      />
      <JsonLd
        dados={schemaColecao({
          nome: `Blog NuvemPark — página ${pagina}`,
          descricao: "Artigos sobre gestão de estacionamento.",
          caminho: `/blog/pagina/${pagina}`,
          posts: listagem.posts,
        })}
      />
    </div>
  );
}
