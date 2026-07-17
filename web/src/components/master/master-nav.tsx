"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Wallet,
  Landmark,
  type LucideIcon,
} from "lucide-react";

const ITENS: { href: string; label: string; Icone: LucideIcon }[] = [
  { href: "/master", label: "Visão geral", Icone: LayoutDashboard },
  { href: "/master/tenants", label: "Redes (tenants)", Icone: Building2 },
  { href: "/master/assinaturas", label: "Assinaturas", Icone: CreditCard },
  { href: "/master/pagamentos", label: "Pagamentos (gateway)", Icone: Landmark },
  { href: "/master/financeiro", label: "Financeiro", Icone: Wallet },
];

export function MasterNav() {
  const pathname = usePathname();
  const ativo = (href: string) =>
    href === "/master" ? pathname === "/master" : pathname.startsWith(href);

  return (
    <nav className="flex-1 min-h-0 px-3 py-2 space-y-0.5 overflow-y-auto">
      {ITENS.map(({ href, label, Icone }) => {
        const estaAtivo = ativo(href);
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
              estaAtivo
                ? "text-white font-bold"
                : "text-white/55 font-semibold hover:text-white hover:bg-white/5"
            }`}
          >
            {estaAtivo && (
              <motion.span
                layoutId="master-nav-ativo"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 shadow-[var(--shadow-brand)]"
              />
            )}
            <Icone className="relative w-[18px] h-[18px] shrink-0" />
            <span className="relative min-w-0 truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
