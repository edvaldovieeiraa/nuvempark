"use client";

import { motion } from "framer-motion";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/**
 * Gráfico de barras mensal em SVG puro (sem dependência de chart lib).
 * Mostra receita recebida por competência.
 */
export function GraficoBarras({
  dados,
}: {
  dados: { rotulo: string; valor: number }[];
}) {
  const max = Math.max(1, ...dados.map((d) => d.valor));

  return (
    <div className="flex items-end gap-2 h-40">
      {dados.map((d, i) => {
        const alturaPct = (d.valor / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 min-w-0">
            <div className="relative w-full flex-1 flex items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(2, alturaPct)}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 relative group"
              >
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-texto-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap tabular-nums">
                  {moeda.format(d.valor)}
                </span>
              </motion.div>
            </div>
            <span className="text-[10px] font-semibold text-texto-3 truncate w-full text-center">
              {d.rotulo}
            </span>
          </div>
        );
      })}
    </div>
  );
}
