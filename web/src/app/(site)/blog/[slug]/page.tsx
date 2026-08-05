import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, List } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { Marca } from "@/components/marca";
import { CtaFimDePost, CtaInline } from "@/components/blog/cta";
import { FaqPost } from "@/components/blog/faq";
import { JsonLd } from "@/components/jsonld";
import {
  ConteudoMarkdown,
  dividirMarkdown,
  extrairTitulos,
} from "@/components/blog/markdown";
import { CapturaEmail } from "@/components/blog/newsletter";
import { PostCard } from "@/components/blog/post-card";
import { ProgressoLeitura } from "@/components/blog/progresso-leitura";
import { Compartilhar } from "@/components/blog/share";
import { SolucoesRelacionadas } from "@/components/blog/solucoes-relacionadas";
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

  // Sumário só quando há navegação de verdade: 1 título não é um índice.
  const titulos = extrairTitulos(post.conteudo_md).slice(0, 12);
  const temSumario = titulos.length >= 2;

  return (
    <div>
      <ProgressoLeitura />

      <article>
        {/* ── Cabeçalho — faixa escura editorial, sobe até o topo (o header
            fixo flutua transparente por cima; site-header trata /blog como
            rota escura). ─────────────────────────────────────────────── */}
        <header
          className="relative overflow-hidden pt-28 pb-12 sm:pt-32"
          style={{
            background:
              "linear-gradient(165deg, #0B1220 0%, #10201A 55%, #0B1512 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage:
                "radial-gradient(ellipse 75% 70% at 50% 10%, black 30%, transparent 75%)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-brand-500/15 blur-3xl"
            aria-hidden
          />

          <div className="relative mx-auto max-w-3xl px-5">
            <nav aria-label="Você está aqui">
              <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-white/50">
                <li>
                  <Link href="/" className="transition-colors hover:text-brand-300">
                    Início
                  </Link>
                </li>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                <li>
                  <Link href="/blog" className="transition-colors hover:text-brand-300">
                    Blog
                  </Link>
                </li>
                {post.categoria ? (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    <li>
                      <Link
                        href={`/blog/categoria/${post.categoria.slug}`}
                        className="transition-colors hover:text-brand-300"
                      >
                        {post.categoria.nome}
                      </Link>
                    </li>
                  </>
                ) : null}
              </ol>
            </nav>

            <h1 className="mt-5 text-3xl leading-[1.12] font-black tracking-tight text-white sm:text-[2.75rem]">
              {post.titulo}
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-white/70">
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
                    className="h-9 w-9 rounded-full border border-white/20 object-cover"
                  />
                ) : (
                  <span
                    className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700"
                    aria-hidden
                  >
                    <Marca className="h-4.5 w-4.5" corP="#065F46" />
                  </span>
                )}
                <span className="text-sm font-bold text-white">
                  {post.autor?.nome ?? "Equipe NuvemPark"}
                </span>
              </div>

              <span className="h-4 w-px bg-white/15" aria-hidden />

              <time
                dateTime={dataAtributo(post.publicado_em)}
                className="text-sm text-white/60"
                title={dataLonga(post.publicado_em)}
              >
                {dataRelativa(post.publicado_em)}
              </time>

              <span className="h-4 w-px bg-white/15" aria-hidden />

              <span className="inline-flex items-center gap-1.5 text-sm text-white/60">
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

        {/* ── Conteúdo + sumário ─────────────────────────────────────── */}
        <div
          className={`mx-auto px-5 pt-10 pb-16 ${
            temSumario
              ? "max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-12"
              : "max-w-3xl"
          }`}
        >
          <div className={temSumario ? "mx-auto w-full max-w-3xl lg:mx-0" : ""}>
            {/* Sumário mobile: acordeão fechado, não rouba a dobra do texto. */}
            {temSumario ? (
              <details className="group mb-8 overflow-hidden rounded-2xl border border-borda bg-fundo/60 lg:hidden">
                <summary className="flex cursor-pointer list-none items-center gap-2.5 px-5 py-3.5 text-sm font-bold text-texto marker:content-none [&::-webkit-details-marker]:hidden">
                  <List className="h-4 w-4 text-brand-600" aria-hidden />
                  Neste artigo
                </summary>
                <ol className="space-y-1 px-5 pt-0 pb-4">
                  {titulos.map((t) => (
                    <li key={t.id}>
                      <a
                        href={`#${t.id}`}
                        className="block rounded-lg px-2 py-1.5 text-[13px] font-semibold text-texto-2 transition-colors hover:bg-superficie hover:text-brand-700"
                      >
                        {t.texto}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}

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

            <SolucoesRelacionadas />

            <CtaFimDePost />

            <div className="mt-12">
              <CapturaEmail compacto />
            </div>
          </div>

          {/* Sumário desktop: fixo na rolagem, com share junto — os dois
              pontos de ação ficam sempre à vista sem interromper a leitura. */}
          {temSumario ? (
            <aside className="hidden lg:block" aria-label="Sumário do artigo">
              <div className="sticky top-24 space-y-5">
                <nav className="rounded-2xl border border-borda bg-superficie p-5">
                  <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.14em] text-texto-3 uppercase">
                    <List className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                    Neste artigo
                  </p>
                  <ol className="mt-3 space-y-0.5">
                    {titulos.map((t) => (
                      <li key={t.id}>
                        <a
                          href={`#${t.id}`}
                          className="block border-l-2 border-borda py-1.5 pl-3 text-[13px] leading-snug font-semibold text-texto-2 transition-colors hover:border-brand-500 hover:text-brand-700"
                        >
                          {t.texto}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>

                <div className="rounded-2xl border border-borda bg-superficie p-5">
                  <Compartilhar url={url} titulo={post.titulo} />
                </div>
              </div>
            </aside>
          ) : null}
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
