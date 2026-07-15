"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { Marca } from "@/components/marca";

/**
 * Shell responsivo do painel/master. Desktop (`lg`+): sidebar fixa em coluna,
 * idêntica ao layout original. Mobile (< `lg`): a sidebar vira um drawer
 * deslizante aberto pelo hambúrguer do header; overlay atrás; fecha ao navegar,
 * ao clicar fora, no X e com Esc.
 *
 * A sidebar é renderizada UMA vez (não duplicada): as classes de drawer só
 * valem < `lg`; em `lg`+ ela volta a ser estática no fluxo (`lg:static`).
 */
export function AppShell({
  sidebar,
  children,
  asideClassName = "",
  titulo,
}: {
  /** Conteúdo interno da sidebar (marca, seletor, nav, rodapé). */
  sidebar: React.ReactNode;
  children: React.ReactNode;
  /** Classe de fundo da aside (gradiente do painel / sólido do master). */
  asideClassName?: string;
  /** Rótulo curto ao lado da marca no header mobile. */
  titulo?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  // Fecha ao navegar (troca de rota dentro do drawer).
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  // Esc fecha + trava o scroll do body enquanto o drawer está aberto.
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("keydown", onKey);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = antes;
    };
  }, [aberto]);

  return (
    <div className="flex-1 flex min-h-full">
      {/* Overlay do drawer (só mobile) */}
      <div
        aria-hidden
        onClick={() => setAberto(false)}
        className={`fixed inset-0 z-40 bg-noite/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          aberto
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sidebar: drawer < lg, estática em lg+ (uma única instância) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(17rem,85vw)] shrink-0 flex flex-col relative overflow-hidden
          transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:transition-none
          ${aberto ? "translate-x-0" : "-translate-x-full"} ${asideClassName}`}
      >
        {/* Fechar (só no drawer mobile) */}
        <button
          onClick={() => setAberto(false)}
          aria-label="Fechar menu"
          className="lg:hidden absolute top-3 right-3 z-10 w-9 h-9 grid place-items-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors toque-44"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebar}
      </aside>

      {/* Coluna de conteúdo */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header mobile (some em lg+) */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-noite text-white border-b border-white/8">
          <button
            onClick={() => setAberto(true)}
            aria-label="Abrir menu"
            className="w-10 h-10 -ml-2 grid place-items-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors toque-44"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-acento-teal grid place-items-center">
              <Marca className="w-4 h-4" />
            </div>
            <span className="font-extrabold tracking-tight">
              Nuvem<span className="text-brand-400">Park</span>
            </span>
            {titulo && (
              <span className="text-[11px] text-white/45 font-semibold">
                {titulo}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 fundo-aurora">
          {children}
        </main>
      </div>
    </div>
  );
}
