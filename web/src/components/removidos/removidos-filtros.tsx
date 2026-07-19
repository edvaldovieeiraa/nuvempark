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

  const pill: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    padding: "9px 11px",
    borderRadius: 11,
    border: "1px solid #E4E8EC",
    color: "#1F2937",
    background: "#fff",
    outline: "none",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      style={{
        borderRadius: 16,
        background: "#fff",
        border: "1px solid #E4E8EC",
        boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
        padding: 12,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Busca por placa */}
      <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
        <Search
          style={{
            position: "absolute",
            left: 13,
            top: "50%",
            transform: "translateY(-50%)",
            width: 15,
            height: 15,
            color: "#8695A0",
          }}
        />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar placa…"
          className="uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal placeholder:text-[#8695A0]"
          style={{
            width: "100%",
            height: 38,
            padding: "0 13px 0 34px",
            borderRadius: 11,
            border: "1px solid #E4E8EC",
            background: "#fff",
            fontSize: 13,
            fontWeight: 600,
            color: "#1F2937",
            outline: "none",
          }}
        />
      </div>

      {/* Intervalo (removido_em) */}
      <input
        type="date"
        value={inicio}
        max={fim || undefined}
        onChange={(e) => {
          setInicio(e.target.value);
          aplicar({ inicio: e.target.value });
        }}
        aria-label="Removido de"
        className="mono"
        style={pill}
      />
      <span style={{ fontSize: 12, color: "#8695A0" }}>até</span>
      <input
        type="date"
        value={fim}
        min={inicio || undefined}
        onChange={(e) => {
          setFim(e.target.value);
          aplicar({ fim: e.target.value });
        }}
        aria-label="Removido até"
        className="mono"
        style={pill}
      />
      {(busca || inicio || fim) && (
        <button
          onClick={() => {
            setBusca("");
            setInicio("");
            setFim("");
            router.replace(`${pathname}?patio=${patioId}`);
          }}
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: "9px 11px",
            borderRadius: 11,
            border: "1px solid #E4E8EC",
            background: "#fff",
            color: "#6B7280",
            cursor: "pointer",
          }}
        >
          Limpar
        </button>
      )}
    </motion.div>
  );
}
