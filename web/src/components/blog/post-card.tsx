import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock } from "lucide-react";
import { Marca } from "@/components/marca";
import type { BlogPostResumo } from "@/lib/blog";
import { dataAtributo, dataCurta, dataRelativa } from "@/lib/blog-datas";

/**
 * Cards da listagem do blog. Duas variações do mesmo conteúdo:
 * `PostCard` (grade) e `PostDestaque` (herói da home — cartão escuro, na
 * linguagem das seções escuras da landing).
 */

/**
 * Gradientes do fallback de capa, um por "família" de assunto. O índice sai
 * de um hash do slug: estável entre renders e distribui as cores pela grade —
 * era o que faltava quando todo post sem capa ganhava o MESMO verde chapado.
 */
const GRADIENTES_CAPA = [
  "linear-gradient(135deg, #059669 0%, #065F46 60%, #0B1512 100%)",
  "linear-gradient(135deg, #0EA5E9 0%, #0369A1 60%, #0B1220 100%)",
  "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 60%, #1E1B4B 100%)",
  "linear-gradient(135deg, #14B8A6 0%, #0F766E 60%, #0B1512 100%)",
];

function gradienteDe(post: BlogPostResumo): string {
  // Hash pela CATEGORIA: a cor vira identidade dela (todo post de Financeiro
  // tem a mesma família), e categorias diferentes se distinguem na grade.
  const chave = post.categoria?.slug ?? post.slug;
  let hash = 0;
  for (let i = 0; i < chave.length; i++) {
    hash = (hash * 31 + chave.charCodeAt(i)) % 9973;
  }
  return GRADIENTES_CAPA[hash % GRADIENTES_CAPA.length];
}

/** Capa do post; sem imagem, vira um cartão de marca com a cor da família. */
function Capa({
  post,
  sizes,
  prioridade = false,
}: {
  post: BlogPostResumo;
  sizes: string;
  prioridade?: boolean;
}) {
  if (!post.capa_url) {
    return (
      <div
        className="absolute inset-0"
        style={{ background: gradienteDe(post) }}
        aria-hidden
      >
        {/* Pontilhado sutil — dá textura sem virar ruído. */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1.4px)",
            backgroundSize: "22px 22px",
            maskImage:
              "radial-gradient(ellipse 100% 90% at 25% 15%, black 20%, transparent 75%)",
          }}
        />
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

        <div className="absolute inset-0 grid place-items-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm">
            <Marca className="h-8 w-8" corP="#065F46" />
          </span>
        </div>

        {post.categoria ? (
          <span className="absolute bottom-3 left-4 text-[11px] font-black tracking-[0.14em] text-white/70 uppercase">
            {post.categoria.nome}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <Image
      src={post.capa_url}
      alt=""
      fill
      sizes={sizes}
      priority={prioridade}
      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
    />
  );
}

/** Etiqueta da categoria. Não é link: o card inteiro já leva ao post. */
function EtiquetaCategoria({ nome }: { nome: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-[11px] font-black tracking-[0.08em] text-brand-700 uppercase">
      {nome}
    </span>
  );
}

function MetaPost({ post, claro = false }: { post: BlogPostResumo; claro?: boolean }) {
  const cor = claro ? "text-white/55" : "text-texto-3";
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] ${cor}`}>
      <time dateTime={dataAtributo(post.publicado_em)}>
        {dataCurta(post.publicado_em)}
      </time>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {post.minutosLeitura} min de leitura
      </span>
    </div>
  );
}

export function PostCard({ post }: { post: BlogPostResumo }) {
  return (
    <article className="group h-full">
      <Link
        href={`/blog/${post.slug}`}
        className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-borda bg-superficie transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-fundo">
          <Capa post={post} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        </div>

        <div className="flex flex-1 flex-col p-5">
          {post.categoria ? <EtiquetaCategoria nome={post.categoria.nome} /> : null}

          <h3 className="mt-3 text-lg leading-snug font-extrabold tracking-tight text-texto transition-colors group-hover:text-brand-700">
            {post.titulo}
          </h3>

          <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-texto-2">
            {post.resumo}
          </p>

          <div className="mt-auto flex items-center justify-between gap-3 pt-5">
            <MetaPost post={post} />
            <span
              className="grid h-8 w-8 flex-none place-items-center rounded-full bg-fundo text-texto-3 transition-all group-hover:bg-brand-600 group-hover:text-white"
              aria-hidden
            >
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function PostDestaque({ post }: { post: BlogPostResumo }) {
  return (
    <article className="group">
      <Link
        href={`/blog/${post.slug}`}
        className="relative grid cursor-pointer overflow-hidden rounded-3xl border border-white/10 shadow-[0_32px_80px_-24px_rgba(11,18,32,0.45)] transition-all duration-300 hover:border-brand-400/40 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none lg:grid-cols-2"
        style={{
          background:
            "linear-gradient(135deg, #0B1220 0%, #10201A 60%, #0B1220 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 -bottom-24 h-72 w-72 rounded-full bg-acento/10 blur-3xl"
          aria-hidden
        />

        <div className="relative aspect-[16/10] w-full overflow-hidden lg:aspect-auto lg:min-h-[340px]">
          <Capa post={post} sizes="(max-width: 1024px) 100vw, 50vw" prioridade />
        </div>

        <div className="relative flex flex-col justify-center p-7 sm:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-brand-500 px-3 py-1 text-[11px] font-black tracking-[0.08em] text-white uppercase">
              Em destaque
            </span>
            {post.categoria ? (
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black tracking-[0.08em] text-white/75 uppercase">
                {post.categoria.nome}
              </span>
            ) : null}
          </div>

          <h2 className="mt-4 text-2xl leading-[1.15] font-black tracking-tight text-white transition-colors group-hover:text-brand-300 sm:text-3xl">
            {post.titulo}
          </h2>

          <p className="mt-4 text-base leading-relaxed text-white/70 sm:text-[17px]">
            {post.resumo}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <MetaPost post={post} claro />
            <span className="text-[13px] text-white/55">
              {dataRelativa(post.publicado_em)}
            </span>
          </div>

          <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-brand-400">
            Ler o artigo
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </span>
        </div>
      </Link>
    </article>
  );
}
