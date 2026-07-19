"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Car, LogOut as SaidaIcon, Users, Clock, CalendarDays, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

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
  patioNome: string;
  patioCodigo: string | null;
  noPatio: number;
  totalVagas: number;
  faturamentoHoje: number;
  deltaHoje: number | null;
  saidasHoje: number;
  mensalistas: number;
  faturamentoMes: number;
  deltaMes: number | null;
  faturamentoAno: number;
  serieMensal: number[];
  sparkline: number[];
  recentes: Ticket[];
  sincronizadoEm: string | null;
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const mesCurto = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" });

const POPPINS = "'Poppins', sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

function pct(n: number | null): string {
  if (n === null) return "";
  return `${n >= 0 ? "▲" : "▼"} ${Math.abs(n).toLocaleString("pt-BR")}%`;
}

/** Sparkline: converte a série diária num path SVG (viewBox 280×96). */
function spark(vals: number[], w = 280, h = 96, pad = 6) {
  if (vals.length < 2) return { line: "", area: "", lx: w - pad, ly: 8 };
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const n = vals.length;
  const x = (i: number) => pad + i * ((w - 2 * pad) / (n - 1));
  const y = (v: number) => 8 + (1 - (v - min) / range) * (h - 22);
  const pts = vals.map((v, i) => [x(i), y(v)] as const);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = `${line} L ${x(n - 1).toFixed(1)} ${h - 6} L ${pad} ${h - 6} Z`;
  return { line, area, lx: pts[n - 1][0], ly: pts[n - 1][1] };
}

/**
 * Dashboard ao vivo — layout do protótipo (hero navy + faturamento mês/ano +
 * KPIs + movimentos). Escuta `tickets` via Supabase Realtime (respeita RLS);
 * evento novo → toast + router.refresh.
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
    patioNome,
    patioCodigo,
    noPatio,
    totalVagas,
    faturamentoHoje,
    deltaHoje,
    saidasHoje,
    mensalistas,
    faturamentoMes,
    deltaMes,
    faturamentoAno,
    serieMensal,
    sparkline,
    recentes,
  } = inicial;

  const ticketMedio = saidasHoje > 0 ? faturamentoHoje / saidasHoje : 0;
  const sp = spark(sparkline);

  const agora = new Date();
  const mesLabel = mesCurto.format(agora).replace(".", "");
  const diaMes = agora.getDate();
  const diasNoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate();
  const progMes = Math.round((diaMes / diasNoMes) * 100);
  const nMeses = serieMensal.length || 1;
  const mediaMes = faturamentoAno / nMeses;
  const maxBar = Math.max(...serieMensal, 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, color: "#1F2937" }}>
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ margin: 0, fontSize: 23, fontFamily: POPPINS, fontWeight: 700, letterSpacing: "-.02em" }}>
            Dashboard
          </h2>
          <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
            <b style={{ color: "#1F2937" }}>{patioNome}</b>
            {patioCodigo && (
              <>
                {" · "}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(patioCodigo);
                    toast.sucesso("Copiado!", `Código de acesso do app: ${patioCodigo}`);
                  }}
                  title="Código que o operador digita no app — clique para copiar"
                  className="mono"
                  style={{ color: "#16A34A", fontWeight: 700, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: MONO }}
                >
                  {patioCodigo}
                </button>
              </>
            )}
          </div>
        </div>
        <span
          className="inline-flex items-center"
          style={{ gap: 8, fontSize: 12, fontWeight: 700, padding: "7px 12px", borderRadius: 999, background: "rgba(255,255,255,.7)", color: "#16A34A", border: "1px solid rgba(255,255,255,.8)" }}
        >
          <span className="relative flex" style={{ width: 8, height: 8 }}>
            {aoVivo && (
              <span className="absolute animate-ping-slow" style={{ width: "100%", height: "100%", borderRadius: 999, background: "#22C55E" }} />
            )}
            <span className="relative" style={{ width: 8, height: 8, borderRadius: 999, background: aoVivo ? "#22C55E" : "#9AA6B0" }} />
          </span>
          {aoVivo ? "AO VIVO" : "CONECTANDO"}
        </span>
      </div>

      {/* ── Hero: faturamento hoje ── */}
      <div
        style={{
          borderRadius: 18,
          padding: "24px 26px",
          background: "linear-gradient(125deg,#0B1220,#14203A 55%,#1C2C48)",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
          boxShadow: "0 20px 50px -20px rgba(20,29,40,.5)",
        }}
      >
        <div style={{ position: "absolute", top: -40, right: 120, width: 200, height: 200, borderRadius: 999, background: "rgba(34,197,94,.16)", filter: "blur(50px)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.55)", marginBottom: 8 }}>
            Faturamento hoje
          </div>
          <div style={{ fontSize: 44, fontFamily: POPPINS, fontWeight: 700, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            <NumeroAnimado valor={faturamentoHoje} formato="moeda" />
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.6)" }}>
            {deltaHoje !== null && (
              <>
                <b style={{ color: deltaHoje >= 0 ? "#22C55E" : "#F87171" }}>{pct(deltaHoje)}</b> vs. ontem ·{" "}
              </>
            )}
            {saidasHoje} saídas · ticket <b style={{ color: "#fff" }}>{moeda.format(ticketMedio)}</b>
          </div>
        </div>
        <div style={{ position: "relative", width: 260, flexShrink: 0 }}>
          <svg viewBox="0 0 280 96" style={{ width: "100%", height: "auto", display: "block" }}>
            <defs>
              <linearGradient id="fillG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#22C55E" stopOpacity=".4" />
                <stop offset="1" stopColor="#22C55E" stopOpacity="0" />
              </linearGradient>
            </defs>
            {sp.area && <path d={sp.area} fill="url(#fillG)" />}
            {sp.line && (
              <path
                d={sp.line}
                fill="none"
                stroke="#22C55E"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ strokeDasharray: 600, animation: "draw 1.7s cubic-bezier(.22,1,.36,1) both" }}
              />
            )}
            <circle cx={sp.lx} cy={sp.ly} r="4" fill="#22C55E" stroke="#0B1220" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* ── Faturamento mês / ano ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Mês */}
        <div style={{ borderRadius: 16, padding: "18px 20px", background: "#fff", border: "1px solid #E4E8EC", boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)" }}>
          <div className="flex items-center justify-between" style={{ gap: 10 }}>
            <div className="flex items-center" style={{ gap: 9 }}>
              <span className="grid place-items-center" style={{ width: 30, height: 30, borderRadius: 9, background: "#DCFCE7", color: "#16A34A" }}>
                <CalendarDays className="w-4 h-4" />
              </span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#8695A0" }}>
                  Faturamento do mês
                </div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>{mesLabel} · {diaMes} dias</div>
              </div>
            </div>
            {deltaMes !== null && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", background: "#DCFCE7", border: "1px solid #BBF7D0", borderRadius: 999, padding: "3px 9px" }}>
                {pct(deltaMes)}
              </span>
            )}
          </div>
          <div style={{ marginTop: 14, fontSize: 30, fontFamily: POPPINS, fontWeight: 700, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            <NumeroAnimado valor={faturamentoMes} formato="moeda" />
          </div>
          <div style={{ marginTop: 12, height: 7, borderRadius: 999, background: "#EEF1F3", overflow: "hidden" }}>
            <div style={{ width: `${progMes}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#16A34A,#22C55E)" }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#8695A0" }}>
            {diaMes} de {diasNoMes} dias do mês
          </div>
        </div>

        {/* Ano */}
        <div style={{ borderRadius: 16, padding: "18px 20px", background: "#fff", border: "1px solid #E4E8EC", boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)" }}>
          <div className="flex items-center justify-between" style={{ gap: 10 }}>
            <div className="flex items-center" style={{ gap: 9 }}>
              <span className="grid place-items-center" style={{ width: 30, height: 30, borderRadius: 9, background: "#DCFCE7", color: "#166534" }}>
                <BarChart3 className="w-4 h-4" />
              </span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#8695A0" }}>
                  Faturamento do ano
                </div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>{agora.getFullYear()} · acumulado</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 30, fontFamily: POPPINS, fontWeight: 700, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            <NumeroAnimado valor={faturamentoAno} formato="moeda" />
          </div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "flex-end", gap: 4, height: 34 }}>
            {serieMensal.map((v, i) => (
              <div
                key={i}
                title={moeda.format(v)}
                style={{
                  flex: 1,
                  height: `${24 + (v / maxBar) * 70}%`,
                  borderRadius: "3px 3px 0 0",
                  background: i === serieMensal.length - 1 ? "linear-gradient(180deg,#166534,#22C55E)" : "#DCFCE7",
                }}
              />
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#8695A0" }}>
            média R$ {(mediaMes / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil/mês · {nMeses} {nMeses === 1 ? "mês" : "meses"}
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <Kpi Icone={Car} bg="#EEF4FF" fg="#0EA5E9" label="No pátio" valor={`${noPatio}${totalVagas > 0 ? ` / ${totalVagas}` : ""}`} />
        <Kpi Icone={SaidaIcon} bg="#FFF3E8" fg="#F97316" label="Saídas hoje" valor={String(saidasHoje)} />
        <Kpi Icone={Users} bg="#F3EEFE" fg="#8B5CF6" label="Mensalistas" valor={String(mensalistas)} />
      </div>

      {/* ── Movimentos ao vivo ── */}
      <div style={{ borderRadius: 16, background: "#fff", border: "1px solid #E4E8EC", boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)", overflow: "hidden" }}>
        <div className="flex items-center justify-between" style={{ padding: "13px 18px", borderBottom: "1px solid #E4E8EC" }}>
          <div className="flex items-center" style={{ gap: 9 }}>
            <Clock className="w-[15px] h-[15px]" style={{ color: "#16A34A" }} />
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Movimentos ao vivo</h3>
          </div>
          <button
            onClick={() => router.push("/painel/movimentos")}
            style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", background: "none", border: "none", cursor: "pointer" }}
          >
            Ver tudo ›
          </button>
        </div>
        <div style={{ padding: "4px 8px" }}>
          {recentes.length === 0 ? (
            <div className="flex flex-col items-center text-center" style={{ gap: 8, padding: "40px 24px", color: "#8695A0" }}>
              <span className="grid place-items-center" style={{ width: 44, height: 44, borderRadius: 14, background: "#F1F4F6" }}>
                <Car className="w-5 h-5" style={{ color: "#9AA6B0" }} />
              </span>
              <p style={{ fontSize: 13, maxWidth: 260 }}>Nenhum ticket ainda. Os movimentos do app aparecem aqui em tempo real.</p>
            </div>
          ) : (
            recentes.map((t, i) => {
              const saiu = t.status === "fechado";
              const quando = saiu && t.saida ? t.saida : t.entrada;
              return (
                <div
                  key={t.id}
                  className="flex items-center"
                  style={{ gap: 12, padding: "10px 10px", borderRadius: 11, background: i % 2 ? "#FAFBFC" : "transparent" }}
                >
                  <span
                    className="grid place-items-center shrink-0"
                    style={{ width: 30, height: 30, borderRadius: 9, background: saiu ? "#FFF3E8" : "#DCFCE7", color: saiu ? "#F97316" : "#16A34A" }}
                  >
                    {saiu ? <SaidaIcon className="w-[15px] h-[15px]" /> : <Car className="w-[15px] h-[15px]" />}
                  </span>
                  <span
                    className="mono"
                    style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", background: "#F1F4F6", border: "1px solid #E4E8EC", borderRadius: 6, padding: "3px 8px", fontFamily: MONO }}
                  >
                    {t.placa}
                  </span>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>
                    {t.tipo_veiculo} · {saiu ? "saída" : "entrada"}
                  </span>
                  <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "#8695A0", fontFamily: MONO }}>
                    {hora.format(new Date(quando))}
                  </span>
                  {saiu ? (
                    <span style={{ fontSize: 12, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                      {t.valor_cobrado != null ? moeda.format(Number(t.valor_cobrado)) : "—"}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", background: "#DCFCE7", border: "1px solid #BBF7D0", borderRadius: 999, padding: "2px 9px" }}>
                      no pátio
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- KPI card ---------- */
function Kpi({ Icone, bg, fg, label, valor }: { Icone: typeof Car; bg: string; fg: string; label: string; valor: string }) {
  return (
    <div style={{ borderRadius: 14, padding: 16, background: "#fff", border: "1px solid #E4E8EC", boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)" }}>
      <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
        <span className="grid place-items-center" style={{ width: 28, height: 28, borderRadius: 8, background: bg, color: fg }}>
          <Icone className="w-[15px] h-[15px]" />
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#8695A0" }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontFamily: POPPINS, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{valor}</div>
    </div>
  );
}

/* ---------- Número animado ---------- */
function NumeroAnimado({ valor, formato }: { valor: number; formato?: "moeda" }) {
  const mv = useMotionValue(0);
  const texto = useTransform(mv, (v) => (formato === "moeda" ? moeda.format(v) : String(Math.round(v))));
  useEffect(() => {
    const controle = animate(mv, valor, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    return () => controle.stop();
  }, [valor, mv]);
  return <motion.span>{texto}</motion.span>;
}
