import type { Metadata } from "next";
import { Reveal } from "@/components/site/reveal";
import { CtaFinal } from "@/components/site/secoes";
import { CabecalhoBlog } from "@/components/blog/cabecalho";
import { JsonLd } from "@/components/blog/jsonld";
import { ListaPosts } from "@/components/blog/listagem";
import { PilulasCategoria } from "@/components/blog/navegacao";
import { PostDestaque } from "@/components/blog/post-card";
import {
  listarCategorias,
  listarPosts,
  obterPostDestaque,
  POSTS_POR_PAGINA,
} from "@/lib/blog";
import { schemaBlog, schemaOrganizacaoRaiz } from "@/lib/blog-seo";
import { urlSite } from "@/lib/urls";

/**
 * Home do blog. ISR de 5 minutos: o conteúdo é público e igual para todo
 * mundo, então a página é pré-renderizada e revalidada — pelo tempo ou pelo
 * POST /api/blog/revalidate que o console master dispara ao publicar.
 *
 * Nada aqui lê `cookies()` nem `searchParams`: é o que mantém a rota estática.
 * A paginação vive em /blog/pagina/[n] e a busca em /blog/busca justamente
 * para não arrastar esta página para renderização dinâmica.
 */
export const revalidate = 300;

const TITULO = "Blog NuvemPark — gestão de estacionamento na prática";
const DESCRICAO =
  "Guias práticos de gestão de estacionamento: controle de caixa, tarifas, leitura de placa, Pix e faturamento em tempo real.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: {
    canonical: urlSite("/blog"),
    types: { "application/rss+xml": urlSite("/blog/rss.xml") },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "NuvemPark",
    url: urlSite("/blog"),
    title: TITULO,
    description: DESCRICAO,
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRICAO,
  },
};

export default async function BlogHomePage() {
  const [destaque, categorias, listagem] = await Promise.all([
    obterPostDestaque(),
    listarCategorias(),
    listarPosts({ pagina: 1, porPagina: POSTS_POR_PAGINA }),
  ]);

  // O post em destaque já aparece no herói — tirá-lo da grade evita repetição.
  // A contagem total da paginação continua sendo a real (o post existe e ocupa
  // uma vaga), então a página 1 mostra um card a menos que as seguintes.
  const daGrade = listagem.posts.filter((p) => p.slug !== destaque?.slug);

  return (
    <div className="pt-16">

      <CabecalhoBlog
        chip="Blog"
        titulo={
          <>
            O que a gente aprende
            <br className="hidden sm:block" /> operando pátios de verdade
          </>
        }
        descricao={DESCRICAO}
      />

      <div className="mx-auto max-w-6xl px-5 py-14">
        <PilulasCategoria categorias={categorias} />

        {destaque ? (
          <Reveal className="mt-8 block">
            <PostDestaque post={destaque} />
          </Reveal>
        ) : null}

        <div className="mt-12">
          <h2 className="mb-6 text-xl font-black tracking-tight text-texto">
            Últimos artigos
          </h2>
          <ListaPosts
            posts={daGrade}
            pagina={listagem.pagina}
            totalPaginas={listagem.totalPaginas}
            base="/blog"
          />
        </div>
      </div>

      <CtaFinal />

      <JsonLd dados={schemaOrganizacaoRaiz()} />
      <JsonLd dados={schemaBlog(listagem.posts)} />
    </div>
  );
}
