import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BlogCategoria } from "@/lib/blog";

/**
 * Navegação das listagens: pílulas de categoria e paginação.
 *
 * As duas são links de verdade (nada de estado no cliente): cada página tem
 * URL própria, canonical próprio e entra no sitemap — e as rotas continuam
 * estáticas com ISR, sem depender de `searchParams`.
 */

export function PilulasCategoria({
  categorias,
  ativa,
}: {
  categorias: BlogCategoria[];
  /** Slug da categoria atual; ausente = "Todos". */
  ativa?: string;
}) {
  if (categorias.length === 0) return null;

  const base =
    "inline-flex h-10 items-center rounded-full border px-4 text-[13px] font-bold whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none";
  const inativo =
    "border-borda bg-superficie text-texto-2 hover:border-brand-300 hover:text-brand-700";
  const selecionado = "border-brand-600 bg-brand-600 text-white shadow-brand";

  return (
    <nav aria-label="Categorias do blog" className="-mx-5 px-5">
      <ul className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li className="snap-start">
          <Link
            href="/blog"
            aria-current={ativa ? undefined : "page"}
            className={`${base} ${ativa ? inativo : selecionado}`}
          >
            Todos
          </Link>
        </li>
        {categorias.map((c) => (
          <li key={c.id} className="snap-start">
            <Link
              href={`/blog/categoria/${c.slug}`}
              aria-current={ativa === c.slug ? "page" : undefined}
              className={`${base} ${ativa === c.slug ? selecionado : inativo}`}
            >
              {c.nome}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Paginação por URL. `base` é o prefixo da listagem ("/blog" ou
 * "/blog/categoria/tecnologia"); a página 1 é o próprio prefixo, e daí em
 * diante vira `${base}/pagina/N`.
 */
export function Paginacao({
  base,
  pagina,
  totalPaginas,
}: {
  base: string;
  pagina: number;
  totalPaginas: number;
}) {
  if (totalPaginas <= 1) return null;

  const href = (n: number) => (n <= 1 ? base : `${base}/pagina/${n}`);
  const numeros = Array.from({ length: totalPaginas }, (_, i) => i + 1);

  const botao =
    "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-xl border px-3 text-sm font-bold transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none";
  const normal =
    "border-borda bg-superficie text-texto-2 hover:border-brand-300 hover:text-brand-700";
  const atual = "border-brand-600 bg-brand-600 text-white";
  const desabilitado =
    "border-borda bg-fundo text-texto-3 pointer-events-none opacity-60";

  return (
    <nav aria-label="Paginação" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {pagina > 1 ? (
        <Link href={href(pagina - 1)} rel="prev" className={`${botao} ${normal}`}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Anterior
        </Link>
      ) : (
        <span className={`${botao} ${desabilitado}`} aria-hidden>
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </span>
      )}

      {numeros.map((n) =>
        n === pagina ? (
          <span key={n} aria-current="page" className={`${botao} ${atual}`}>
            {n}
          </span>
        ) : (
          <Link key={n} href={href(n)} className={`${botao} ${normal}`}>
            {n}
          </Link>
        ),
      )}

      {pagina < totalPaginas ? (
        <Link href={href(pagina + 1)} rel="next" className={`${botao} ${normal}`}>
          Próxima
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span className={`${botao} ${desabilitado}`} aria-hidden>
          Próxima
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
