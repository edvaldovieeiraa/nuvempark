"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  Landmark,
  FolderCog,
  Settings,
  ChevronDown,
  ParkingSquare,
  ArrowLeftRight,
  Ban,
  Banknote,
  FileCheck2,
  CalendarRange,
  BarChart3,
  Building2,
  CircleDollarSign,
  Users,
  BadgeCheck,
  Layers,
  CarFront,
  SlidersHorizontal,
  Printer,
  type LucideIcon,
} from "lucide-react";

type Filho = { href: string; label: string; Icone: LucideIcon };

type Item = {
  label: string;
  Icone: LucideIcon;
  /** Item simples: navega direto. */
  href?: string;
  /** Grupo expansível (estilo accordion) com filhos icônicos. */
  filhos?: Filho[];
  /** Se true, links carregam o ?patio=id atual. */
  porPatio?: boolean;
};

const ITENS: Item[] = [
  { label: "Dashboard", Icone: LayoutDashboard, href: "/painel", porPatio: true },
  {
    label: "Operação",
    Icone: ClipboardList,
    porPatio: true,
    filhos: [
      { href: "/painel/patio", label: "Pátio", Icone: ParkingSquare },
      { href: "/painel/movimentos", label: "Movimentos", Icone: ArrowLeftRight },
      { href: "/painel/removidos", label: "Tickets removidos", Icone: Ban },
    ],
  },
  {
    label: "Financeiro",
    Icone: Landmark,
    porPatio: true,
    filhos: [
      { href: "/painel/caixa", label: "Caixa", Icone: Banknote },
      { href: "/painel/financeiro/prestacao", label: "Prestação de contas", Icone: FileCheck2 },
      { href: "/painel/financeiro/resultados", label: "Resultados", Icone: CalendarRange },
    ],
  },
  {
    label: "Mensalistas/Credenciados",
    Icone: BadgeCheck,
    porPatio: true,
    filhos: [
      { href: "/painel/mensalistas", label: "Clientes", Icone: Users },
      { href: "/painel/mensalistas/planos", label: "Planos", Icone: Layers },
    ],
  },
  {
    label: "Cadastros",
    Icone: FolderCog,
    porPatio: true,
    filhos: [
      { href: "/painel/tarifas", label: "Tarifas", Icone: CircleDollarSign },
      { href: "/painel/tipos-veiculo", label: "Tipos de veículo", Icone: CarFront },
      { href: "/painel/operadores", label: "Operadores", Icone: Users },
    ],
  },
  { label: "Relatórios", Icone: BarChart3, href: "/painel/relatorios", porPatio: true },
  {
    label: "Configurações",
    Icone: Settings,
    porPatio: true,
    filhos: [
      { href: "/painel/configuracoes", label: "Geral", Icone: SlidersHorizontal },
      { href: "/painel/patios", label: "Pátios", Icone: Building2 },
      { href: "/painel/impressao", label: "Impressão", Icone: Printer },
    ],
  },
];

/** Ativo por segmento: /painel/patio NÃO ativa em /painel/patios. */
function rotaAtiva(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const patio = searchParams.get("patio");

  const comPatio = (href: string, porPatio?: boolean) =>
    porPatio && patio ? `${href}?patio=${patio}` : href;

  // Dentro de um grupo, o filho ativo é o de rota mais específica
  // (ex.: /mensalistas/planos ativa "Planos", não "Clientes").
  const filhoAtivo = (f: Filho, irmaos: Filho[]) => {
    if (!rotaAtiva(pathname, f.href)) return false;
    return !irmaos.some(
      (o) =>
        o.href !== f.href &&
        o.href.startsWith(f.href) &&
        rotaAtiva(pathname, o.href),
    );
  };

  const grupoAtivo = (item: Item) =>
    (item.filhos ?? []).some((f) => rotaAtiva(pathname, f.href));

  // Grupo da rota atual começa aberto.
  const [abertos, setAbertos] = useState<Record<string, boolean>>(() => {
    const inicial: Record<string, boolean> = {};
    for (const item of ITENS)
      if (item.filhos && grupoAtivo(item)) inicial[item.label] = true;
    return inicial;
  });

  const alternar = (label: string) =>
    setAbertos((a) => ({ ...a, [label]: !a[label] }));

  return (
    <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
      {ITENS.map((item) => {
        // ---- item simples ----
        if (item.href) {
          const ativo =
            item.href === "/painel"
              ? pathname === "/painel"
              : rotaAtiva(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={comPatio(item.href, item.porPatio)}
              className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                ativo
                  ? "text-white"
                  : "text-white/55 hover:text-white hover:bg-white/5"
              }`}
            >
              {ativo && (
                <motion.span
                  layoutId="nav-ativo"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 shadow-[var(--shadow-brand)]"
                />
              )}
              <item.Icone className="relative w-[18px] h-[18px] shrink-0" />
              <span className="relative min-w-0 truncate">{item.label}</span>
            </Link>
          );
        }

        // ---- grupo expansível ----
        const aberto = abertos[item.label] ?? false;
        const ativo = grupoAtivo(item);
        return (
          <div key={item.label}>
            <button
              onClick={() => alternar(item.label)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                ativo && !aberto
                  ? "text-white bg-white/8"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.Icone className="w-[18px] h-[18px] shrink-0" />
              <span className="flex-1 min-w-0 text-left truncate">
                {item.label}
              </span>
              <motion.span
                animate={{ rotate: aberto ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0"
              >
                <ChevronDown className="w-4 h-4 text-white/40" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {aberto && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="py-0.5 space-y-0.5">
                    {(item.filhos ?? []).map((f) => {
                      const fAtivo = filhoAtivo(f, item.filhos ?? []);
                      return (
                        <Link
                          key={f.href}
                          href={comPatio(f.href, item.porPatio)}
                          className={`flex items-center gap-3 pl-[46px] pr-3.5 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                            fAtivo
                              ? "text-white bg-brand-500/15"
                              : "text-white/45 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <f.Icone
                            className={`w-4 h-4 ${fAtivo ? "text-brand-400" : "text-white/35"}`}
                          />
                          {f.label}
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}
