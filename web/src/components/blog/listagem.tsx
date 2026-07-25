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
      <div className="rounded-3xl border border-dashed border-borda bg-superficie px-6 py-16 text-center">
        <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-fundo">
          <FileQuestion className="h-5 w-5 text-texto-3" aria-hidden />
        </span>
        <p className="mt-4 text-lg font-extrabold text-texto">
          {vazio?.titulo ?? "Ainda não há artigos por aqui"}
        </p>
        <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-texto-2">
          {vazio?.descricao ??
            "Estamos escrevendo. Enquanto isso, veja tudo o que já publicamos."}
        </p>
        <Link
          href="/blog"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-bold text-white shadow-brand transition-all hover:brightness-110"
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
