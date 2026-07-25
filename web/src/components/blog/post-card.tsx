import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock } from "lucide-react";
import { Marca } from "@/components/marca";
import type { BlogPostResumo } from "@/lib/blog";
import { dataAtributo, dataCurta, dataRelativa } from "@/lib/blog-datas";

/**
 * Cards da listagem do blog. Duas variações do mesmo conteúdo:
 * `PostCard` (grade) e `PostDestaque` (herói da home, imagem ao lado do texto).
 */

/** Capa do post; sem imagem, cai num selo da marca em vez de um buraco cinza. */
function Capa({
  post,
  sizes,
  prioridade = false,
  className = "",
}: {
  post: BlogPostResumo;
  sizes: string;
  prioridade?: boolean;
  className?: string;
}) {
  if (!post.capa_url) {
    return (
      <div
        className={`grid place-items-center bg-gradient-to-br from-brand-600 via-brand-700 to-noite-2 ${className}`}
        aria-hidden
      >
        <Marca className="h-12 w-12 opacity-90" corP="#065F46" />
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
      className={`object-cover transition-transform duration-500 group-hover:scale-[1.03] ${className}`}
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
  const cor = claro ? "text-white/60" : "text-texto-3";
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
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-borda bg-superficie transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
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

          <div className="mt-auto pt-5">
            <MetaPost post={post} />
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
        className="grid overflow-hidden rounded-3xl border border-borda bg-superficie shadow-card transition-all duration-300 hover:border-brand-200 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none lg:grid-cols-2"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-fundo lg:aspect-auto lg:min-h-[340px]">
          <Capa
            post={post}
            sizes="(max-width: 1024px) 100vw, 50vw"
            prioridade
          />
        </div>

        <div className="flex flex-col justify-center p-7 sm:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-brand-600 px-3 py-1 text-[11px] font-black tracking-[0.08em] text-white uppercase">
              Em destaque
            </span>
            {post.categoria ? <EtiquetaCategoria nome={post.categoria.nome} /> : null}
          </div>

          <h2 className="mt-4 text-2xl leading-[1.15] font-black tracking-tight text-texto transition-colors group-hover:text-brand-700 sm:text-3xl">
            {post.titulo}
          </h2>

          <p className="mt-4 text-base leading-relaxed text-texto-2 sm:text-[17px]">
            {post.resumo}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <MetaPost post={post} />
            <span className="text-[13px] text-texto-3">
              {dataRelativa(post.publicado_em)}
            </span>
          </div>

          <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-brand-700">
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
