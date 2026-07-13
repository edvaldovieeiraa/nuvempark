"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { urlApp } from "@/lib/urls";

const LINKS = [
  { href: "/recursos", label: "Recursos" },
  { href: "/novidades", label: "Novidades" },
  { href: "/precos", label: "Preços" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [aberto, setAberto] = useState(false);

  // No topo da home o header flutua sobre a hero escura → texto claro.
  const escuro = pathname === "/" && !scrolled && !aberto;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled || aberto
          ? "bg-white/85 backdrop-blur-xl border-b border-borda shadow-[0_1px_12px_rgba(16,27,20,0.06)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-acento-teal grid place-items-center shadow-[var(--shadow-brand)]">
              <CloudP />
            </span>
            <span
              className={`font-extrabold tracking-tight text-lg transition-colors ${escuro ? "text-white" : "text-texto"}`}
            >
              Nuvem
              <span className={escuro ? "text-brand-400" : "text-brand-600"}>
                Park
              </span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {LINKS.map((l) => {
              const ativo = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    ativo
                      ? "text-brand-700 bg-brand-50"
                      : escuro
                        ? "text-white/70 hover:text-white hover:bg-white/10"
                        : "text-texto-2 hover:text-texto hover:bg-fundo"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <a
              href={urlApp("/login")}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                escuro
                  ? "text-white/85 border-white/20 hover:border-white/40 hover:text-white hover:bg-white/10"
                  : "text-texto-2 border-borda hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50"
              }`}
            >
              Entrar
            </a>
            <a
              href={urlApp("/cadastro")}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 shadow-[var(--shadow-brand)] hover:brightness-110 transition-all"
            >
              Começar grátis
            </a>
          </div>

          <button
            onClick={() => setAberto((a) => !a)}
            className={`md:hidden w-10 h-10 grid place-items-center rounded-lg transition-colors ${
              escuro ? "text-white hover:bg-white/10" : "text-texto hover:bg-fundo"
            }`}
            aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          >
            {aberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {aberto && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="md:hidden overflow-hidden border-t border-borda py-3 space-y-1 bg-white"
          >
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setAberto(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-texto-2 hover:text-texto hover:bg-fundo transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              <a
                href={urlApp("/login")}
                className="flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-bold text-texto-2 border border-borda"
              >
                Entrar
              </a>
              <a
                href={urlApp("/cadastro")}
                onClick={() => setAberto(false)}
                className="flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500"
              >
                Começar grátis
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}

function CloudP() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
      <path
        d="M7 18a4 4 0 0 1-.6-7.96 5.5 5.5 0 0 1 10.83-1.02A4.5 4.5 0 0 1 16.5 18H7Z"
        fill="white"
      />
      <path
        d="M10.6 15.5v-5h2.2a1.7 1.7 0 1 1 0 3.4h-2.2"
        stroke="#059669"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
