"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import {
  Car,
  LogOut as SaidaIcon,
  Users,
  Plus,
  FileCheck,
  Clock,
  Bell,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
  mensalistas: number;
  recentes: Ticket[];
  abertosPorPatio: Record<string, number>;
  sincronizadoEm: string | null;
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const hora = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

// Fontes do redesign (carregadas no layout raiz).
const LIBRE = "'Libre Franklin', sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

function saudacao(): string {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/**
 * Dashboard ao vivo (redesign) — KPIs animados + escuta de `tickets` via
 * Supabase Realtime (respeita RLS). Evento novo → toast + router.refresh.
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
  }, [router, toast]);

  const {
    patios,
    patioNome,
    patioCodigo,
    noPatio,
    totalVagas,
    faturamentoHoje,
    saidasHoje,
    mensalistas,
    recentes,
    sincronizadoEm,
  } = inicial;
  const ticketMedio = saidasHoje > 0 ? faturamentoHoje / saidasHoje : 0;

  return (
    <div
      className="max-w-6xl"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: "#17212B" }}
    >
      {/* ── Cabeçalho ── */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between gap-3 mb-4"
      >
        <div>
          <div style={{ fontSize: 12, color: "#5A6B78", fontWeight: 600 }}>
            {saudacao()} 👋
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5"
              style={{
                fontFamily: LIBRE,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              {patioNome}
            </span>
            {patioCodigo && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(patioCodigo);
                  toast.sucesso("Copiado!", `Código de acesso do app: ${patioCodigo}`);
                }}
                title="Código que o operador digita no app — clique para copiar"
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  color: "#0E7C74",
                  background: "#E6F4F2",
                  border: "1px solid #C9E7E3",
                  borderRadius: 8,
                  padding: "2px 8px",
                }}
              >
                {patioCodigo}
              </button>
            )}
            <span style={{ fontSize: 12, color: "#8695A0" }}>
              · {patios.length} {patios.length === 1 ? "pátio" : "pátios"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SyncBadge iso={sincronizadoEm} />
          <span
            className="relative inline-grid place-items-center"
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.8)",
              background: "rgba(255,255,255,.7)",
              color: "#46545E",
            }}
            title="Notificações"
          >
            <Bell className="w-[19px] h-[19px]" />
            {aoVivo && (
              <span
                style={{
                  position: "absolute",
                  top: 9,
                  right: 10,
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "#2DD4BF",
                  border: "2px solid #fff",
                }}
              />
            )}
          </span>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-4 items-start">
        {/* ── Coluna esquerda: hero + stats + ações ── */}
        <div className="flex flex-col gap-3.5">
          {/* Hero: faturamento hoje */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 22,
              padding: 22,
              background:
                "linear-gradient(135deg,#1B2733,#243240 55%,#2A3947)",
              color: "#fff",
              boxShadow: "0 24px 50px -22px rgba(20,29,40,.6)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -30,
                right: -10,
                width: 180,
                height: 180,
                borderRadius: 999,
                background: "rgba(45,212,191,.18)",
                filter: "blur(46px)",
              }}
            />
            <div className="relative flex items-center justify-between">
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,.55)",
                }}
              >
                Faturamento hoje
              </span>
              <span
                className="inline-flex items-center gap-1.5"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "5px 10px",
                  borderRadius: 999,
                  background: "rgba(45,212,191,.16)",
                  color: "#5EEAD4",
                  border: "1px solid rgba(94,234,212,.34)",
                }}
              >
                <span className="relative flex" style={{ width: 7, height: 7 }}>
                  {aoVivo && (
                    <span
                      className="absolute animate-ping-slow"
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 999,
                        background: "#2DD4BF",
                      }}
                    />
                  )}
                  <span
                    className="relative"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      background: aoVivo ? "#2DD4BF" : "rgba(255,255,255,.4)",
                    }}
                  />
                </span>
                {aoVivo ? "AO VIVO" : "CONECTANDO"}
              </span>
            </div>
            <div
              className="relative"
              style={{
                marginTop: 10,
                fontFamily: LIBRE,
                fontWeight: 700,
                fontSize: 42,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              <NumeroAnimado valor={faturamentoHoje} formato="moeda" />
            </div>
            <div
              className="relative"
              style={{ marginTop: 9, fontSize: 12, color: "rgba(255,255,255,.6)" }}
            >
              ticket{" "}
              <b style={{ color: "#fff" }}>{moeda.format(ticketMedio)}</b> ·{" "}
              <b style={{ color: "#2DD4BF" }}>{saidasHoje}</b> saídas hoje
            </div>
          </motion.div>

          {/* 3 stats */}
          <div className="grid grid-cols-3 gap-2.5">
            <StatCard
              indice={0}
              Icone={Car}
              iconBg="#EEF4FF"
              iconFg="#0EA5E9"
              label="No pátio"
              valor={noPatio}
              sufixo={totalVagas > 0 ? `/${totalVagas}` : ""}
            />
            <StatCard
              indice={1}
              Icone={SaidaIcon}
              iconBg="#FFF3E8"
              iconFg="#F97316"
              label="Saídas"
              valor={saidasHoje}
            />
            <StatCard
              indice={2}
              Icone={Users}
              iconBg="#F3EEFE"
              iconFg="#8B5CF6"
              label="Mensal."
              valor={mensalistas}
            />
          </div>

          {/* Ações */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => router.push("/painel/mensalistas")}
              className="flex items-center justify-center gap-2"
              style={{
                height: 52,
                borderRadius: 15,
                border: "none",
                background: "linear-gradient(90deg,#0E7C74,#14B8A6)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 12px 26px -10px rgba(14,124,116,.5)",
              }}
            >
              <Plus className="w-[18px] h-[18px]" />
              Novo mensalista
            </button>
            <button
              onClick={() => router.push("/painel/financeiro/prestacao")}
              className="flex items-center justify-center gap-2"
              style={{
                height: 52,
                borderRadius: 15,
                border: "1px solid #D6DDE3",
                background: "#fff",
                color: "#1F2A33",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <FileCheck className="w-[18px] h-[18px]" style={{ color: "#0E7C74" }} />
              Prestação
            </button>
          </div>
        </div>

        {/* ── Coluna direita: movimentos ao vivo ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          style={{
            borderRadius: 18,
            background: "#fff",
            border: "1px solid #E4E8EC",
            boxShadow: "0 4px 16px -6px rgba(16,27,20,.08)",
            overflow: "hidden",
          }}
        >
          <div className="flex items-center justify-between" style={{ padding: "13px 16px" }}>
            <div className="flex items-center gap-2">
              <Clock className="w-[15px] h-[15px]" style={{ color: "#0E7C74" }} />
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
                Movimentos ao vivo
              </h3>
            </div>
            <button
              onClick={() => router.push("/painel/movimentos")}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#0E7C74",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Ver tudo
            </button>
          </div>
          <div style={{ padding: "2px 8px 10px" }}>
            {recentes.length === 0 ? (
              <div
                className="flex flex-col items-center text-center gap-2"
                style={{ padding: "40px 24px", color: "#8695A0" }}
              >
                <span
                  className="grid place-items-center"
                  style={{ width: 44, height: 44, borderRadius: 14, background: "#F1F4F6" }}
                >
                  <Car className="w-5 h-5" style={{ color: "#9AA6B0" }} />
                </span>
                <p style={{ fontSize: 13, maxWidth: 260 }}>
                  Nenhum ticket ainda. Os movimentos do app aparecem aqui em tempo real.
                </p>
              </div>
            ) : (
              recentes.map((t, i) => {
                const saiu = t.status === "fechado";
                const quando = saiu && t.saida ? t.saida : t.entrada;
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.03 }}
                    className="flex items-center gap-3"
                    style={{
                      padding: "9px 8px",
                      borderRadius: 12,
                      background: i % 2 ? "#FAFBFC" : "transparent",
                    }}
                  >
                    <span
                      className="grid place-items-center shrink-0"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: saiu ? "#FFF3E8" : "#E6F4F2",
                        color: saiu ? "#F97316" : "#0E7C74",
                      }}
                    >
                      {saiu ? (
                        <SaidaIcon className="w-4 h-4" />
                      ) : (
                        <Car className="w-4 h-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                        }}
                      >
                        {t.placa}
                      </div>
                      <div style={{ fontSize: 11, color: "#8695A0" }}>
                        {t.tipo_veiculo} · {saiu ? "saída" : "entrada"} ·{" "}
                        {hora.format(new Date(quando))}
                      </div>
                    </div>
                    <span className="ml-auto shrink-0">
                      {saiu ? (
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {t.valor_cobrado != null
                            ? moeda.format(Number(t.valor_cobrado))
                            : "—"}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#0E7C74",
                            background: "#E6F4F2",
                            border: "1px solid #C9E7E3",
                            borderRadius: 999,
                            padding: "3px 9px",
                          }}
                        >
                          no pátio
                        </span>
                      )}
                    </span>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

/* ---------- Stat card ---------- */

function StatCard({
  Icone,
  iconBg,
  iconFg,
  label,
  valor,
  sufixo = "",
  indice,
}: {
  Icone: typeof Car;
  iconBg: string;
  iconFg: string;
  label: string;
  valor: number;
  sufixo?: string;
  indice: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: indice * 0.07 }}
      style={{
        borderRadius: 16,
        padding: 14,
        background: "#fff",
        border: "1px solid #E4E8EC",
        boxShadow: "0 4px 16px -6px rgba(16,27,20,.08)",
      }}
    >
      <span
        className="grid place-items-center"
        style={{ width: 30, height: 30, borderRadius: 9, background: iconBg, color: iconFg }}
      >
        <Icone className="w-4 h-4" />
      </span>
      <div
        style={{
          marginTop: 10,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "#8695A0",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 3,
          fontFamily: LIBRE,
          fontSize: 21,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <NumeroAnimado valor={valor} />
        {sufixo && (
          <span style={{ fontSize: 13, color: "#8695A0" }}>{sufixo}</span>
        )}
      </div>
    </motion.div>
  );
}

/* ---------- Número animado ---------- */

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
