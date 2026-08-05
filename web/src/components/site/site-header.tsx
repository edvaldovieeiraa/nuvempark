"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { urlApp } from "@/lib/urls";
import { Marca } from "@/components/marca";

/**
 * O site é ONEPAGE: tudo vive na home, em seções ancoradas. As antigas rotas
 * (/recursos, /precos, /novidades, /sobre, /contato) respondem 301 para a
 * âncora correspondente — ver `redirects()` em next.config.ts.
 *
 * O blog é a exceção e continua rota: é sistema de conteúdo (Supabase,
 * categorias, paginação, RSS, OG por post), não cabe como seção.
 *
 * Os hrefs começam com `/` de propósito, para funcionarem também a partir do
 * blog — de lá, `#precos` sozinho não sairia do lugar.
 */
const LINKS = [
  // "O sistema" é rota de verdade: a página pilar do silo de busca. Estar no
  // cabeçalho — presente em TODAS as páginas — é o link interno mais forte que
  // o site tem para oferecer, e é ele que diz ao Google qual é a página
  // principal do assunto.
  { href: "/sistema-para-estacionamento", id: null, label: "O sistema" },
  { href: "/#recursos", id: "recursos", label: "Recursos" },
  { href: "/#precos", id: "precos", label: "Preços" },
  { href: "/blog", id: null, label: "Blog" },
  { href: "/#novidades", id: "novidades", label: "Novidades" },
  { href: "/#sobre", id: "sobre", label: "Sobre" },
  { href: "/#contato", id: "contato", label: "Contato" },
] as const;

/** Ordem das seções na página — usada pelo scroll-spy. */
const SECOES: readonly string[] = LINKS.flatMap((l) => (l.id ? [l.id] : []));

/**
 * Rotas (não âncoras) que abrem com a mesma faixa escura da home: nelas o
 * cabeçalho flutua transparente com texto claro. As páginas de solução usam o
 * mesmo hero escuro do site, então entram aqui junto com o blog.
 */
const ROTAS_ESCURAS = ["/blog", "/sistema-para-estacionamento", "/gestao-de-estacionamento", "/controle-de-estacionamento", "/aplicativo-para-estacionamento"];

function dentroDe(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [aberto, setAberto] = useState(false);
  /** Seção visível agora (scroll-spy). Só faz sentido na home. */
  const [secaoAtiva, setSecaoAtiva] = useState<string | null>(null);
  /** 0→1 do quanto da página já foi percorrido, para o trilho de progresso. */
  const [progresso, setProgresso] = useState(0);

  const naHome = pathname === "/";

  // No topo da home, do BLOG e das páginas de solução o header flutua sobre
  // hero escura → texto claro.
  const sobreHeroEscura =
    naHome || ROTAS_ESCURAS.some((base) => dentroDe(pathname, base));
  const escuro = sobreHeroEscura && !scrolled && !aberto;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
      // Só na home: quanto do documento rolável já passou.
      const rolavel =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgresso(rolavel > 0 ? Math.min(1, window.scrollY / rolavel) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /**
   * Scroll-spy. Num onepage o menu precisa dizer onde você está, senão vira
   * uma lista de links que nunca "acende".
   *
   * A faixa de detecção é a parte de cima da janela (`-45% 0px -50%`): assim a
   * seção só assume quando o topo dela cruza mais ou menos o terço superior —
   * é onde o olho está lendo. Sem isso, seções altas ficariam ativas cedo
   * demais e o menu piscaria entre duas.
   */
  useEffect(() => {
    // Fora da home não há o que observar. Não precisa zerar `secaoAtiva`: todo
    // uso dela já exige `naHome`, então um valor velho nunca aparece.
    if (!naHome) return;
    const alvos = SECOES.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (alvos.length === 0) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        const visiveis = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visiveis.length > 0) setSecaoAtiva(visiveis[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    alvos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, [naHome]);

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
      {/* Trilho de progresso: num onepage longo ele é a única pista de "quanto
          falta". Fica na borda inferior do header, some no topo (largura 0) e
          só existe na home — no blog o scroll é de um artigo, não do site. */}
      {naHome && (
        <span
          aria-hidden
          className="absolute bottom-0 left-0 h-[2px] origin-left bg-gradient-to-r from-[#16A34A] to-[#22C55E]"
          style={{ width: `${progresso * 100}%`, transition: "width .1s linear" }}
        />
      )}

      <div className="mx-auto max-w-6xl px-5">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#16A34A] to-[#166534] grid place-items-center shadow-[0_8px_24px_-6px_rgba(21,128,61,0.5)]">
              <Marca corP="#166534" />
            </span>
            <span
              className={`font-light tracking-tight text-xl transition-colors ${escuro ? "text-white" : "text-[#1F2937]"}`}
            >
              Nuvem
              <span
                className="font-extrabold"
                style={{ color: escuro ? "#22C55E" : "#15803D" }}
              >
                Park
              </span>
            </span>
          </Link>

          {/* Ponto de virada em `lg` e não `md`: com sete itens mais a marca e
              os dois botões, a barra não cabe em 768 px — o menu sanduíche
              assume até 1024. */}
          <nav className="hidden lg:flex items-center gap-1">
            {LINKS.map((l) => {
              const ativo = l.id
                ? naHome && secaoAtiva === l.id
                : dentroDe(pathname, l.href);
              /* Âncoras são <a> puro de propósito: navegação por fragmento é
                 nativa, previsível e não depende do roteador. O blog, por ser
                 rota de verdade, continua com <Link> para não perder o SPA. */
              const Tag = l.id ? "a" : Link;
              return (
                <Tag
                  key={l.href}
                  href={l.href}
                  className={`relative px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    ativo
                      ? escuro
                        ? "text-white"
                        : "text-brand-700"
                      : escuro
                        ? "text-white/70 hover:text-white hover:bg-white/10"
                        : "text-texto-2 hover:text-texto hover:bg-fundo"
                  }`}
                >
                  {l.label}
                  {/* Marca da seção atual: um traço curto sob o rótulo. Um
                      fundo cheio brigaria com o header translúcido sobre o
                      hero escuro. */}
                  {ativo && (
                    <motion.span
                      layoutId="nav-ativo"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className={`absolute left-3.5 right-3.5 -bottom-0.5 h-0.5 rounded-full ${
                        escuro ? "bg-[#22C55E]" : "bg-brand-600"
                      }`}
                    />
                  )}
                </Tag>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
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
              className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#16A34A] to-[#166534] shadow-[0_8px_24px_-6px_rgba(21,128,61,0.5)] hover:brightness-110 transition-all"
            >
              Começar grátis
            </a>
          </div>

          <button
            onClick={() => setAberto((a) => !a)}
            className={`lg:hidden w-10 h-10 grid place-items-center rounded-lg transition-colors ${
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
            className="lg:hidden overflow-hidden border-t border-borda py-3 space-y-1 bg-white"
          >
            {LINKS.map((l) => {
              const ativo = l.id
                ? naHome && secaoAtiva === l.id
                : dentroDe(pathname, l.href);
              const Tag = l.id ? "a" : Link;
              return (
                <Tag
                  key={l.href}
                  href={l.href}
                  onClick={() => setAberto(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    ativo
                      ? "text-brand-700 bg-brand-50"
                      : "text-texto-2 hover:text-texto hover:bg-fundo"
                  }`}
                >
                  <span
                    className={`w-1 h-4 rounded-full transition-colors ${
                      ativo ? "bg-brand-600" : "bg-transparent"
                    }`}
                  />
                  {l.label}
                </Tag>
              );
            })}
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

