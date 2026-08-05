import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SOLUCOES } from "@/lib/solucoes";

/**
 * Ponte do blog para as páginas comerciais.
 *
 * O blog é a porta de entrada de quem ainda está pesquisando; as páginas de
 * solução são onde a busca com intenção de compra deve aterrissar. Sem um link
 * dentro do conteúdo, o único caminho entre os dois é o rodapé — que o leitor
 * raramente alcança e que passa muito menos autoridade do que um link no corpo
 * da página.
 *
 * Fica DEPOIS do artigo de propósito: quem chegou até aqui leu o assunto e é
 * exatamente quem vale mandar para a página do produto.
 */
export function SolucoesRelacionadas() {
  return (
    <nav
      aria-label="Páginas sobre o sistema"
      className="mt-12 rounded-2xl border border-borda bg-fundo p-6"
    >
      <p className="text-[11px] font-black tracking-[0.14em] text-texto-3 uppercase">
        Sobre o sistema
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {SOLUCOES.map((s) => (
          <li key={s.caminho}>
            <Link
              href={s.caminho}
              className="flex items-center gap-2 rounded-xl border border-borda bg-white px-4 py-3 text-sm font-bold text-texto transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              {s.h1}
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-texto-3" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
