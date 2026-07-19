"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { Clock, Receipt } from "lucide-react";

type Dia = { dia: string; rotulo: string; total: number; saidas: number };
type PorForma = { forma: string; total: number };
type PorVeiculo = { tipo: string; total: number };

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const POPPINS = "'Poppins', sans-serif";

// Tokens do protótipo.
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
  fontSize: 20,
  fontFamily: POPPINS,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
};
const CARD_HEAD: CSSProperties = {
  padding: "14px 18px",
  borderBottom: "1px solid #E4E8EC",
  fontSize: 13,
  fontWeight: 700,
};

function diaSemana(iso: string): string {
  const wd = new Date(`${iso}T12:00:00`)
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "");
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

function periodoRotulo(inicio: string, fim: string): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  return `${fmt(inicio)} – ${fmt(fim)}`;
}

export function RelatoriosClient({
  patioNome,
  porDia,
}: {
  patioNome: string;
  porDia: Dia[];
  porForma: PorForma[];
  porVeiculo: PorVeiculo[];
}) {
  const total30 = porDia.reduce((s, d) => s + d.total, 0);
  const saidas30 = porDia.reduce((s, d) => s + d.saidas, 0);
  const diasComMovimento = porDia.filter((d) => d.total > 0).length;
  const mediaDia = diasComMovimento > 0 ? total30 / diasComMovimento : 0;
  const ticketMedio = saidas30 > 0 ? total30 / saidas30 : 0;
  const maxDia = Math.max(1, ...porDia.map((d) => d.total));

  // Ranking real "Melhores dias": ordena por faturamento, só dias com movimento.
  const melhoresDias = [...porDia]
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Geometria do gráfico de área+linha (mesmos dados, recolorido em verde).
  const VB_W = 720;
  const X0 = 24;
  const X1 = 696;
  const Y_TOP = 24;
  const Y_BASE = 180;
  const n = porDia.length;
  const px = (i: number) => (n <= 1 ? X0 : X0 + (i * (X1 - X0)) / (n - 1));
  const py = (v: number) => Y_BASE - (v / maxDia) * (Y_BASE - Y_TOP);
  const pontos = porDia.map((d, i) => ({ x: px(i), y: py(d.total) }));
  const linePath = pontos
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = pontos.length
    ? `M${pontos[0].x.toFixed(1)},${Y_BASE} ` +
      pontos.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
      ` L${pontos[pontos.length - 1].x.toFixed(1)},${Y_BASE} Z`
    : "";
  const dot = pontos[pontos.length - 1];

  const eixoIdx = [0, 7, 14, 22, 29].filter((i) => i < n);

  // Exporta o faturamento diário real (dado já carregado, sem inventar nada).
  function exportarCsv() {
    const linhas = [
      ["Dia", "Faturamento", "Saidas"],
      ...porDia.map((d) => [d.dia, d.total.toFixed(2), String(d.saidas)]),
    ];
    const csv = linhas.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio-faturamento.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

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
            Relatórios
          </h2>
          <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
            <b style={{ color: "#1F2937" }}>{patioNome}</b>
            {n > 0 && ` · ${periodoRotulo(porDia[0].dia, porDia[n - 1].dia)}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            title="Últimos 30 dias"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              height: 38,
              padding: "0 13px",
              borderRadius: 11,
              border: "1px solid #E4E8EC",
              background: "#fff",
              fontSize: 13,
              fontWeight: 700,
              color: "#6B7280",
              cursor: "pointer",
            }}
          >
            <Clock style={{ width: 15, height: 15 }} />
            Período
          </button>
          <button
            type="button"
            onClick={exportarCsv}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              height: 38,
              padding: "0 15px",
              borderRadius: 11,
              border: "none",
              background: "linear-gradient(90deg,#16A34A,#22C55E)",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 8px 22px -8px rgba(22,163,74,.5)",
            }}
          >
            <Receipt style={{ width: 15, height: 15 }} />
            Exportar
          </button>
        </div>
      </motion.div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
        }}
      >
        <CardKpi rotulo="Faturamento" valor={moeda.format(total30)} destaque />
        <CardKpi rotulo="Veículos" valor={String(saidas30)} />
        <CardKpi rotulo="Ticket médio" valor={moeda.format(ticketMedio)} />
        <CardKpi rotulo="Média/dia" valor={moeda.format(mediaDia)} />
      </div>

      {/* Gráfico + ranking */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* Faturamento por dia — área+linha em verde */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          style={{ ...CARD, overflow: "hidden" }}
        >
          <div
            style={{
              ...CARD_HEAD,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
              Faturamento por dia
            </h3>
            <span className="mono" style={{ fontSize: 11, color: "#8695A0" }}>
              R$
            </span>
          </div>
          <div style={{ padding: "18px 12px 8px" }}>
            <svg
              viewBox={`0 0 ${VB_W} 210`}
              style={{ width: "100%", height: "auto", display: "block" }}
            >
              <defs>
                <linearGradient id="fillRel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#22C55E" stopOpacity=".26" />
                  <stop offset="1" stopColor="#22C55E" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1={X0} y1={60} x2={X1} y2={60} stroke="#EEF1F3" strokeWidth={1} />
              <line x1={X0} y1={120} x2={X1} y2={120} stroke="#EEF1F3" strokeWidth={1} />
              <line x1={X0} y1={180} x2={X1} y2={180} stroke="#EEF1F3" strokeWidth={1} />
              {areaPath && <path d={areaPath} fill="url(#fillRel)" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {dot && (
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r={5}
                  fill="#16A34A"
                  stroke="#fff"
                  strokeWidth={2.5}
                />
              )}
            </svg>
            <div
              className="mono"
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0 24px 8px",
                fontSize: 10,
                color: "#8695A0",
              }}
            >
              {eixoIdx.map((i) => (
                <span key={i}>{porDia[i].rotulo}</span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Melhores dias — ranking real */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
          style={{ ...CARD, overflow: "hidden" }}
        >
          <div style={CARD_HEAD}>Melhores dias</div>
          {melhoresDias.length === 0 ? (
            <p
              style={{
                margin: 0,
                padding: "28px 18px",
                fontSize: 13,
                color: "#8695A0",
                textAlign: "center",
              }}
            >
              Sem dados no período.
            </p>
          ) : (
            <div style={{ padding: "6px 10px" }}>
              {melhoresDias.map((d, i) => {
                const zebra = i % 2 === 1;
                const corRank = i < 2 ? "#16A34A" : "#8695A0";
                return (
                  <div
                    key={d.dia}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "9px 8px",
                      background: zebra ? "#FAFBFC" : "transparent",
                      borderRadius: zebra ? 9 : 0,
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        width: 22,
                        fontSize: 12,
                        fontWeight: 700,
                        color: corRank,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {diaSemana(d.dia)} {d.rotulo}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontFamily: POPPINS,
                        fontWeight: 700,
                        fontSize: 13,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {moeda.format(d.total)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function CardKpi({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div style={{ ...CARD, borderRadius: 14, padding: "15px 16px" }}>
      <div style={KPI_LABEL}>{rotulo}</div>
      <div style={{ ...KPI_NUM, color: destaque ? "#16A34A" : "#1F2937" }}>
        {valor}
      </div>
    </div>
  );
}
