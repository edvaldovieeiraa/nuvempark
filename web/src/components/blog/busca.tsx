"use client";

import { Search } from "lucide-react";

/**
 * Campo de busca do blog. É um `<form method="get">` de verdade: navega para
 * /blog/busca?q=… mesmo sem JavaScript, e o próprio navegador cuida do envio.
 * É client component só por causa do `defaultValue` controlado pelo usuário.
 */
export function BuscaPosts({ inicial = "" }: { inicial?: string }) {
  return (
    <form
      action="/blog/busca"
      method="get"
      role="search"
      className="mx-auto mt-8 flex w-full max-w-md items-center gap-2"
    >
      <label htmlFor="blog-busca" className="sr-only">
        Buscar artigos
      </label>
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-texto-3"
          aria-hidden
        />
        <input
          id="blog-busca"
          type="search"
          name="q"
          defaultValue={inicial}
          maxLength={80}
          placeholder="Buscar por tarifa, caixa, placa..."
          className="h-12 w-full rounded-xl border border-borda bg-superficie pr-4 pl-11 text-[15px] text-texto placeholder:text-texto-3 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-12 items-center rounded-xl bg-texto px-5 text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        Buscar
      </button>
    </form>
  );
}
