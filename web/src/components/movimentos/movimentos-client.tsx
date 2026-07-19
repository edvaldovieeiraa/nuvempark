"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Inbox, Filter } from "lucide-react";
import { SyncBadge } from "@/components/sync-badge";
import { formatarDataHora } from "@/lib/format-data";
import { FotoVeiculoModal } from "@/components/foto-veiculo/foto-veiculo-modal";
import { ResponsiveTable } from "@/components/ui/responsive-table";

type Ticket = {
  id: string;
  placa: string;
  tipo_veiculo: string;
  status: string;
  entrada: string;
  saida: string | null;
  valor_cobrado: number | null;
  forma_pagamento: string | null;
  motivo_isencao: string | null;
  origem: string;
  foto_entrada_path: string | null;
  /** Quem registrou a entrada. */
  operador_id: string | null;
  /** Quem VALIDOU a saída. Nulo em ticket aberto e no histórico antigo. */
  operador_saida_id: string | null;
};
type Filtros = { q: string; status: string; periodo: string };

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const POPPINS = "'Poppins', sans-serif";

const PERIODOS = [
  { valor: "hoje", rotulo: "Hoje" },
  { valor: "7d", rotulo: "7 dias" },
  { valor: "30d", rotulo: "30 dias" },
  { valor: "tudo", rotulo: "Tudo" },
];

// Tokens do protótipo (mesma linguagem visual do Dashboard reconstruído).
const CARD: CSSProperties = {
  background: "#fff",
  border: "1px solid #E4E8EC",
  borderRadius: 16,
  boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
};
const KPI_LABEL: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "#8695A0",
};
const KPI_NUM: CSSProperties = {
  marginTop: 7,
  fontSize: 22,
  fontFamily: POPPINS,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
};
const TH: CSSProperties = {
  padding: "11px 12px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "#8695A0",
};

export function MovimentosClient({
  tickets,
  total,
  patioNome,
  patioId,
  sincronizadoEm,
  filtros,
}: {
  tickets: Ticket[];
  /** ticket.id → URL assinada da foto de entrada (assinadas em lote). */
  fotos: Record<string, string>;
  /** operador_id → nome (join manual: a tabela não tem FK). */
  operadores: Record<string, string>;
  /** ticket_id → nome, derivado do caixa. Só para o histórico sem a coluna. */
  saidaPeloCaixa: Record<string, string>;
  total: number;
  patioNome: string;
  patioId: string;
  sincronizadoEm: string | null;
  filtros: Filtros;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busca, setBusca] = useState(filtros.q);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [detalhe, setDetalhe] = useState<Ticket | null>(null);

  // Filtros começam abertos se houver algum ativo — nunca esconder um filtro em uso.
  const filtrosAtivos =
    filtros.q !== "" || filtros.status !== "todos" || filtros.periodo !== "7d";
  const [mostrarFiltros, setMostrarFiltros] = useState(filtrosAtivos);

  function aplicar(mudanca: Partial<Filtros>) {
    const f = { ...filtros, q: busca, ...mudanca };
    const params = new URLSearchParams();
    params.set("patio", patioId); // preserva o escopo do pátio
    if (f.q) params.set("q", f.q);
    if (f.status !== "todos") params.set("status", f.status);
    if (f.periodo !== "7d") params.set("periodo", f.periodo);
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (busca === filtros.q) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => aplicar({ q: busca }), 350);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const faturado = tickets
    .filter((t) => t.status === "fechado")
    .reduce((s, t) => s + (Number(t.valor_cobrado) || 0), 0);

  // KPIs derivados dos tickets carregados (sem inventar dado).
  const entradas = tickets.length;
  const saidas = tickets.filter((t) => t.saida != null).length;
  const permMediaMin = tickets.length
    ? Math.round(
        tickets.reduce((s, t) => s + permanenciaMin(t.entrada, t.saida), 0) /
          tickets.length,
      )
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Cabeçalho */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 23,
              fontFamily: POPPINS,
              fontWeight: 700,
              letterSpacing: "-.02em",
            }}
          >
            Movimentos
          </h2>
          <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
            <b style={{ color: "#1F2937" }}>{patioNome}</b> · {total}{" "}
            {total === 1 ? "ticket" : "tickets"} ·{" "}
            <b style={{ color: "#16A34A" }}>{moeda.format(faturado)}</b> faturado
            {total > 100 && " · 100 mais recentes"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SyncBadge iso={sincronizadoEm} />
          <button
            type="button"
            onClick={() => setMostrarFiltros((v) => !v)}
            aria-expanded={mostrarFiltros}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              height: 38,
              padding: "0 13px",
              borderRadius: 11,
              border: "1px solid #E4E8EC",
              background: mostrarFiltros ? "#F1F4F6" : "#fff",
              fontSize: 13,
              fontWeight: 700,
              color: "#6B7280",
              cursor: "pointer",
            }}
          >
            <Filter style={{ width: 15, height: 15 }} />
            Filtros
          </button>
        </div>
      </motion.div>

      {/* Painel de filtros — mesma lógica, atrás do botão Filtros */}
      <AnimatePresence initial={false}>
        {mostrarFiltros && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                ...CARD,
                padding: 12,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{ position: "relative", flex: 1, minWidth: 200 }}
              >
                <Search
                  style={{
                    position: "absolute",
                    left: 11,
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
                  className="mono"
                  style={{
                    width: "100%",
                    height: 38,
                    paddingLeft: 34,
                    paddingRight: 12,
                    borderRadius: 11,
                    border: "1px solid #E4E8EC",
                    background: "#FAFBFC",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: "#1F2937",
                    outline: "none",
                  }}
                />
              </div>

              <select
                value={filtros.status}
                onChange={(e) => aplicar({ status: e.target.value })}
                style={{
                  height: 38,
                  padding: "0 12px",
                  borderRadius: 11,
                  border: "1px solid #E4E8EC",
                  background: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#6B7280",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="todos">Todos os status</option>
                <option value="aberto">No pátio</option>
                <option value="fechado">Finalizados</option>
                <option value="cancelado">Cancelados</option>
              </select>

              <div
                style={{
                  display: "inline-flex",
                  padding: 3,
                  borderRadius: 12,
                  border: "1px solid #E4E8EC",
                  background: "#F1F4F6",
                }}
              >
                {PERIODOS.map((p) => {
                  const ativo = filtros.periodo === p.valor;
                  return (
                    <button
                      key={p.valor}
                      type="button"
                      onClick={() => aplicar({ periodo: p.valor })}
                      style={{
                        position: "relative",
                        padding: "0 14px",
                        height: 30,
                        borderRadius: 9,
                        border: "none",
                        background: "transparent",
                        fontSize: 12,
                        fontWeight: 700,
                        color: ativo ? "#fff" : "#6B7280",
                        cursor: "pointer",
                      }}
                    >
                      {ativo && (
                        <motion.span
                          layoutId="periodo-ativo"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 34,
                          }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: 9,
                            background:
                              "linear-gradient(90deg,#16A34A,#22C55E)",
                          }}
                        />
                      )}
                      <span style={{ position: "relative" }}>{p.rotulo}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
        }}
      >
        <div style={{ ...CARD, borderRadius: 14, padding: "15px 16px" }}>
          <div style={KPI_LABEL}>Entradas</div>
          <div style={{ ...KPI_NUM, color: "#16A34A" }}>{entradas}</div>
        </div>
        <div style={{ ...CARD, borderRadius: 14, padding: "15px 16px" }}>
          <div style={KPI_LABEL}>Saídas</div>
          <div style={{ ...KPI_NUM, color: "#F97316" }}>{saidas}</div>
        </div>
        <div style={{ ...CARD, borderRadius: 14, padding: "15px 16px" }}>
          <div style={KPI_LABEL}>Permanência média</div>
          <div style={KPI_NUM}>{entradas ? fmtDur(permMediaMin) : "—"}</div>
        </div>
      </motion.div>

      {/* Tabela */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        style={{ ...CARD, overflow: "hidden" }}
      >
        {tickets.length === 0 ? (
          <div
            style={{
              padding: "56px 20px",
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
                borderRadius: 14,
                background: "#F1F4F6",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Inbox style={{ width: 24, height: 24, color: "#8695A0" }} />
            </span>
            <p style={{ margin: 0, fontSize: 13, color: "#8695A0" }}>
              Nenhum movimento com esses filtros.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile (< md): cards empilhados — mesmo clique abre a foto */}
            <ul
              className="md:hidden"
              style={{ listStyle: "none", margin: 0, padding: 0 }}
            >
              {tickets.map((t, i) => (
                <li
                  key={t.id}
                  onClick={() => setDetalhe(t)}
                  style={{
                    padding: "12px 16px",
                    borderTop: i === 0 ? "none" : "1px solid #EEF1F3",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontWeight: 700,
                        letterSpacing: ".1em",
                        fontSize: 13,
                        background: "#F1F4F6",
                        border: "1px solid #E4E8EC",
                        borderRadius: 6,
                        padding: "3px 8px",
                      }}
                    >
                      {t.placa}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontWeight: 800,
                        fontVariantNumeric: "tabular-nums",
                        fontSize: 13,
                        color: t.valor_cobrado != null ? "#1F2937" : "#8695A0",
                      }}
                    >
                      {t.valor_cobrado != null
                        ? moeda.format(Number(t.valor_cobrado))
                        : "—"}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <StatusChip status={t.status} origem={t.origem} />
                    <span
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        textTransform: "capitalize",
                      }}
                    >
                      {t.tipo_veiculo}
                    </span>
                  </div>
                  <div
                    className="mono"
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      color: "#8695A0",
                    }}
                  >
                    {formatarDataHora(t.entrada)}
                    {t.saida && ` → ${formatarDataHora(t.saida)}`}
                    {` · ${fmtDur(permanenciaMin(t.entrada, t.saida))}`}
                  </div>
                </li>
              ))}
            </ul>

            {/* md+: tabela completa com rolagem horizontal */}
            <ResponsiveTable wrapperClassName="hidden md:block">
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ textAlign: "left", background: "#FAFBFC" }}>
                    <th style={{ ...TH, padding: "11px 18px" }}>Placa</th>
                    <th style={TH}>Tipo</th>
                    <th style={TH}>Entrada</th>
                    <th style={TH}>Saída</th>
                    <th style={TH}>Permanência</th>
                    <th style={{ ...TH, textAlign: "right" }}>Valor</th>
                    <th style={{ ...TH, padding: "11px 18px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t, i) => {
                    const zebra: CSSProperties =
                      i % 2 === 1 ? { background: "#FAFBFC" } : {};
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setDetalhe(t)}
                        style={{
                          borderTop: "1px solid #EEF1F3",
                          cursor: "pointer",
                          ...zebra,
                        }}
                      >
                        <td style={{ padding: "12px 18px" }}>
                          <span
                            className="mono"
                            style={{ fontWeight: 700, letterSpacing: ".1em" }}
                          >
                            {t.placa}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px 12px",
                            color: "#6B7280",
                            textTransform: "capitalize",
                          }}
                        >
                          {t.tipo_veiculo}
                        </td>
                        <td
                          className="mono"
                          style={{
                            padding: "12px 12px",
                            color: "#6B7280",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatarDataHora(t.entrada)}
                        </td>
                        <td
                          className="mono"
                          style={{
                            padding: "12px 12px",
                            color: t.saida ? "#6B7280" : "#8695A0",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatarDataHora(t.saida)}
                        </td>
                        <td
                          className="mono"
                          style={{ padding: "12px 12px", color: "#6B7280" }}
                        >
                          {fmtDur(permanenciaMin(t.entrada, t.saida))}
                        </td>
                        <td
                          className="mono"
                          style={{
                            padding: "12px 12px",
                            textAlign: "right",
                            fontWeight: 800,
                            color: t.valor_cobrado != null ? "#1F2937" : "#8695A0",
                          }}
                        >
                          {t.valor_cobrado != null
                            ? moeda.format(Number(t.valor_cobrado))
                            : "—"}
                        </td>
                        <td style={{ padding: "12px 18px" }}>
                          <StatusChip status={t.status} origem={t.origem} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ResponsiveTable>
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {detalhe && (
          <FotoVeiculoModal
            key={detalhe.id}
            ticket={detalhe}
            fechar={() => setDetalhe(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** Permanência em minutos (aberto → até agora). */
function permanenciaMin(entrada: string, saida: string | null): number {
  const fim = saida ? new Date(saida).getTime() : Date.now();
  return Math.max(0, Math.round((fim - new Date(entrada).getTime()) / 60000));
}

/** `32m` · `1h 28m` · `2d 3h` — no formato do protótipo. */
function fmtDur(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function StatusChip({ status, origem }: { status: string; origem: string }) {
  // Mensalista (origem=plano) tem chip próprio, como no protótipo.
  const cfg =
    origem === "plano"
      ? { bg: "#F3EEFE", border: "#DDD0FB", color: "#7C3AED", label: "mensalista", dot: "" }
      : status === "aberto"
        ? { bg: "#DCFCE7", border: "#BBF7D0", color: "#16A34A", label: "no pátio", dot: "#22C55E" }
        : status === "fechado"
          ? { bg: "#F1F4F6", border: "#E4E8EC", color: "#6B7280", label: "finalizado", dot: "" }
          : status === "cancelado"
            ? { bg: "#FEE2E2", border: "#FECACA", color: "#DC2626", label: "cancelado", dot: "" }
            : { bg: "#F1F4F6", border: "#E4E8EC", color: "#6B7280", label: status, dot: "" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 999,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
      }}
    >
      {cfg.dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: cfg.dot,
          }}
        />
      )}
      {cfg.label}
    </span>
  );
}
