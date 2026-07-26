import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { PostCard } from "@/components/blog/post-card";
import { Paginacao } from "@/components/blog/navegacao";
import type { BlogPostResumo } from "@/lib/blog";

/**
 * Grade de posts + paginação. Compartilhada pela home do blog, pelas páginas
 * de categoria e pela busca — as três só mudam o cabeçalho.
 */
export function ListaPosts({
  posts,
  pagina,
  totalPaginas,
  base,
  vazio,
}: {
  posts: BlogPostResumo[];
  pagina: number;
  totalPaginas: number;
  /** Prefixo da paginação (ex.: "/blog" ou "/blog/categoria/tecnologia"). */
  base: string;
  vazio?: { titulo: string; descricao: string };
}) {
  if (posts.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-borda bg-superficie px-6 py-20 text-center shadow-card">
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl"
          aria-hidden
        />
        <span className="relative inline-grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-acento-teal shadow-brand">
          <FileQuestion className="h-6 w-6 text-white" aria-hidden />
        </span>
        <p className="relative mt-5 text-xl font-black tracking-tight text-texto">
          {vazio?.titulo ?? "Os primeiros artigos estão a caminho"}
        </p>
        <p className="relative mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-texto-2">
          {vazio?.descricao ??
            "Estamos escrevendo guias práticos de gestão de pátio. Assine abaixo para receber quando saírem."}
        </p>
        <Link
          href="/blog"
          className="relative mt-7 inline-flex h-11 cursor-pointer items-center rounded-xl bg-brand-600 px-6 text-sm font-bold text-white shadow-brand transition-all hover:brightness-110"
        >
          Ver todos os artigos
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, i) => (
          // O stagger só vale para a primeira leva: passar de ~0.24s deixa os
          // últimos cards visivelmente atrasados na entrada.
          <Reveal key={post.id} delay={Math.min(i, 3) * 0.08} className="h-full">
            <PostCard post={post} />
          </Reveal>
        ))}
      </div>

      <Paginacao base={base} pagina={pagina} totalPaginas={totalPaginas} />
    </>
  );
}
