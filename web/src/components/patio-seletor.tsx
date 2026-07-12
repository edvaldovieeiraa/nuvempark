"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ParkingSquare, ChevronsUpDown, Check } from "lucide-react";

type Patio = { id: string; nome: string; codigo_acesso?: string | null };

/**
 * Seletor de pátio no topo da sidebar. Troca o `?patio=<id>` preservando a
 * rota atual — cada pátio é um "espaço" próprio nas telas por-pátio.
 */
export function PatioSeletor({
  patios,
}: {
  patios: Patio[];
  /** @deprecated a URL (?patio) é a fonte da verdade. */
  patioIdAtivo?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  // A URL é a fonte da verdade — o seletor sempre reflete o ?patio atual.
  const patioParam = searchParams.get("patio");
  const ativo = patios.find((p) => p.id === patioParam) ?? patios[0];

  function selecionar(id: string) {
    setAberto(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("patio", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (patios.length === 0) {
    return (
      <div className="mx-3 mb-2 px-3.5 py-3 rounded-xl bg-white/5 border border-white/8 text-xs text-white/55">
        Nenhum pátio ativo
      </div>
    );
  }

  return (
    <div ref={ref} className="relative mx-3 mb-2">
      <button
        onClick={() => setAberto((a) => !a)}
        className="w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/8 hover:border-white/20 hover:bg-white/[0.07] transition-all flex items-center gap-2.5 text-left"
      >
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-acento-teal grid place-items-center shrink-0">
          <ParkingSquare className="w-4 h-4 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/55">
            Pátio
          </div>
          <div className="text-sm font-bold text-white truncate">
            {ativo?.nome ?? "—"}
          </div>
          {ativo?.codigo_acesso && (
            <div className="text-[11px] font-mono font-black tracking-[0.3em] text-brand-400">
              {ativo.codigo_acesso}
            </div>
          )}
        </div>
        <ChevronsUpDown className="w-4 h-4 text-white/40 shrink-0" />
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1.5 left-0 right-0 rounded-xl bg-noite-3 border border-white/10 shadow-[var(--shadow-pop)] p-1.5 max-h-72 overflow-y-auto"
          >
            {patios.map((p) => {
              const selecionado = p.id === ativo?.id;
              return (
                <button
                  key={p.id}
                  onClick={() => selecionar(p.id)}
                  className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-2.5 text-sm font-semibold transition-colors ${
                    selecionado
                      ? "bg-brand-500/15 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <ParkingSquare className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{p.nome}</span>
                  {p.codigo_acesso && (
                    <span className="font-mono text-[11px] font-black tracking-widest text-white/55">
                      {p.codigo_acesso}
                    </span>
                  )}
                  {selecionado && <Check className="w-4 h-4 text-brand-400" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
