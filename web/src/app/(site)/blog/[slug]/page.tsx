import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { Marca } from "@/components/marca";
import { CtaFimDePost, CtaInline } from "@/components/blog/cta";
import { FaqPost } from "@/components/blog/faq";
import { JsonLd } from "@/components/blog/jsonld";
import { ConteudoMarkdown, dividirMarkdown } from "@/components/blog/markdown";
import { CapturaEmail } from "@/components/blog/newsletter";
import { PostCard } from "@/components/blog/post-card";
import { ProgressoLeitura } from "@/components/blog/progresso-leitura";
import { Compartilhar } from "@/components/blog/share";
import { obterPostPorSlug, postsRelacionados } from "@/lib/blog";
import { dataAtributo, dataLonga, dataRelativa } from "@/lib/blog-datas";
import {
  imagemSocialDoPost,
  schemaArtigo,
  schemaFaq,
  schemaMigalhas,
} from "@/lib/blog-seo";
import { urlSite } from "@/lib/urls";

/**
 * Página do post.
 *
 * Slugs reservados: `categoria`, `pagina`, `busca` e `rss.xml` são rotas
 * estáticas irmãs e vencem esta dinâmica — um post não pode usar esses slugs.
 */
export const revalidate = 300;

/**
 * Lista VAZIA de propósito. É o que coloca a rota em modo ISR sem prerenderizar
 * nada no build: o Next gera cada post na primeira visita e guarda no cache
 * (revalidando a cada 5 min ou no POST /api/blog/revalidate).
 *
 * Buscar os slugs reais aqui obrigaria a máquina de build a alcançar o
 * Supabase — a mesma armadilha que já derrubou o deploy com as fontes do
 * Google (ver comentário no layout raiz). Sem esta função a rota cairia em
 * render dinâmico a cada requisição, sem cache nenhum.
 */
export function generateStaticParams(): { slug: string }[] {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await obterPostPorSlug(slug);
  if (!post) return { title: "Artigo não encontrado | Blog NuvemPark" };

  const titulo = `${post.seo_titulo ?? post.titulo} | Blog NuvemPark`;
  const url = urlSite(`/blog/${post.slug}`);
  const imagem = imagemSocialDoPost(post);

  return {
    title: titulo,
    description: post.resumo,
    ...(post.palavras_chave.length > 0 ? { keywords: post.palavras_chave } : {}),
    authors: [{ name: post.autor?.nome ?? "Equipe NuvemPark" }],
    alternates: {
      canonical: url,
      types: { "application/rss+xml": urlSite("/blog/rss.xml") },
    },
    openGraph: {
      type: "article",
      locale: "pt_BR",
      siteName: "NuvemPark",
      url,
      title: titulo,
      description: post.resumo,
      publishedTime: post.publicado_em,
      modifiedTime: post.atualizado_em,
      authors: [post.autor?.nome ?? "Equipe NuvemPark"],
      section: post.categoria?.nome,
      tags: post.palavras_chave,
      images: [{ url: imagem, width: 1200, height: 630, alt: post.titulo }],
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: post.resumo,
      images: [imagem],
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await obterPostPorSlug(slug);
  if (!post) notFound();

  const relacionados = await postsRelacionados(post, 3);
  const url = urlSite(`/blog/${post.slug}`);
  const partes = dividirMarkdown(post.conteudo_md);
  const faqSchema = schemaFaq(post.faq);

  return (
    <div className="pt-16">
      <ProgressoLeitura />

      <article>
        {/* ── Cabeçalho ───────────────────────────────────────────────── */}
        <header className="fundo-mesh border-b border-borda pt-10 pb-12">
          <div className="mx-auto max-w-3xl px-5">
            <nav aria-label="Você está aqui">
              <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-texto-3">
                <li>
                  <Link href="/" className="transition-colors hover:text-brand-700">
                    Início
                  </Link>
                </li>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                <li>
                  <Link href="/blog" className="transition-colors hover:text-brand-700">
                    Blog
                  </Link>
                </li>
                {post.categoria ? (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    <li>
                      <Link
                        href={`/blog/categoria/${post.categoria.slug}`}
                        className="transition-colors hover:text-brand-700"
                      >
                        {post.categoria.nome}
                      </Link>
                    </li>
                  </>
                ) : null}
              </ol>
            </nav>

            <h1 className="mt-5 text-3xl leading-[1.12] font-black tracking-tight text-texto sm:text-[2.75rem]">
              {post.titulo}
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-texto-2">
              {post.resumo}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3">
              <div className="flex items-center gap-2.5">
                {post.autor?.avatar_url ? (
                  <Image
                    src={post.autor.avatar_url}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full border border-borda object-cover"
                  />
                ) : (
                  <span
                    className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700"
                    aria-hidden
                  >
                    <Marca className="h-4.5 w-4.5" corP="#065F46" />
                  </span>
                )}
                <span className="text-sm font-bold text-texto">
                  {post.autor?.nome ?? "Equipe NuvemPark"}
                </span>
              </div>

              <span className="h-4 w-px bg-borda" aria-hidden />

              <time
                dateTime={dataAtributo(post.publicado_em)}
                className="text-sm text-texto-2"
                title={dataLonga(post.publicado_em)}
              >
                {dataRelativa(post.publicado_em)}
              </time>

              <span className="h-4 w-px bg-borda" aria-hidden />

              <span className="inline-flex items-center gap-1.5 text-sm text-texto-2">
                <Clock className="h-4 w-4" aria-hidden />
                {post.minutosLeitura} min de leitura
              </span>
            </div>
          </div>
        </header>

        {/* ── Capa ────────────────────────────────────────────────────── */}
        {post.capa_url ? (
          <div className="mx-auto max-w-4xl px-5 pt-10">
            {/* Proporção fixa + `priority`: é a maior imagem da dobra (LCP) e
                não pode empurrar o texto ao carregar (CLS). */}
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-borda bg-fundo">
              <Image
                src={post.capa_url}
                alt={post.titulo}
                fill
                priority
                sizes="(max-width: 896px) 100vw, 896px"
                className="object-cover"
              />
            </div>
          </div>
        ) : null}

        {/* ── Conteúdo ────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-3xl px-5 pt-10 pb-16">
          {partes ? (
            <>
              <ConteudoMarkdown markdown={partes[0]} />
              <CtaInline />
              <ConteudoMarkdown markdown={partes[1]} />
            </>
          ) : (
            <ConteudoMarkdown markdown={post.conteudo_md} />
          )}

          <div className="mt-12 border-t border-borda pt-6">
            <Compartilhar url={url} titulo={post.titulo} />
          </div>

          <FaqPost itens={post.faq} />

          <CtaFimDePost />

          <div className="mt-12">
            <CapturaEmail compacto />
          </div>
        </div>
      </article>

      {/* ── Relacionados ──────────────────────────────────────────────── */}
      {relacionados.length > 0 ? (
        <section
          aria-labelledby="relacionados-titulo"
          className="border-t border-borda bg-fundo py-16"
        >
          <div className="mx-auto max-w-6xl px-5">
            <h2
              id="relacionados-titulo"
              className="text-xl font-black tracking-tight text-texto"
            >
              Continue lendo
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relacionados.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.08} className="h-full">
                  <PostCard post={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <JsonLd dados={schemaArtigo(post)} />
      <JsonLd
        dados={schemaMigalhas([
          { nome: "Início", caminho: "/" },
          { nome: "Blog", caminho: "/blog" },
          ...(post.categoria
            ? [
                {
                  nome: post.categoria.nome,
                  caminho: `/blog/categoria/${post.categoria.slug}`,
                },
              ]
            : []),
          { nome: post.titulo, caminho: `/blog/${post.slug}` },
        ])}
      />
      {faqSchema ? <JsonLd dados={faqSchema} /> : null}
    </div>
  );
}
