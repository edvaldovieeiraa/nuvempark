"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CloudOff } from "lucide-react";
import { formatarDataHora } from "@/lib/format-data";

/**
 * Selo de "última sincronização com o pátio". Mostra o tempo relativo
 * (há X min) e recalcula sozinho a cada 30s. Verde se recente (<10min),
 * âmbar se defasado, cinza se o pátio nunca sincronizou.
 */
export function SyncBadge({ iso }: { iso: string | null }) {
  const [, forcar] = useState(0);

  useEffect(() => {
    const t = setInterval(() => forcar((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!iso) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-fundo text-texto-3 border border-borda">
        <CloudOff className="w-3.5 h-3.5" />
        Nunca sincronizou
      </span>
    );
  }

  const data = new Date(iso);
  const minutos = Math.max(0, Math.round((Date.now() - data.getTime()) / 60000));
  const recente = minutos < 10;
  const defasado = minutos >= 60;

  const cls = recente
    ? "bg-brand-50 text-brand-700 border-brand-200"
    : defasado
      ? "bg-aviso-bg text-aviso border-aviso/25"
      : "bg-fundo text-texto-2 border-borda";

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${cls}`}
      title={`Última sincronização: ${formatarDataHora(iso)}`}
    >
      <RefreshCw className="w-3.5 h-3.5" />
      Sincronizado {relativo(minutos)}
    </span>
  );
}

function relativo(min: number): string {
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}${d === 1 ? " dia" : " dias"}`;
}
