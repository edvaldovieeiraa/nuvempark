"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { AlertTriangle } from "lucide-react";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export type TicketRaw = {
  entrada: string;
  saida: string | null;
  status: string;
  tipo_veiculo: string | null;
  operador_id: string | null;
  valor_cobrado: number | null;
  motivo_isencao: string | null;
};

const VERDE = "#16A34A";
const AZUL = "#2563EB";
const VERMELHO = "#E11D48";
const POPPINS = "'Poppins', sans-serif";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function isoDia(dia: string, fim: boolean) {
  return new Date(`${dia}T${fim ? "23:59:59.999" : "00:00:00"}`).toISOString();
}
function fmtDur(min: number): string {
  if (min <= 0) return "—";
  if (min < 60) return `${Math.round(min)}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h${pad2(Math.round(min % 60))}`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
function mediana(v: number[]): number {
  if (v.length === 0) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function OcupacaoClient({
  patioNome,
  qtdVagas,
  di,
  df,
  tickets,
  operadores,
}: {
  patioNome: string;
  qtdVagas: number;
  di: string;
  df: string;
  tickets: TicketRaw[];
  operadores: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const m = useMemo(
    () => agregar(tickets, di, df, qtdVagas, operadores),
    [tickets, di, df, qtdVagas, operadores],
  );

  function aplicar(diNovo: string, dfNovo: string) {
    const params = new URLSearchParams();
    const patio = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    ).get("patio");
    if (patio) params.set("patio", patio);
    params.set("di", diNovo);
    params.set("df", dfNovo);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function preset(dias: number) {
    const agora = new Date();
    aplicar(
      new Date(agora.getTime() - dias * 86_400_000).toISOString(),
      agora.toISOString(),
    );
  }

  const diDia = ymd(new Date(Date.parse(di)));
  const dfDia = ymd(new Date(Date.parse(df)));
  const dias = Math.round((Date.parse(df) - Date.parse(di)) / 86_400_000);
  const permTipoMax = m.permTipo.length
    ? Math.max(...m.permTipo.map((p) => p.min))
    : 1;

  const chip = (ativo: boolean): React.CSSProperties => ({
    fontSize: 12,
    fontWeight: 700,
    padding: "7px 12px",
    borderRadius: 11,
    border: "none",
    cursor: "pointer",
    background: ativo ? "#1F2937" : "#F1F4F6",
    color: ativo ? "#fff" : "#6B7280",
  });
  const dateInput: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    padding: "7px 11px",
    borderRadius: 11,
    border: "1px solid #E4E8EC",
    color: "#1F2937",
    background: "#fff",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, color: "#1F2937" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 23, fontFamily: POPPINS, fontWeight: 700, letterSpacing: "-.02em" }}>
          Ocupação &amp; permanência
        </h2>
        <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
          <b style={{ color: "#1F2937" }}>{patioNome}</b> · análise do período
        </div>
      </div>

      {/* Filtros */}
      <div
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
        {([[7, "7 dias"], [15, "15 dias"], [30, "30 dias"]] as const).map(([d, l]) => (
          <button key={d} onClick={() => preset(d)} style={chip(dias === d)}>
            {l}
          </button>
        ))}
        <span style={{ width: 1, height: 22, background: "#E4E8EC", margin: "0 4px" }} />
        <input
          type="date"
          className="mono"
          value={diDia}
          max={dfDia}
          onChange={(e) => aplicar(isoDia(e.target.value, false), df)}
          style={dateInput}
        />
        <span style={{ fontSize: 12, color: "#8695A0" }}>até</span>
        <input
          type="date"
          className="mono"
          value={dfDia}
          min={diDia}
          onChange={(e) => aplicar(di, isoDia(e.target.value, true))}
          style={dateInput}
        />
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <Kpi titulo="Permanência média" valor={fmtDur(m.permMedia)} />
        <Kpi titulo="Ticket médio" valor={moeda.format(m.ticketMedio)} />
        <Kpi
          titulo="Ocupação máxima"
          valor={
            qtdVagas > 0
              ? `${m.ocupacaoMax} / ${qtdVagas}`
              : String(m.ocupacaoMax)
          }
          nota={
            qtdVagas > 0
              ? `${Math.round((m.ocupacaoMax / qtdVagas) * 100)}% da capacidade`
              : undefined
          }
        />
        <Kpi titulo="Total de tickets" valor={String(m.totalTickets)} />
      </div>

      {qtdVagas === 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "#B45309",
            background: "#FEF9EE",
            border: "1px solid #F5D9A8",
            borderRadius: 12,
            padding: "8px 12px",
          }}
        >
          <AlertTriangle style={{ width: 16, height: 16 }} />
          Capacidade não configurada (qtd. de vagas = 0) — a ocupação é mostrada
          em contagem absoluta.
        </div>
      )}

      {/* Gráficos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card titulo={qtdVagas > 0 ? "Ocupação média por hora (%)" : "Ocupação média por hora"}>
          <div style={{ padding: "16px 16px 10px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={m.ocupacaoHora}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F3" vertical={false} />
                <XAxis dataKey="hora" tick={{ fontSize: 10, fill: "#8695A0" }} interval={2} tickLine={false} axisLine={{ stroke: "#E4E8EC" }} />
                <YAxis tick={{ fontSize: 10, fill: "#8695A0" }} width={34} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey={qtdVagas > 0 ? "pct" : "media"} fill={VERDE} radius={[2.5, 2.5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          titulo="Entradas × saídas por hora"
          right={
            <span style={{ display: "flex", gap: 12, fontSize: 11, fontWeight: 400, color: "#6B7280" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: VERDE }} />
                entradas
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: AZUL }} />
                saídas
              </span>
            </span>
          }
        >
          <div style={{ padding: "16px 16px 10px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={m.fluxoHora}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F3" vertical={false} />
                <XAxis dataKey="hora" tick={{ fontSize: 10, fill: "#8695A0" }} interval={2} tickLine={false} axisLine={{ stroke: "#E4E8EC" }} />
                <YAxis tick={{ fontSize: 10, fill: "#8695A0" }} width={30} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="entradas" fill={VERDE} radius={[2, 2, 0, 0]} />
                <Bar dataKey="saidas" fill={AZUL} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card titulo="Faturamento por dia">
          <div style={{ padding: "16px 16px 10px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={m.faturamentoDia}>
                <defs>
                  <linearGradient id="fatFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={VERDE} stopOpacity={0.22} />
                    <stop offset="1" stopColor={VERDE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F3" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "#8695A0" }} tickLine={false} axisLine={{ stroke: "#E4E8EC" }} />
                <YAxis tick={{ fontSize: 10, fill: "#8695A0" }} width={44} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => moeda.format(Number(v))} />
                <Area type="monotone" dataKey="valor" stroke={VERDE} strokeWidth={2.5} fill="url(#fatFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card titulo="Permanência média por tipo">
          {m.permTipo.length === 0 ? (
            <p style={{ padding: "24px 18px", fontSize: 13, color: "#8695A0", textAlign: "center" }}>
              Sem tickets fechados no período.
            </p>
          ) : (
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
              {m.permTipo.map((p) => (
                <div key={p.tipo}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{p.tipo}</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>{fmtDur(p.min)}</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "#F1F4F6", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.max(4, Math.round((p.min / permTipoMax) * 100))}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: "linear-gradient(90deg,#2563EB,#60A5FA)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Permanência (fechados) + Atividade por operador */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 14, alignItems: "start" }}>
        <Card titulo="Permanência (fechados)">
          <div style={{ padding: 18, display: "flex", gap: 28 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#8695A0" }}>
                Média
              </div>
              <div style={{ marginTop: 5, fontSize: 22, fontFamily: POPPINS, fontWeight: 700 }}>{fmtDur(m.permMedia)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#8695A0" }}>
                Mediana
              </div>
              <div style={{ marginTop: 5, fontSize: 22, fontFamily: POPPINS, fontWeight: 700 }}>{fmtDur(m.permMediana)}</div>
            </div>
          </div>
        </Card>

        <Card titulo="Atividade por operador">
          {m.operadores.length === 0 ? (
            <p style={{ padding: "24px 18px", fontSize: 13, color: "#8695A0", textAlign: "center" }}>
              Sem atividade no período.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", background: "#FAFBFC" }}>
                    <th style={th()}>Operador</th>
                    <th style={th(true)}>Entradas</th>
                    <th style={th(true)}>Saídas</th>
                    <th style={{ ...th(true), padding: "10px 18px" }}>Valor cobrado</th>
                  </tr>
                </thead>
                <tbody>
                  {m.operadores.map((o) => (
                    <tr key={o.nome} style={{ borderTop: "1px solid #EEF1F3" }}>
                      <td style={{ padding: "11px 18px", fontWeight: 600 }}>{o.nome}</td>
                      <td className="mono" style={{ padding: "11px 12px", textAlign: "right", color: "#6B7280" }}>{o.entradas}</td>
                      <td className="mono" style={{ padding: "11px 12px", textAlign: "right", color: "#6B7280" }}>{o.saidas}</td>
                      <td className="mono" style={{ padding: "11px 18px", textAlign: "right", fontWeight: 800 }}>
                        {moeda.format(o.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Isenções */}
      <Card titulo={`Isenções — ${m.pctIsencao.toFixed(1)}% dos tickets`}>
        {m.isencoes.length === 0 ? (
          <p style={{ padding: "24px 18px", fontSize: 13, color: "#8695A0", textAlign: "center" }}>
            Nenhuma isenção no período.
          </p>
        ) : (
          <div style={{ padding: "16px 16px 10px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={m.isencoes} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: "#8695A0" }} tickLine={false} axisLine={{ stroke: "#E4E8EC" }} />
                <YAxis type="category" dataKey="motivo" tick={{ fontSize: 10, fill: "#8695A0" }} width={110} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="qtd" radius={[0, 3, 3, 0]}>
                  {m.isencoes.map((_, i) => (
                    <Cell key={i} fill={VERMELHO} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

function th(numeric = false): React.CSSProperties {
  return {
    padding: "10px 12px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    color: "#8695A0",
    textAlign: numeric ? "right" : "left",
  };
}

function Kpi({
  titulo,
  valor,
  nota,
}: {
  titulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 14,
        padding: "15px 16px",
        background: "#fff",
        border: "1px solid #E4E8EC",
        boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#8695A0" }}>
        {titulo}
      </div>
      <div style={{ marginTop: 7, fontSize: 22, fontFamily: POPPINS, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {valor}
      </div>
      {nota && <div style={{ fontSize: 11, color: "#8695A0", marginTop: 1 }}>{nota}</div>}
    </motion.div>
  );
}

function Card({
  titulo,
  right,
  children,
}: {
  titulo: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        borderRadius: 16,
        background: "#fff",
        border: "1px solid #E4E8EC",
        boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "13px 18px",
          borderBottom: "1px solid #E4E8EC",
          fontSize: 13,
          fontWeight: 700,
          display: right ? "flex" : undefined,
          alignItems: right ? "center" : undefined,
          justifyContent: right ? "space-between" : undefined,
        }}
      >
        <span>{titulo}</span>
        {right}
      </div>
      {children}
    </section>
  );
}

/* ---------------- Agregação (client, volume pequeno) ---------------- */

type Agregado = {
  ocupacaoHora: { hora: string; media: number; pct: number }[];
  fluxoHora: { hora: string; entradas: number; saidas: number }[];
  faturamentoDia: { dia: string; valor: number }[];
  permTipo: { tipo: string; min: number }[];
  operadores: { nome: string; entradas: number; saidas: number; valor: number }[];
  isencoes: { motivo: string; qtd: number }[];
  permMedia: number;
  permMediana: number;
  ticketMedio: number;
  ocupacaoMax: number;
  totalTickets: number;
  pctIsencao: number;
};

function agregar(
  tickets: TicketRaw[],
  di: string,
  df: string,
  qtdVagas: number,
  operadores: Record<string, string>,
): Agregado {
  const diMs = Date.parse(di);
  const dfMs = Date.parse(df);
  const tk = tickets.map((t) => ({
    e: Date.parse(t.entrada),
    s: t.saida ? Date.parse(t.saida) : null,
    status: t.status,
    tipo: t.tipo_veiculo ?? "outro",
    op: t.operador_id,
    valor: Number(t.valor_cobrado) || 0,
    isencao: t.motivo_isencao,
  }));

  const noPeriodoEntrada = (e: number) => e >= diMs && e <= dfMs;
  const noPeriodoSaida = (s: number | null) => s !== null && s >= diMs && s <= dfMs;

  // Ocupação por hora (amostra horária, hora local) + máximo simultâneo.
  const soma = new Array(24).fill(0);
  const amostras = new Array(24).fill(0);
  let ocupacaoMax = 0;
  for (let sample = diMs; sample <= dfMs; sample += 3_600_000) {
    const h = new Date(sample).getHours();
    let count = 0;
    for (const t of tk) {
      const end = t.s ?? dfMs;
      if (t.e <= sample && end > sample) count++;
    }
    soma[h] += count;
    amostras[h] += 1;
    if (count > ocupacaoMax) ocupacaoMax = count;
  }
  const ocupacaoHora = soma.map((s, h) => {
    const media = amostras[h] ? s / amostras[h] : 0;
    return {
      hora: pad2(h),
      media: Math.round(media * 10) / 10,
      pct: qtdVagas > 0 ? Math.round((media / qtdVagas) * 100) : 0,
    };
  });

  // Fluxo entradas × saídas por hora.
  const ent = new Array(24).fill(0);
  const sai = new Array(24).fill(0);
  for (const t of tk) {
    if (noPeriodoEntrada(t.e)) ent[new Date(t.e).getHours()]++;
    if (noPeriodoSaida(t.s)) sai[new Date(t.s as number).getHours()]++;
  }
  const fluxoHora = ent.map((e, h) => ({ hora: pad2(h), entradas: e, saidas: sai[h] }));

  // Fechados no período (saída dentro da janela).
  const fechados = tk.filter((t) => t.status === "fechado" && noPeriodoSaida(t.s));
  const duracoes = fechados.map((t) => ((t.s as number) - t.e) / 60_000);
  const permMedia = duracoes.length
    ? duracoes.reduce((a, b) => a + b, 0) / duracoes.length
    : 0;
  const permMediana = mediana(duracoes);

  // Ticket médio + faturamento diário (pagos).
  const pagos = fechados.filter((t) => t.valor > 0);
  const ticketMedio = pagos.length
    ? pagos.reduce((a, b) => a + b.valor, 0) / pagos.length
    : 0;
  const porDia: Record<string, number> = {};
  for (const t of pagos) {
    const dia = ymd(new Date(t.s as number));
    porDia[dia] = (porDia[dia] ?? 0) + t.valor;
  }
  const faturamentoDia = Object.entries(porDia)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dia, valor]) => ({ dia: dia.slice(5), valor }));

  // Permanência por tipo.
  const tipoAcc: Record<string, number[]> = {};
  for (const t of fechados) (tipoAcc[t.tipo] ??= []).push(((t.s as number) - t.e) / 60_000);
  const permTipo = Object.entries(tipoAcc)
    .map(([tipo, arr]) => ({
      tipo,
      min: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
    }))
    .sort((a, b) => b.min - a.min);

  // Atividade por operador (mapear id → nome; null → "—").
  const opAcc: Record<string, { entradas: number; saidas: number; valor: number }> = {};
  const nomeOp = (id: string | null) =>
    id ? (operadores[id] ?? id.slice(0, 6)) : "—";
  for (const t of tk) {
    const chave = t.op ?? "—";
    const a = (opAcc[chave] ??= { entradas: 0, saidas: 0, valor: 0 });
    if (noPeriodoEntrada(t.e)) a.entradas++;
    if (noPeriodoSaida(t.s)) {
      a.saidas++;
      a.valor += t.valor;
    }
  }

  // Isenções.
  const noPeriodo = tk.filter((t) => noPeriodoEntrada(t.e));
  const isentos = noPeriodo.filter((t) => t.isencao);
  const motAcc: Record<string, number> = {};
  for (const t of isentos) motAcc[t.isencao ?? "—"] = (motAcc[t.isencao ?? "—"] ?? 0) + 1;
  const isencoes = Object.entries(motAcc)
    .map(([motivo, qtd]) => ({ motivo, qtd }))
    .sort((a, b) => b.qtd - a.qtd);

  return {
    ocupacaoHora,
    fluxoHora,
    faturamentoDia,
    permTipo,
    operadores: Object.entries(opAcc)
      .map(([id, v]) => ({ nome: nomeOp(id === "—" ? null : id), ...v }))
      .filter((o) => o.entradas + o.saidas > 0)
      .sort((a, b) => b.valor - a.valor),
    isencoes,
    permMedia,
    permMediana,
    ticketMedio,
    ocupacaoMax,
    totalTickets: noPeriodo.length,
    pctIsencao: noPeriodo.length ? (isentos.length / noPeriodo.length) * 100 : 0,
  };
}
