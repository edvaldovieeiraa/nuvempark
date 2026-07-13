"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
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

const BRAND = "#059669";
const AZUL = "#2563eb";
const VERMELHO = "#e11d48";

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

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-[26px] font-black tracking-tight">
          Ocupação &amp; permanência
        </h1>
        <p className="text-sm text-texto-2">
          <b className="text-texto">{patioNome}</b> · análise do período
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-3 flex flex-wrap items-center gap-2">
        {[
          [7, "7 dias"],
          [15, "15 dias"],
          [30, "30 dias"],
        ].map(([d, l]) => (
          <button
            key={d}
            onClick={() => preset(d as number)}
            className="h-9 px-3 rounded-xl border border-borda bg-fundo text-xs font-bold text-texto-2 hover:border-brand-300 hover:text-brand-700 transition-colors"
          >
            {l}
          </button>
        ))}
        <div className="w-px h-6 bg-borda mx-1" />
        <input
          type="date"
          value={diDia}
          max={dfDia}
          onChange={(e) => aplicar(isoDia(e.target.value, false), df)}
          className="h-9 px-2.5 rounded-xl border border-borda bg-fundo text-sm font-semibold"
        />
        <span className="text-texto-3 text-sm">até</span>
        <input
          type="date"
          value={dfDia}
          min={diDia}
          onChange={(e) => aplicar(di, isoDia(e.target.value, true))}
          className="h-9 px-2.5 rounded-xl border border-borda bg-fundo text-sm font-semibold"
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="flex items-center gap-2 text-xs text-aviso bg-aviso-bg border border-aviso/25 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4" />
          Capacidade não configurada (qtd. de vagas = 0) — a ocupação é mostrada
          em contagem absoluta.
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card titulo={qtdVagas > 0 ? "Ocupação média por hora (%)" : "Ocupação média por hora"}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={m.ocupacaoHora}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={34} />
              <Tooltip />
              <Bar dataKey={qtdVagas > 0 ? "pct" : "media"} fill={BRAND} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card titulo="Entradas × saídas por hora">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={m.fluxoHora}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={30} />
              <Tooltip />
              <Bar dataKey="entradas" fill={BRAND} radius={[3, 3, 0, 0]} />
              <Bar dataKey="saidas" fill={AZUL} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card titulo="Faturamento por dia">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={m.faturamentoDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={44} />
              <Tooltip formatter={(v) => moeda.format(Number(v))} />
              <Line type="monotone" dataKey="valor" stroke={BRAND} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card titulo="Permanência média por tipo de veículo">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={m.permTipo} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="tipo" tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v) => fmtDur(Number(v))} />
              <Bar dataKey="min" fill={AZUL} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Permanência mediana + isenções */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card titulo="Permanência (fechados)">
          <div className="flex gap-8 px-4 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-texto-3 font-bold">
                Média
              </p>
              <p className="text-2xl font-black">{fmtDur(m.permMedia)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-texto-3 font-bold">
                Mediana
              </p>
              <p className="text-2xl font-black">{fmtDur(m.permMediana)}</p>
            </div>
          </div>
        </Card>

        <Card titulo={`Isenções — ${m.pctIsencao.toFixed(1)}% dos tickets`}>
          {m.isencoes.length === 0 ? (
            <p className="px-4 py-6 text-sm text-texto-3 text-center">
              Nenhuma isenção no período.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={m.isencoes} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="motivo" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="qtd" radius={[0, 3, 3, 0]}>
                  {m.isencoes.map((_, i) => (
                    <Cell key={i} fill={VERMELHO} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Atividade por operador */}
      <Card titulo="Atividade por operador">
        {m.operadores.length === 0 ? (
          <p className="px-4 py-6 text-sm text-texto-3 text-center">
            Sem atividade no período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                  <th className="px-4 py-2 font-bold">Operador</th>
                  <th className="px-4 py-2 font-bold text-right">Entradas</th>
                  <th className="px-4 py-2 font-bold text-right">Saídas</th>
                  <th className="px-4 py-2 font-bold text-right">Valor cobrado</th>
                </tr>
              </thead>
              <tbody>
                {m.operadores.map((o) => (
                  <tr key={o.nome} className="border-t border-borda">
                    <td className="px-4 py-2 font-semibold">{o.nome}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{o.entradas}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{o.saidas}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-bold">
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
  );
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
      className="bg-superficie border border-borda rounded-2xl p-4 shadow-[var(--shadow-card)]"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-texto-3">
        {titulo}
      </p>
      <p className="text-2xl font-black tabular-nums mt-1">{valor}</p>
      {nota && <p className="text-[11px] text-texto-3 mt-0.5">{nota}</p>}
    </motion.div>
  );
}

function Card({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-4 py-3 border-b border-borda">
        <h3 className="font-bold text-sm">{titulo}</h3>
      </div>
      <div className="p-2">{children}</div>
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
