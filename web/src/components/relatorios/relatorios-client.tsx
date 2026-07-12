"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  CalendarDays,
  Trophy,
  CreditCard,
  Car,
} from "lucide-react";

type Dia = { dia: string; rotulo: string; total: number; saidas: number };
type PorForma = { forma: string; total: number };
type PorVeiculo = { tipo: string; total: number };

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function RelatoriosClient({
  patioNome,
  porDia,
  porForma,
  porVeiculo,
}: {
  patioNome: string;
  porDia: Dia[];
  porForma: PorForma[];
  porVeiculo: PorVeiculo[];
}) {
  const [focado, setFocado] = useState<Dia | null>(null);

  const total30 = porDia.reduce((s, d) => s + d.total, 0);
  const saidas30 = porDia.reduce((s, d) => s + d.saidas, 0);
  const diasComMovimento = porDia.filter((d) => d.total > 0).length;
  const mediaDia = diasComMovimento > 0 ? total30 / diasComMovimento : 0;
  const melhorDia = porDia.reduce(
    (m, d) => (d.total > m.total ? d : m),
    porDia[0],
  );
  const maxDia = Math.max(1, ...porDia.map((d) => d.total));

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[26px] font-black tracking-tight">Relatórios</h1>
        <p className="text-sm text-texto-2">
          <b className="text-texto">{patioNome}</b> · faturamento dos últimos 30
          dias.
        </p>
      </motion.header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardKpi
          indice={0}
          destaque
          Icone={TrendingUp}
          rotulo="Total 30 dias"
          valor={moeda.format(total30)}
        />
        <CardKpi
          indice={1}
          Icone={CalendarDays}
          rotulo="Média por dia ativo"
          valor={moeda.format(mediaDia)}
        />
        <CardKpi
          indice={2}
          Icone={Car}
          rotulo="Saídas pagas"
          valor={String(saidas30)}
        />
        <CardKpi
          indice={3}
          Icone={Trophy}
          rotulo={`Melhor dia (${melhorDia?.rotulo ?? "—"})`}
          valor={moeda.format(melhorDia?.total ?? 0)}
        />
      </div>

      {/* Gráfico de barras 30 dias */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm">Faturamento por dia</h2>
          <span className="text-xs font-bold text-texto-2 tabular-nums h-4">
            {focado
              ? `${focado.rotulo} · ${moeda.format(focado.total)} · ${focado.saidas} saídas`
              : ""}
          </span>
        </div>
        <div
          className="flex items-end gap-[3px] h-40"
          onMouseLeave={() => setFocado(null)}
        >
          {porDia.map((d, i) => (
            <div
              key={d.dia}
              className="flex-1 h-full flex flex-col justify-end group cursor-default"
              onMouseEnter={() => setFocado(d)}
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{
                  height: `${Math.max(d.total > 0 ? 4 : 1.5, (d.total / maxDia) * 100)}%`,
                }}
                transition={{
                  duration: 0.7,
                  delay: 0.2 + i * 0.02,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`w-full rounded-t-md transition-colors ${
                  d.total > 0
                    ? "bg-gradient-to-t from-brand-600 to-brand-400 group-hover:from-brand-700 group-hover:to-acento-teal"
                    : "bg-borda"
                }`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] font-bold text-texto-3 tabular-nums">
          <span>{porDia[0]?.rotulo}</span>
          <span>{porDia[14]?.rotulo}</span>
          <span>{porDia[29]?.rotulo}</span>
        </div>
      </motion.section>

      {/* Quebras */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Quebra
          indice={0}
          Icone={CreditCard}
          titulo="Por forma de pagamento"
          linhas={porForma
            .sort((a, b) => b.total - a.total)
            .map((f) => ({
              rotulo: f.forma.replace("_", " "),
              valor: f.total,
            }))}
        />
        <Quebra
          indice={1}
          Icone={Car}
          titulo="Por tipo de veículo"
          linhas={porVeiculo
            .sort((a, b) => b.total - a.total)
            .map((v) => ({ rotulo: v.tipo, valor: v.total }))}
        />
      </div>
    </div>
  );
}

function CardKpi({
  rotulo,
  valor,
  Icone,
  destaque = false,
  indice,
}: {
  rotulo: string;
  valor: string;
  Icone: React.ComponentType<{ className?: string }>;
  destaque?: boolean;
  indice: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: indice * 0.07 }}
      whileHover={{ y: -3 }}
      className={`relative overflow-hidden rounded-2xl p-5 transition-shadow ${
        destaque
          ? "bg-gradient-to-br from-brand-700 via-brand-600 to-acento-teal text-white shadow-[var(--shadow-brand)]"
          : "bg-superficie border border-borda shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[11px] font-bold uppercase tracking-wider ${
            destaque ? "text-white/75" : "text-texto-3"
          }`}
        >
          {rotulo}
        </span>
        <span
          className={`w-8 h-8 rounded-lg grid place-items-center ${
            destaque ? "bg-white/15" : "bg-brand-50 text-brand-600"
          }`}
        >
          <Icone className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-2 text-[24px] font-black tabular-nums leading-none">
        {valor}
      </div>
    </motion.div>
  );
}

function Quebra({
  titulo,
  linhas,
  Icone,
  indice,
}: {
  titulo: string;
  linhas: { rotulo: string; detalhe?: string; valor: number }[];
  Icone: React.ComponentType<{ className?: string }>;
  indice: number;
}) {
  const max = Math.max(1, ...linhas.map((l) => l.valor));
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.18 + indice * 0.06 }}
      className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center">
          <Icone className="w-4 h-4 text-brand-600" />
        </span>
        <h2 className="font-bold text-sm">{titulo}</h2>
      </div>
      {linhas.length === 0 ? (
        <p className="text-sm text-texto-3 py-4 text-center">Sem dados no período.</p>
      ) : (
        <div className="space-y-3.5">
          {linhas.map((l, i) => (
            <div key={l.rotulo}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-bold capitalize">
                  {l.rotulo}
                  {l.detalhe && (
                    <span className="ml-2 text-[11px] font-semibold text-texto-3">
                      {l.detalhe}
                    </span>
                  )}
                </span>
                <span className="text-sm font-bold tabular-nums">
                  {moeda.format(l.valor)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-fundo overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(l.valor / max) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.06 }}
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-acento-teal"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}
