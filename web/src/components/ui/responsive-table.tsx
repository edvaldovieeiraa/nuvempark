"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Envólucro de tabela com rolagem horizontal suave e **fades nas bordas** que
 * aparecem só quando há conteúdo cortado à esquerda/direita — dica visual de
 * que dá pra rolar. Uso: `<ResponsiveTable><table>…</table></ResponsiveTable>`.
 *
 * `corFade` deve casar com o fundo onde a tabela vive (padrão: branco/superfície).
 */
export function ResponsiveTable({
  children,
  className = "",
  wrapperClassName = "",
  corFade = "from-superficie",
}: {
  children: React.ReactNode;
  /** Classe do container de rolagem (ex.: `max-h-*`). */
  className?: string;
  /** Classe do wrapper externo (ex.: `hidden md:block` para alternar c/ cards). */
  wrapperClassName?: string;
  /** Classe `from-*` do gradiente do fade (fundo da tabela). */
  corFade?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ esq: false, dir: false });

  const atualizar = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const esq = el.scrollLeft > 1;
    const dir = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setFade((f) => (f.esq === esq && f.dir === dir ? f : { esq, dir }));
  }, []);

  useEffect(() => {
    atualizar();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", atualizar, { passive: true });
    const ro = new ResizeObserver(atualizar);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", atualizar);
      ro.disconnect();
    };
  }, [atualizar]);

  return (
    <div className={`relative ${wrapperClassName}`}>
      <div
        ref={ref}
        className={`overflow-x-auto [scrollbar-width:thin] ${className}`}
      >
        {children}
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r ${corFade} to-transparent transition-opacity duration-200 ${
          fade.esq ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l ${corFade} to-transparent transition-opacity duration-200 ${
          fade.dir ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
