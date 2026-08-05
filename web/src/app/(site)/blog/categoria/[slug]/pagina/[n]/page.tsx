import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CabecalhoBlog } from "@/components/blog/cabecalho";
import { JsonLd } from "@/components/jsonld";
import { ListaPosts } from "@/components/blog/listagem";
import { PilulasCategoria } from "@/components/blog/navegacao";
import { CapturaEmail } from "@/components/blog/newsletter";
import {
  listarCategorias,
  listarPosts,
  obterCategoriaPorSlug,
  POSTS_POR_PAGINA,
} from "@/lib/blog";
import { schemaColecao, schemaMigalhas } from "@/lib/blog-seo";
import { IMAGEM_SOCIAL } from "@/lib/og";
import { urlSite } from "@/lib/urls";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, n } = await params;
  const pagina = paginaValida(n);
  const categoria = await obterCategoriaPorSlug(slug);
  if (!categoria || !pagina) {
    return { title: "Página não encontrada | Blog NuvemPark" };
  }

  const titulo = `${categoria.nome} — página ${pagina} | Blog NuvemPark`;
  const descricao =
    categoria.descricao ??
    `Artigos de ${categoria.nome.toLowerCase()} no blog do NuvemPark.`;
  const url = urlSite(`/blog/categoria/${categoria.slug}/pagina/${pagina}`);

  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "NuvemPark",
      url,
      title: titulo,
      description: descricao,
      // Repetida porque `openGraph` substitui a do layout raiz inteira.
      images: [IMAGEM_SOCIAL],
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
      images: [IMAGEM_SOCIAL.url],
    },
  };
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
    <div>
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

        <div className="mt-16">
          <CapturaEmail />
        </div>
      </div>

      <JsonLd
        dados={schemaMigalhas([
          { nome: "Início", caminho: "/" },
          { nome: "Blog", caminho: "/blog" },
          { nome: categoria.nome, caminho: base },
          { nome: `Página ${pagina}`, caminho: `${base}/pagina/${pagina}` },
        ])}
      />
      <JsonLd
        dados={schemaColecao({
          nome: `${categoria.nome} — página ${pagina}`,
          descricao:
            categoria.descricao ?? `Artigos de ${categoria.nome} no blog do NuvemPark.`,
          caminho: `${base}/pagina/${pagina}`,
          posts: listagem.posts,
        })}
      />
    </div>
  );
}
