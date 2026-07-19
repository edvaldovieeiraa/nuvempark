"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  History,
  ChevronRight,
  ChevronDown,
  Building2,
} from "lucide-react";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { formatarDataHora } from "@/lib/format-data";

export type AuditRow = {
  id: string;
  criado_em: string;
  usuario_nome: string | null;
  usuario_email: string | null;
  modulo: string;
  acao: string;
  descricao: string;
  dados: Record<string, unknown> | null;
  patio_id: string | null;
};

type Filtros = { modulo: string; di: string; df: string; q: string };

type ModCor = { bg: string; border: string; text: string };
type ModInfo = ModCor & { label: string };

const CINZA: ModCor = { bg: "#F1F4F6", border: "#E4E8EC", text: "#6B7280" };

// Cores dos pills por módulo — set do protótipo; módulos desconhecidos → cinza.
const MODULOS: Record<string, ModInfo> = {
  operacao: { label: "Operação", ...CINZA },
  tarifas: { label: "Tarifas", bg: "#DCFCE7", border: "#BBF7D0", text: "#16A34A" },
  operadores: {
    label: "Operadores",
    bg: "#EEF4FF",
    border: "#CBD9FB",
    text: "#2563EB",
  },
  mensalistas: {
    label: "Mensalistas",
    bg: "#F3EEFE",
    border: "#DDD0FB",
    text: "#8B5CF6",
  },
  config: { label: "Configurações", ...CINZA },
  "tipos-veiculo": { label: "Tipos de veículo", ...CINZA },
  patios: { label: "Pátios", bg: "#FEF1F1", border: "#FBD0D0", text: "#E11D48" },
};

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E4E8EC",
  borderRadius: 16,
  boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
};

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

export function HistoricoClient({
  linhas,
  total,
  pagina,
  pageSize,
  patios,
  filtros,
}: {
  linhas: AuditRow[];
  total: number;
  pagina: number;
  pageSize: number;
  patios: Record<string, string>;
  filtros: Filtros;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busca, setBusca] = useState(filtros.q);
  const [inicio, setInicio] = useState(isoToYmd(filtros.di));
  const [fim, setFim] = useState(isoToYmd(filtros.df));
  const [aberta, setAberta] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  function aplicar(mud: Partial<Filtros & { p: number }>) {
    const f = {
      modulo: mud.modulo ?? filtros.modulo,
      di: mud.di ?? inicioDiaIso(inicio),
      df: mud.df ?? fimDiaIso(fim),
      q: mud.q ?? busca,
    };
    const params = new URLSearchParams();
    if (f.modulo) params.set("modulo", f.modulo);
    if (f.di) params.set("di", f.di);
    if (f.df) params.set("df", f.df);
    if (f.q.trim()) params.set("q", f.q.trim());
    // Qualquer mudança de filtro volta para a página 1.
    if (mud.p && mud.p > 1) params.set("p", String(mud.p));
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (busca === filtros.q) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => aplicar({ q: busca }), 350);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const temFiltro = Boolean(
    filtros.modulo || filtros.di || filtros.df || filtros.q,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: "-.02em",
            display: "flex",
            alignItems: "center",
            gap: 9,
          }}
        >
          <History style={{ width: 22, height: 22, color: "#16A34A" }} />
          Histórico de alterações
        </h2>
        <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
          Toda alteração feita no painel da rede · {total}
          {temFiltro ? " no filtro" : " no total"}
        </div>
      </motion.header>

      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        style={{
          ...CARD,
          padding: 12,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
        }}
      >
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
              pointerEvents: "none",
            }}
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar na descrição…"
            style={{
              width: "100%",
              height: 40,
              padding: "0 13px 0 36px",
              borderRadius: 11,
              border: "1px solid #E4E8EC",
              background: "#fff",
              fontSize: 13,
              color: "#1F2937",
            }}
          />
        </div>

        <div style={{ position: "relative", display: "inline-flex" }}>
          <select
            value={filtros.modulo}
            onChange={(e) => aplicar({ modulo: e.target.value })}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              height: 40,
              padding: "0 34px 0 13px",
              borderRadius: 11,
              border: "1px solid #E4E8EC",
              background: "#fff",
              fontSize: 13,
              fontWeight: 600,
              color: "#1F2937",
              cursor: "pointer",
            }}
          >
            <option value="">Todos os módulos</option>
            {Object.entries(MODULOS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <ChevronDown
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 14,
              height: 14,
              color: "#8695A0",
              pointerEvents: "none",
            }}
          />
        </div>

        <input
          type="date"
          value={inicio}
          max={fim || undefined}
          onChange={(e) => {
            setInicio(e.target.value);
            aplicar({ di: inicioDiaIso(e.target.value) });
          }}
          aria-label="De"
          className="mono"
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: 11,
            borderRadius: 11,
            border: "1px solid #E4E8EC",
            background: "#fff",
            color: "#1F2937",
          }}
        />
        <span style={{ fontSize: 12, color: "#8695A0" }}>até</span>
        <input
          type="date"
          value={fim}
          min={inicio || undefined}
          onChange={(e) => {
            setFim(e.target.value);
            aplicar({ df: fimDiaIso(e.target.value) });
          }}
          aria-label="Até"
          className="mono"
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: 11,
            borderRadius: 11,
            border: "1px solid #E4E8EC",
            background: "#fff",
            color: "#1F2937",
          }}
        />

        {temFiltro && (
          <button
            onClick={() => {
              setBusca("");
              setInicio("");
              setFim("");
              router.replace(pathname);
            }}
            style={{
              height: 40,
              padding: "0 13px",
              borderRadius: 11,
              border: "1px solid #E4E8EC",
              background: "#fff",
              fontSize: 13,
              fontWeight: 600,
              color: "#6B7280",
              cursor: "pointer",
            }}
          >
            Limpar
          </button>
        )}
      </motion.div>

      {/* Lista */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        style={{ ...CARD, overflow: "hidden" }}
      >
        {linhas.length === 0 ? (
          <div
            style={{
              padding: "64px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              textAlign: "center",
            }}
          >
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: "#F1F4F6",
                display: "grid",
                placeItems: "center",
              }}
            >
              <History style={{ width: 24, height: 24, color: "#8695A0" }} />
            </span>
            <p style={{ fontSize: 13, color: "#8695A0", maxWidth: 340 }}>
              {temFiltro
                ? "Nenhuma alteração com esses filtros."
                : "Nenhuma alteração registrada ainda. As mudanças feitas no painel aparecem aqui."}
            </p>
          </div>
        ) : (
          <div>
            {linhas.map((l, i) => {
              const mod: ModInfo = MODULOS[l.modulo] ?? {
                label: l.modulo,
                ...CINZA,
              };
              const temDados = l.dados && Object.keys(l.dados).length > 0;
              const expandida = aberta === l.id;
              const ultima = i === linhas.length - 1;
              const zebra = i % 2 === 1 ? "#FAFBFC" : "#fff";
              return (
                <div key={l.id}>
                  <button
                    onClick={() =>
                      temDados ? setAberta(expandida ? null : l.id) : undefined
                    }
                    style={{
                      width: "100%",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "14px 18px",
                      borderBottom:
                        ultima && !expandida ? "none" : "1px solid #EEF1F3",
                      background: zebra,
                      cursor: temDados ? "pointer" : "default",
                    }}
                  >
                    {temDados ? (
                      <ChevronRight
                        style={{
                          width: 15,
                          height: 15,
                          marginTop: 2,
                          flexShrink: 0,
                          color: "#8695A0",
                          transition: "transform .2s ease",
                          transform: expandida ? "rotate(90deg)" : "none",
                        }}
                      />
                    ) : (
                      <span style={{ width: 16, flexShrink: 0 }} />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 9px",
                            borderRadius: 999,
                            background: mod.bg,
                            color: mod.text,
                            border: `1px solid ${mod.border}`,
                          }}
                        >
                          {mod.label}
                        </span>
                        {l.patio_id && patios[l.patio_id] && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              color: "#8695A0",
                            }}
                          >
                            <Building2 style={{ width: 12, height: 12 }} />
                            {patios[l.patio_id]}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          marginTop: 5,
                          color: "#1F2937",
                          lineHeight: 1.4,
                        }}
                      >
                        {l.descricao}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        className="mono"
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#6B7280",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatarDataHora(l.criado_em)}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6B7280",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {l.usuario_nome ?? l.usuario_email ?? "—"}
                      </div>
                      {l.usuario_email && l.usuario_nome && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "#8695A0",
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {l.usuario_email}
                        </div>
                      )}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandida && temDados && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          overflow: "hidden",
                          borderBottom: ultima ? "none" : "1px solid #EEF1F3",
                          background: zebra,
                        }}
                      >
                        <div style={{ padding: "0 18px 16px 45px" }}>
                          <DadosView dados={l.dados as Record<string, unknown>} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: "#8695A0" }}>
            Página {pagina} de {totalPaginas}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              disabled={pagina <= 1}
              onClick={() => aplicar({ p: pagina - 1 })}
              style={{
                height: 38,
                padding: "0 15px",
                borderRadius: 11,
                border: "1px solid #E4E8EC",
                background: "#fff",
                fontSize: 13,
                fontWeight: 600,
                color: pagina <= 1 ? "#B4C0C8" : "#6B7280",
                cursor: pagina <= 1 ? "default" : "pointer",
              }}
            >
              Anterior
            </button>
            <button
              disabled={pagina >= totalPaginas}
              onClick={() => aplicar({ p: pagina + 1 })}
              style={{
                height: 38,
                padding: "0 15px",
                borderRadius: 11,
                border: "1px solid #E4E8EC",
                background: "#fff",
                fontSize: 13,
                fontWeight: 600,
                color: pagina >= totalPaginas ? "#B4C0C8" : "#6B7280",
                cursor: pagina >= totalPaginas ? "default" : "pointer",
              }}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Renderiza o jsonb `dados` de forma legível: diff antes→depois ou lista. */
function DadosView({ dados }: { dados: Record<string, unknown> }) {
  const fmt = (v: unknown): string => {
    if (v === null || v === undefined || v === "") return "—";
    if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  if ("antes" in dados && "depois" in dados) {
    const antes = (dados.antes ?? {}) as Record<string, unknown>;
    const depois = (dados.depois ?? {}) as Record<string, unknown>;
    const chaves = Array.from(
      new Set([...Object.keys(antes), ...Object.keys(depois)]),
    );
    if (chaves.length === 0) {
      return (
        <p style={{ fontSize: 12, color: "#8695A0", fontStyle: "italic" }}>
          Sem alteração de valores.
        </p>
      );
    }
    return (
      <ResponsiveTable
        className="rounded-xl border border-borda bg-fundo/50"
        corFade="from-fundo"
      >
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-texto-3">
              <th className="px-3 py-2 font-bold">Campo</th>
              <th className="px-3 py-2 font-bold">Antes</th>
              <th className="px-3 py-2 font-bold">Depois</th>
            </tr>
          </thead>
          <tbody>
            {chaves.map((k) => (
              <tr key={k} className="border-t border-borda">
                <td className="px-3 py-1.5 font-semibold text-texto-2">{k}</td>
                <td className="px-3 py-1.5 text-texto-3">{fmt(antes[k])}</td>
                <td className="px-3 py-1.5 text-texto font-medium">
                  {fmt(depois[k])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveTable>
    );
  }

  return (
    <div className="rounded-xl border border-borda bg-fundo/50 p-3 space-y-1">
      {Object.entries(dados).map(([k, v]) => (
        <div key={k} className="flex gap-2 text-xs">
          <span className="font-semibold text-texto-2 shrink-0">{k}:</span>
          <span className="text-texto-3 break-all">{fmt(v)}</span>
        </div>
      ))}
    </div>
  );
}
