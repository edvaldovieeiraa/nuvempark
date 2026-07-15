"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import {
  Wallet,
  Car,
  LogOut as SaidaIcon,
  Receipt,
  ParkingSquare,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatarDataHora } from "@/lib/format-data";
import { labelTicketStatus } from "@/lib/status-labels";
import { useToast } from "@/components/ui/toast";
import { SyncBadge } from "@/components/sync-badge";

type Patio = {
  id: string;
  nome: string;
  qtd_vagas: number;
  codigo_acesso?: string | null;
};
type Ticket = {
  id: string;
  placa: string;
  tipo_veiculo: string;
  status: string;
  entrada: string;
  saida: string | null;
  valor_cobrado: number | null;
  patio_id: string;
};

type Inicial = {
  patios: Patio[];
  patioNome: string;
  patioCodigo: string | null;
  noPatio: number;
  totalVagas: number;
  faturamentoHoje: number;
  saidasHoje: number;
  recentes: Ticket[];
  abertosPorPatio: Record<string, number>;
  sincronizadoEm: string | null;
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Dashboard ao vivo: KPIs animados + escuta da tabela tickets via Supabase
 * Realtime (respeita RLS — só o tenant do gestor). Evento novo → toast +
 * router.refresh para revalidar os dados do server.
 */
export function DashboardLive({ inicial }: { inicial: Inicial }) {
  const router = useRouter();
  const toast = useToast();
  const [aoVivo, setAoVivo] = useState(false);
  const ultimoEvento = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("tickets-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        (payload) => {
          // Toast com debounce de 3s p/ não inundar em rajadas de sync
          const agora = Date.now();
          if (agora - ultimoEvento.current > 3000) {
            ultimoEvento.current = agora;
            const novo = payload.new as Partial<Ticket> | null;
            if (payload.eventType === "INSERT" && novo?.placa) {
              toast.info("Entrada no pátio", `Veículo ${novo.placa} acabou de entrar.`);
            } else if (novo?.status === "fechado" && novo?.placa) {
              toast.sucesso(
                "Saída registrada",
                `${novo.placa} · ${novo.valor_cobrado != null ? moeda.format(Number(novo.valor_cobrado)) : ""}`,
              );
            }
          }
          router.refresh();
        },
      )
      .subscribe((status) => setAoVivo(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
    // toast é estável (useMemo no provider)
  }, [router, toast]);

  const {
    patios,
    patioNome,
    patioCodigo,
    noPatio,
    totalVagas,
    faturamentoHoje,
    saidasHoje,
    recentes,
    abertosPorPatio,
    sincronizadoEm,
  } = inicial;
  const ticketMedio = saidasHoje > 0 ? faturamentoHoje / saidasHoje : 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-[26px] font-black tracking-tight">Dashboard</h1>
          <p className="text-sm text-texto-2 flex items-center gap-2 flex-wrap">
            <b className="text-texto">{patioNome}</b>
            {patioCodigo && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(patioCodigo);
                  toast.sucesso(
                    "Copiado!",
                    `Código de acesso do app: ${patioCodigo}`,
                  );
                }}
                title="Código que o operador digita no app — clique para copiar"
                className="font-mono font-black tracking-[0.25em] text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-2 py-0.5 hover:bg-brand-100 transition-colors"
              >
                {patioCodigo}
              </button>
            )}
            <span className="text-texto-3">
              · {patios.length} {patios.length === 1 ? "pátio" : "pátios"} na
              rede
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SyncBadge iso={sincronizadoEm} />
          <span
            className={`inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-full transition-colors ${
              aoVivo
                ? "bg-brand-50 text-brand-700 border border-brand-200"
                : "bg-superficie text-texto-3 border border-borda"
            }`}
          >
            <span className="relative flex w-2 h-2">
              {aoVivo && (
                <span className="absolute inline-flex w-full h-full rounded-full bg-brand-500 animate-ping-slow" />
              )}
              <span
                className={`relative inline-flex w-2 h-2 rounded-full ${aoVivo ? "bg-brand-500" : "bg-texto-3"}`}
              />
            </span>
            {aoVivo ? "AO VIVO" : "conectando…"}
          </span>
        </div>
      </motion.header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          destaque
          indice={0}
          Icone={Wallet}
          label="Faturamento hoje"
          valor={faturamentoHoje}
          formato="moeda"
        />
        <Kpi
          indice={1}
          Icone={Car}
          label="No pátio agora"
          valor={noPatio}
          sufixo={totalVagas > 0 ? ` / ${totalVagas}` : ""}
        />
        <Kpi indice={2} Icone={SaidaIcon} label="Saídas hoje" valor={saidasHoje} />
        <Kpi
          indice={3}
          Icone={Receipt}
          label="Ticket médio"
          valor={ticketMedio}
          formato="moeda"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {/* Ocupação por pátio */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-borda flex items-center gap-2">
            <ParkingSquare className="w-4 h-4 text-brand-600" />
            <h2 className="font-bold text-sm">Ocupação por pátio</h2>
          </div>
          <div className="p-5 space-y-4">
            {patios.length === 0 ? (
              <Vazio texto="Nenhum pátio ativo." />
            ) : (
              patios.map((p, i) => {
                const ocupadas = abertosPorPatio[p.id] ?? 0;
                const pct =
                  p.qtd_vagas > 0
                    ? Math.min(100, (ocupadas / p.qtd_vagas) * 100)
                    : 0;
                const cheio = pct >= 90;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <span className="text-sm font-bold truncate">{p.nome}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        {p.codigo_acesso && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(p.codigo_acesso!);
                              toast.sucesso(
                                "Copiado!",
                                `Código do ${p.nome}: ${p.codigo_acesso}`,
                              );
                            }}
                            title="Código de acesso do app — clique para copiar"
                            className="font-mono font-black tracking-[0.2em] text-[11px] text-brand-700 bg-brand-50 border border-brand-200 rounded-md px-1.5 py-0.5 hover:bg-brand-100 transition-colors"
                          >
                            {p.codigo_acesso}
                          </button>
                        )}
                        <span className="text-xs font-semibold text-texto-2 tabular-nums">
                          {ocupadas}
                          {p.qtd_vagas > 0 && ` / ${p.qtd_vagas}`}
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-fundo overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{
                          duration: 0.9,
                          delay: 0.3 + i * 0.08,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className={`h-full rounded-full ${
                          cheio
                            ? "bg-gradient-to-r from-saida to-perigo"
                            : "bg-gradient-to-r from-brand-500 to-acento-teal"
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.section>

        {/* Últimos movimentos */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="lg:col-span-2 bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-borda">
            <h2 className="font-bold text-sm">Últimos movimentos</h2>
          </div>
          {recentes.length === 0 ? (
            <Vazio texto="Nenhum ticket ainda. Os movimentos do app aparecem aqui em tempo real." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                    <th className="px-5 py-3 font-bold">Placa</th>
                    <th className="px-5 py-3 font-bold">Tipo</th>
                    <th className="px-5 py-3 font-bold">Entrada</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {recentes.map((t, i) => (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + i * 0.04 }}
                      className="border-t border-borda hover:bg-brand-50/40 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className="font-black tracking-widest text-[13px] bg-fundo border border-borda rounded-md px-2 py-1">
                          {t.placa}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-texto-2 capitalize">
                        {t.tipo_veiculo}
                      </td>
                      <td className="px-5 py-3 text-texto-2 tabular-nums whitespace-nowrap">
                        {formatarDataHora(t.entrada)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusChip status={t.status} />
                      </td>
                      <td className="px-5 py-3 text-right font-bold tabular-nums">
                        {t.valor_cobrado != null
                          ? moeda.format(Number(t.valor_cobrado))
                          : "—"}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}

/* ---------- KPI com número animado ---------- */

function Kpi({
  label,
  valor,
  Icone,
  formato,
  sufixo = "",
  destaque = false,
  indice,
}: {
  label: string;
  valor: number;
  Icone: LucideIcon;
  formato?: "moeda";
  sufixo?: string;
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
      {destaque && (
        <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
      )}
      <div className="flex items-center justify-between">
        <span
          className={`text-[11px] font-bold uppercase tracking-wider ${
            destaque ? "text-white/75" : "text-texto-3"
          }`}
        >
          {label}
        </span>
        <span
          className={`w-8 h-8 rounded-lg grid place-items-center ${
            destaque ? "bg-white/15" : "bg-brand-50 text-brand-600"
          }`}
        >
          <Icone className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-2 text-[26px] font-black tabular-nums leading-none">
        <NumeroAnimado valor={valor} formato={formato} />
        {sufixo && (
          <span
            className={`text-base font-bold ${destaque ? "text-white/70" : "text-texto-3"}`}
          >
            {sufixo}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function NumeroAnimado({
  valor,
  formato,
}: {
  valor: number;
  formato?: "moeda";
}) {
  const mv = useMotionValue(0);
  const texto = useTransform(mv, (v) =>
    formato === "moeda" ? moeda.format(v) : String(Math.round(v)),
  );

  useEffect(() => {
    const controle = animate(mv, valor, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controle.stop();
  }, [valor, mv]);

  return <motion.span>{texto}</motion.span>;
}

/* ---------- Auxiliares ---------- */

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
      <span className="w-11 h-11 rounded-2xl bg-fundo grid place-items-center">
        <Inbox className="w-5 h-5 text-texto-3" />
      </span>
      <p className="text-sm text-texto-3 max-w-[280px]">{texto}</p>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const cfg =
    status === "aberto"
      ? { cls: "bg-brand-50 text-brand-700 border-brand-200", dot: "bg-brand-500", label: "no pátio" }
      : status === "fechado"
        ? { cls: "bg-fundo text-texto-2 border-borda", dot: "bg-texto-3", label: "saiu" }
        : { cls: "bg-saida-bg text-saida border-saida/20", dot: "bg-saida", label: labelTicketStatus(status) };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
