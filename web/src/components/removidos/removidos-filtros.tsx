"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

function isoToYmd(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function inicioDiaIso(dia: string): string {
  return dia ? new Date(`${dia}T00:00:00`).toISOString() : "";
}
function fimDiaIso(dia: string): string {
  return dia ? new Date(`${dia}T23:59:59.999`).toISOString() : "";
}

/**
 * Filtros da página de removidos: busca por placa + intervalo de datas
 * (aplicado sobre removido_em). Preserva SEMPRE o pátio no escopo.
 */
export function RemovidosFiltros({
  patioId,
  q,
  di,
  df,
}: {
  patioId: string;
  q: string;
  di: string;
  df: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busca, setBusca] = useState(q);
  const [inicio, setInicio] = useState(isoToYmd(di));
  const [fim, setFim] = useState(isoToYmd(df));
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function aplicar(next: { q?: string; inicio?: string; fim?: string }) {
    const qv = next.q ?? busca;
    const iv = next.inicio ?? inicio;
    const fv = next.fim ?? fim;
    const params = new URLSearchParams();
    params.set("patio", patioId); // preserva o escopo do pátio
    if (qv.trim()) params.set("q", qv.trim());
    if (iv) params.set("di", inicioDiaIso(iv));
    if (fv) params.set("df", fimDiaIso(fv));
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (busca === q) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => aplicar({ q: busca }), 350);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-3 flex flex-wrap items-center gap-2"
    >
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-texto-3" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar placa…"
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-borda bg-fundo text-sm font-semibold tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-normal placeholder:text-texto-3 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={inicio}
          max={fim || undefined}
          onChange={(e) => {
            setInicio(e.target.value);
            aplicar({ inicio: e.target.value });
          }}
          aria-label="Removido de"
          className="h-10 px-3 rounded-xl border border-borda bg-fundo text-sm font-semibold focus:outline-none focus:border-brand-400"
        />
        <span className="text-texto-3 text-sm">até</span>
        <input
          type="date"
          value={fim}
          min={inicio || undefined}
          onChange={(e) => {
            setFim(e.target.value);
            aplicar({ fim: e.target.value });
          }}
          aria-label="Removido até"
          className="h-10 px-3 rounded-xl border border-borda bg-fundo text-sm font-semibold focus:outline-none focus:border-brand-400"
        />
        {(busca || inicio || fim) && (
          <button
            onClick={() => {
              setBusca("");
              setInicio("");
              setFim("");
              router.replace(`${pathname}?patio=${patioId}`);
            }}
            className="h-10 px-3 rounded-xl border border-borda bg-fundo text-sm font-semibold text-texto-2 hover:text-texto hover:border-brand-300 transition-colors"
          >
            Limpar
          </button>
        )}
      </div>
    </motion.div>
  );
}
