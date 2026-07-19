"use client";

import { useState } from "react";
import Image from "next/image";
import {
  WifiOff,
  ScanLine,
  CheckCircle2,
  LayoutDashboard,
  Clock,
  Printer,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { MONO, eyebrow, h2, pill, listItem } from "@/components/site/tokens";

function tab(active: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 9,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "inherit",
    border: "none",
    cursor: "pointer",
    transition: "all .2s",
    ...(active
      ? { background: "#fff", color: "#15803D", boxShadow: "0 1px 3px rgba(11,18,32,.12)" }
      : { background: "transparent", color: "#94A3B8" }),
  };
}

export function Recursos() {
  const [aba, setAba] = useState<"a" | "b">("a");

  return (
    <section id="recursos" data-sec style={{ background: "#fff", padding: "96px 0" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 20px" }}>
        <Reveal>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 20,
            }}
          >
            <div style={{ maxWidth: 640 }}>
              <span style={eyebrow}>Recursos</span>
              <h2 data-balance style={h2}>
                Feito para o caos real de um pátio cheio
              </h2>
              <p style={{ margin: "16px 0 0", fontSize: 17, lineHeight: 1.6, color: "#6B7280", maxWidth: 520 }}>
                Sexta-feira, 18h, fila na entrada e a maquininha falhando. É para
                esse momento que o NuvemPark foi construído — não para uma demo
                bonita.
              </p>
            </div>
            <div style={{ display: "inline-flex", padding: 4, borderRadius: 12, background: "#F3F4F6", border: "1px solid #E5E7EB", gap: 2 }}>
              <button type="button" onClick={() => setAba("a")} style={tab(aba === "a")}>
                Destaques
              </button>
              <button type="button" onClick={() => setAba("b")} style={tab(aba === "b")}>
                Painel de recursos
              </button>
            </div>
          </div>
        </Reveal>

        {aba === "a" ? <VarianteA /> : <VarianteB />}
      </div>
    </section>
  );
}

/* ---------- Variante A: spotlights alternados ---------- */
function Spotlight({
  chip,
  chipCor,
  chipBg,
  chipBorda,
  chipIco,
  titulo,
  texto,
  bullets,
  imagens,
  glow,
  flip = false,
  badge,
}: {
  chip: string;
  chipCor: string;
  chipBg: string;
  chipBorda: string;
  chipIco: React.ReactNode;
  titulo: React.ReactNode;
  texto: string;
  bullets: string[];
  imagens: { src: string; alt: string }[];
  glow: string;
  flip?: boolean;
  badge: React.ReactNode;
}) {
  const media = (
    <div data-flip-media={flip ? "" : undefined} style={{ position: "relative" }}>
      <div style={{ position: "absolute", inset: -24, borderRadius: 32, background: glow, pointerEvents: "none" }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0 4px" }}>
        <div style={{ width: 176, transform: "rotate(-7deg)", marginRight: -44, top: 16, position: "relative", zIndex: 1, borderRadius: 32, padding: 5, background: "#111B2E", boxShadow: "0 26px 60px -26px rgba(11,18,32,.45)" }}>
          <Image src={imagens[0].src} alt={imagens[0].alt} width={176} height={360} style={{ display: "block", width: "100%", height: "auto", borderRadius: 27 }} />
        </div>
        <div style={{ width: 200, transform: "rotate(4deg)", position: "relative", zIndex: 2, borderRadius: 36, padding: 6, background: "#111B2E", boxShadow: "0 40px 90px -30px rgba(11,18,32,.5)" }}>
          <Image src={imagens[1].src} alt={imagens[1].alt} width={200} height={410} style={{ display: "block", width: "100%", height: "auto", borderRadius: 30 }} />
        </div>
      </div>
      {badge}
    </div>
  );

  const texto_bloco = (
    <div>
      <span style={pill(chipBg, chipBorda, chipCor)}>
        {chipIco}
        {chip}
      </span>
      <h3 style={{ margin: "20px 0 0", fontSize: "clamp(1.5rem,2.4vw,2rem)", fontWeight: 800, letterSpacing: "-.01em", lineHeight: 1.12, color: "#1F2937" }}>
        {titulo}
      </h3>
      <p style={{ margin: "16px 0 0", fontSize: 17, lineHeight: 1.65, color: "#6B7280" }}>{texto}</p>
      <ul style={{ margin: "24px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
        {bullets.map((b) => (
          <li key={b} style={listItem}>
            <CheckCircle2 size={20} strokeWidth={2.4} color="#16A34A" style={{ flex: "none", marginTop: 1 }} />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <Reveal>
      <div data-spot data-flip={flip ? "" : undefined} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
        {flip ? (
          <>
            {media}
            {texto_bloco}
          </>
        ) : (
          <>
            {texto_bloco}
            {media}
          </>
        )}
      </div>
    </Reveal>
  );
}

function VarianteA() {
  return (
    <div style={{ marginTop: 64, display: "flex", flexDirection: "column", gap: 80 }}>
      <Spotlight
        chip="Offline-first"
        chipBg="#DCFCE7"
        chipBorda="#BBF7D0"
        chipCor="#15803D"
        chipIco={<WifiOff size={14} strokeWidth={2} />}
        titulo={<>A internet caiu?<br />Ninguém percebe.</>}
        texto="O app registra entradas, saídas e pagamentos mesmo sem sinal. Quando a conexão volta, tudo sobe sozinho para o painel. A fila não para — e o dinheiro não se perde no caderno."
        bullets={["Nada de fila parada quando o Wi-Fi some", "Sincronização automática, sem clique"]}
        glow="radial-gradient(60% 60% at 50% 40%,rgba(22,163,74,.14),transparent 70%)"
        imagens={[
          { src: "/uploads/Screenshot_20260717-201639.png", alt: "Pátio ao vivo no app do operador" },
          { src: "/uploads/Screenshot_20260717-201535.png", alt: "Tela inicial do operador no app" },
        ]}
        badge={
          <div style={{ position: "absolute", right: -14, bottom: -14, zIndex: 3, display: "flex", alignItems: "center", gap: 8, background: "#0B1220", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "10px 14px", boxShadow: "0 16px 40px -12px rgba(0,0,0,.5)" }}>
            <span data-np-anim style={{ width: 8, height: 8, borderRadius: 9999, background: "#FBBF24", animation: "np-pulse 2s infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: MONO }}>3 registros na fila de envio</span>
          </div>
        }
      />

      <Spotlight
        flip
        chip="Leitura de placa + tarifa"
        chipBg="#EFF6FF"
        chipBorda="#BAE6FD"
        chipCor="#0369A1"
        chipIco={<ScanLine size={14} strokeWidth={2} />}
        titulo={<>A câmera digita a placa.<br />O sistema faz a conta.</>}
        texto="O operador aponta o celular e a placa entra sozinha — sem erro de digitação. Fração, hora, diária, tolerância e pernoite: o valor certo sai calculado, sem conta de cabeça e sem prejuízo no arredondamento."
        bullets={["Zero fila crescendo por digitação lenta", "Tarifa que você configura, aplicada sem falha"]}
        glow="radial-gradient(60% 60% at 50% 40%,rgba(14,165,233,.12),transparent 70%)"
        imagens={[
          { src: "/uploads/Screenshot_20260717-201639.png", alt: "Placa preenchida sozinha na Nova entrada" },
          { src: "/uploads/Screenshot_20260718-103253.png", alt: "Câmera do app lendo a placa em tempo real" },
        ]}
        badge={
          <div style={{ position: "absolute", left: -14, top: -14, zIndex: 3, display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: "10px 14px", boxShadow: "0 16px 40px -12px rgba(11,18,32,.2)" }}>
            <ScanLine size={16} strokeWidth={2} color="#0EA5E9" />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#1F2937" }}>Lida em 1 segundo</span>
          </div>
        }
      />

      <Spotlight
        chip="Painel do gestor ao vivo"
        chipBg="#DCFCE7"
        chipBorda="#BBF7D0"
        chipCor="#15803D"
        chipIco={<LayoutDashboard size={14} strokeWidth={2} />}
        titulo={<>Seu faturamento, ao vivo,<br />de onde você estiver.</>}
        texto="Cada entrada e cada real aparecem no painel na hora em que acontecem. Um pátio ou uma rede inteira, consolidados numa conta só. A pergunta “quanto faturou hoje?” some — a resposta já está na tela."
        bullets={["Caixa por operador, com dono e horário", "Da primeira vaga à quinta filial, sem trocar de sistema"]}
        glow="radial-gradient(60% 60% at 50% 40%,rgba(22,163,74,.14),transparent 70%)"
        imagens={[
          { src: "/uploads/Screenshot_20260717-201543.png", alt: "Detalhamento do fechamento de caixa por operador" },
          { src: "/uploads/Screenshot_20260717-201549.png", alt: "Caixa com saldo e faturamento ao vivo" },
        ]}
        badge={
          <div style={{ position: "absolute", right: -14, top: -14, display: "inline-flex", alignItems: "center", gap: 6, background: "#DCFCE7", border: "1px solid #BBF7D0", borderRadius: 9999, padding: "6px 12px", boxShadow: "0 12px 32px -12px rgba(11,18,32,.2)" }}>
            <span data-np-anim style={{ width: 7, height: 7, borderRadius: 9999, background: "#16A34A", animation: "np-pulse 2s infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: "#15803D", letterSpacing: ".06em" }}>AO VIVO</span>
          </div>
        }
      />
    </div>
  );
}

/* ---------- Variante B: bento ---------- */
function BentoCard({
  wide = false,
  dark = false,
  icoBg,
  ico,
  titulo,
  texto,
  minHeight = 200,
}: {
  wide?: boolean;
  dark?: boolean;
  icoBg: string;
  ico: React.ReactNode;
  titulo: string;
  texto: string;
  minHeight?: number;
}) {
  return (
    <div
      data-bento-wide={wide ? "" : undefined}
      style={{
        gridColumn: wide ? "span 4" : "span 2",
        borderRadius: 20,
        border: "1px solid #E5E7EB",
        background: dark ? "linear-gradient(135deg,#0B1220,#10201A)" : "#fff",
        color: dark ? "#fff" : undefined,
        padding: dark ? 28 : 24,
        position: "relative",
        overflow: "hidden",
        minHeight,
        display: "flex",
        flexDirection: "column",
        justifyContent: dark ? "space-between" : "flex-start",
        boxShadow: dark ? undefined : "0 1px 2px rgba(11,18,32,.04),0 4px 16px -4px rgba(11,18,32,.06)",
      }}
    >
      {dark && <div className="np-grid" style={{ position: "absolute", inset: 0, opacity: 0.06 }} />}
      <div style={{ position: "relative" }}>
        <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 12, background: icoBg }}>
          {ico}
        </span>
      </div>
      <div style={{ position: "relative", marginTop: dark ? 0 : 16 }}>
        <h3 style={{ margin: 0, fontSize: dark ? 22 : 18, fontWeight: 800, letterSpacing: dark ? "-.01em" : undefined, color: dark ? "#fff" : "#1F2937" }}>
          {titulo}
        </h3>
        <p style={{ margin: "8px 0 0", fontSize: dark ? 15 : 14, lineHeight: 1.6, color: dark ? "rgba(255,255,255,.7)" : "#6B7280", maxWidth: dark ? 440 : undefined }}>
          {texto}
        </p>
      </div>
    </div>
  );
}

function VarianteB() {
  return (
    <div data-bento style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(6,1fr)", gridAutoRows: "minmax(0,auto)", gap: 16 }}>
      <BentoCard wide dark icoBg="rgba(22,163,74,.15)" ico={<WifiOff size={22} strokeWidth={2} color="#22C55E" />} titulo="A internet caiu? Ninguém percebe." texto="Entradas, saídas e pagamentos registrados offline. Quando a conexão volta, tudo sobe sozinho. A fila não para." minHeight={220} />
      <BentoCard icoBg="#EFF6FF" ico={<ScanLine size={22} strokeWidth={2} color="#0EA5E9" />} titulo="A câmera digita a placa por você" texto="Placa lida em um segundo, sem erro de digitação e sem fila crescendo." minHeight={220} />
      <BentoCard icoBg="#FEF3C7" ico={<Clock size={22} strokeWidth={2} color="#D97706" />} titulo="O valor certo, sem conta de cabeça" texto="Fração, hora, diária, tolerância e pernoite calculados sozinhos." />
      <BentoCard icoBg="#DCFCE7" ico={<Printer size={22} strokeWidth={2} color="#16A34A" />} titulo="Ticket profissional na hora" texto="Comprovante com QR Code e o nome do seu pátio, na térmica de bolso." />
      <BentoCard icoBg="#DCFCE7" ico={<ShieldCheck size={22} strokeWidth={2} color="#16A34A" />} titulo="Cada centavo tem dono" texto="Caixa por operador, sangria registrada, fechamento com conferência." />
      <BentoCard wide icoBg="#F5F3FF" ico={<Building2 size={22} strokeWidth={2} color="#8B5CF6" />} titulo="Da primeira vaga à quinta filial" texto="Cada pátio com suas tarifas, operadores e caixa — tudo consolidado numa conta só. Crescer não exige trocar de sistema." />
    </div>
  );
}
