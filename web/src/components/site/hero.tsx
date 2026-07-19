import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  ScanLine,
  Printer,
  Car,
  RefreshCw,
} from "lucide-react";
import { urlApp } from "@/lib/urls";
import { MONO, WHATSAPP, btnPrimary, btnGhostDark } from "@/components/site/tokens";

/* =========================================================
   HERO — palco escuro, painel do produto aceso no centro.
   Porte fiel do protótipo (Claude Design).
   ========================================================= */
export function Hero() {
  return (
    <section
      id="top"
      data-sec
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#0B1220",
        padding: "132px 0 88px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg,#0B1220,#10201A 55%,#0B1220)",
          pointerEvents: "none",
        }}
      />
      <div
        className="np-grid np-grid-mask"
        style={{ position: "absolute", inset: 0, opacity: 0.05, pointerEvents: "none" }}
      />
      <div
        style={{
          position: "absolute",
          top: -128,
          left: "25%",
          width: "36rem",
          height: "36rem",
          borderRadius: 9999,
          background: "rgba(22,163,74,.12)",
          filter: "blur(64px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 48,
          right: -128,
          width: "28rem",
          height: "28rem",
          borderRadius: 9999,
          background: "rgba(14,165,233,.1)",
          filter: "blur(64px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", maxWidth: 1152, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", textAlign: "center" }}>
          <a
            href="#precos"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 9999,
              border: "1px solid rgba(34,197,94,.28)",
              background: "rgba(22,163,74,.1)",
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              color: "#86EFAC",
            }}
          >
            <span
              data-np-anim
              style={{
                width: 6,
                height: 6,
                borderRadius: 9999,
                background: "#22C55E",
                animation: "np-pulse 2s infinite",
              }}
            />
            15 dias grátis · sem cartão de crédito
            <ArrowRight size={14} strokeWidth={2.4} />
          </a>

          <h1
            data-balance
            style={{
              margin: "24px 0 0",
              fontSize: "clamp(2.5rem,6vw,4.5rem)",
              fontWeight: 800,
              letterSpacing: "-.03em",
              lineHeight: 1.04,
              color: "#fff",
            }}
          >
            Cada carro registrado.
            <br />
            <span style={{ color: "#22C55E" }}>Cada real no seu bolso.</span>
          </h1>

          <p
            style={{
              margin: "24px auto 0",
              maxWidth: 640,
              fontSize: 19,
              lineHeight: 1.65,
              color: "rgba(255,255,255,.75)",
            }}
          >
            Aposente o caderno e o sistema caro. Seus operadores registram tudo
            pelo celular — <b style={{ color: "#fff" }}>até sem internet</b> — e
            você acompanha o faturamento ao vivo, de onde estiver. Sem
            instalação, sem vendedor:{" "}
            <b style={{ color: "#fff" }}>crie a conta e use hoje</b>.
          </p>

          <div
            style={{
              marginTop: 36,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <a href={urlApp("/cadastro")} style={btnPrimary()}>
              Começar grátis por 15 dias
              <ArrowRight size={16} strokeWidth={2.4} />
            </a>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={btnGhostDark}>
              Prefiro falar no WhatsApp
            </a>
          </div>

          <p
            style={{
              marginTop: 18,
              fontSize: 13,
              color: "rgba(255,255,255,.55)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px 18px",
            }}
          >
            {["Sem cartão de crédito", "Liberação na hora", "Cancele quando quiser"].map(
              (t) => (
                <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={14} strokeWidth={2.4} color="#22C55E" />
                  {t}
                </span>
              ),
            )}
          </p>
        </div>

        {/* palco: produto aceso */}
        <div style={{ marginTop: 76, position: "relative", maxWidth: 1024, marginLeft: "auto", marginRight: "auto" }}>
          <div
            style={{
              position: "absolute",
              inset: -40,
              zIndex: -1,
              borderRadius: 56,
              background: "rgba(22,163,74,.12)",
              filter: "blur(64px)",
              pointerEvents: "none",
            }}
          />

          {/* chips ao vivo */}
          <HeroChip
            style={{ left: -32, top: 64 }}
            icoBg="rgba(22,163,74,.15)"
            ico={<CreditCard size={20} strokeWidth={2} color="#86EFAC" />}
            rotulo="Saída paga"
            valor="+ R$ 12,00"
            check
          />
          <HeroChip
            style={{ right: -24, top: 160, animationDelay: "-2.5s" }}
            icoBg="rgba(14,165,233,.15)"
            ico={<ScanLine size={20} strokeWidth={2} color="#38BDF8" />}
            rotulo="Placa lida"
            valor="RIO2A18"
            valorEsp
          />
          <HeroChip
            style={{ left: 40, bottom: -24, animationDelay: "-4s" }}
            icoBg="rgba(245,158,11,.15)"
            ico={<Printer size={20} strokeWidth={2} color="#FBBF24" />}
            rotulo="Ticket"
            valor="Impresso ✓"
          />

          <MockupDashboard />

          {/* celular do operador */}
          <div
            data-hero-phone
            style={{ position: "absolute", right: -16, bottom: -40, zIndex: 10, width: 216 }}
          >
            <MockupApp />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroChip({
  style,
  icoBg,
  ico,
  rotulo,
  valor,
  check = false,
  valorEsp = false,
}: {
  style: React.CSSProperties;
  icoBg: string;
  ico: React.ReactNode;
  rotulo: string;
  valor: string;
  check?: boolean;
  valorEsp?: boolean;
}) {
  return (
    <div
      data-hero-chip
      data-np-anim
      style={{
        position: "absolute",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderRadius: 16,
        background: "rgba(16,32,26,.85)",
        border: "1px solid rgba(255,255,255,.1)",
        boxShadow: "0 16px 48px -12px rgba(0,0,0,.8)",
        backdropFilter: "blur(6px)",
        padding: "12px 16px",
        animation: "np-float 6s ease-in-out infinite",
        ...style,
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: icoBg,
          display: "grid",
          placeItems: "center",
        }}
      >
        {ico}
      </span>
      <div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.55)" }}>
          {rotulo}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 800,
            color: "#fff",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: valorEsp ? ".15em" : undefined,
          }}
        >
          {valor}
        </p>
      </div>
      {check && <CheckCircle2 size={16} strokeWidth={2.4} color="#22C55E" />}
    </div>
  );
}

/** Prévia do painel web (tema claro). */
function MockupDashboard() {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,.1)",
        background: "#fff",
        boxShadow: "0 48px 120px -24px rgba(0,0,0,.75)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 16px",
          height: 40,
          borderBottom: "1px solid #E5E7EB",
          background: "rgba(244,247,245,.6)",
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: 9999, background: "rgba(239,68,68,.4)" }} />
        <span style={{ width: 10, height: 10, borderRadius: 9999, background: "rgba(245,158,11,.4)" }} />
        <span style={{ width: 10, height: 10, borderRadius: 9999, background: "#86EFAC" }} />
        <span style={{ marginLeft: 12, fontSize: 11, fontFamily: MONO, color: "#94A3B8" }}>
          dashboard.nuvempark.com
        </span>
        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10,
            fontWeight: 700,
            color: "#15803D",
            background: "#DCFCE7",
            border: "1px solid #BBF7D0",
            borderRadius: 9999,
            padding: "2px 8px",
          }}
        >
          <span data-np-anim style={{ width: 6, height: 6, borderRadius: 9999, background: "#16A34A", animation: "np-pulse 2s infinite" }} />
          AO VIVO
        </span>
      </div>

      <div
        data-mock-kpis
        style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}
      >
        <div style={{ borderRadius: 12, padding: 14, background: "linear-gradient(135deg,#16A34A,#166534)", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "rgba(255,255,255,.8)" }}>
              Faturamento hoje
            </span>
            <span style={{ width: 24, height: 24, borderRadius: 8, background: "rgba(255,255,255,.15)", display: "grid", placeItems: "center" }}>
              <CreditCard size={14} strokeWidth={2} color="#fff" />
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 19, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>R$ 4.820,00</div>
        </div>
        <KpiClaro rotulo="No pátio agora" valor="87 / 120" icoBg="#EFF6FF" ico={<Car size={14} strokeWidth={2} color="#0EA5E9" />} />
        <KpiClaro rotulo="Saídas hoje" valor="214" icoBg="rgba(139,92,246,.1)" ico={<ScanLine size={14} strokeWidth={2} color="#8B5CF6" />} />
        <KpiClaro rotulo="Sincronizado" valor="há 2min" valorCor="#15803D" icoBg="#DCFCE7" ico={<RefreshCw size={14} strokeWidth={2} color="#16A34A" />} />
      </div>

      <div
        data-mock-lower
        style={{ padding: "0 20px 24px", display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}
      >
        <div style={{ borderRadius: 12, border: "1px solid #E5E7EB", background: "#fff", padding: 16 }}>
          <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#94A3B8" }}>
            Ocupação por pátio
          </p>
          {[
            { nome: "Pátio Centro", pct: 72, grad: "linear-gradient(90deg,#16A34A,#166534)" },
            { nome: "Shopping Norte", pct: 91, grad: "linear-gradient(90deg,#F97316,#EF4444)" },
            { nome: "Aeroporto", pct: 45, grad: "linear-gradient(90deg,#0EA5E9,#166534)" },
          ].map((p, i) => (
            <div key={p.nome} style={{ marginBottom: i < 2 ? 12 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: "#1F2937", fontWeight: 600 }}>{p.nome}</span>
                <span style={{ color: "#94A3B8", fontVariantNumeric: "tabular-nums" }}>{p.pct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 9999, background: "#F3F4F6", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 9999, width: `${p.pct}%`, background: p.grad }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderRadius: 12, border: "1px solid #E5E7EB", background: "#fff", padding: 16 }}>
          <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#94A3B8" }}>
            Últimos movimentos
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { placa: "RIO2A18", tipo: "carro", valor: "R$ 12,00", cor: "#6B7280" },
              { placa: "BRA1E23", tipo: "moto", valor: "no pátio", cor: "#15803D" },
              { placa: "FLA9K02", tipo: "carro", valor: "R$ 8,50", cor: "#6B7280" },
            ].map((t) => (
              <div key={t.placa} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
                <span style={{ fontWeight: 800, letterSpacing: ".15em", color: "#1F2937", background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 4, padding: "2px 8px", fontFamily: MONO }}>
                  {t.placa}
                </span>
                <span style={{ color: "#94A3B8" }}>{t.tipo}</span>
                <span style={{ marginLeft: "auto", fontWeight: 700, color: t.cor, fontVariantNumeric: "tabular-nums" }}>{t.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* varredura */}
      <div style={{ position: "absolute", inset: 0, zIndex: 10, overflow: "hidden", borderRadius: 18, pointerEvents: "none" }}>
        <div
          data-np-anim
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "-12%",
            width: "12%",
            background: "linear-gradient(90deg,transparent,rgba(34,197,94,.22),transparent)",
            animation: "np-scan 5.5s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}

function KpiClaro({
  rotulo,
  valor,
  ico,
  icoBg,
  valorCor = "#1F2937",
}: {
  rotulo: string;
  valor: string;
  ico: React.ReactNode;
  icoBg: string;
  valorCor?: string;
}) {
  return (
    <div style={{ borderRadius: 12, padding: 14, border: "1px solid #E5E7EB", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#94A3B8" }}>
          {rotulo}
        </span>
        <span style={{ width: 24, height: 24, borderRadius: 8, background: icoBg, display: "grid", placeItems: "center" }}>
          {ico}
        </span>
      </div>
      <div style={{ marginTop: 6, fontSize: 19, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: valorCor }}>
        {valor}
      </div>
    </div>
  );
}

/** Celular com a tela de "Nova entrada" do app do operador. */
function MockupApp() {
  return (
    <div style={{ borderRadius: 28, border: "6px solid #111B2E", boxShadow: "0 32px 64px -16px rgba(0,0,0,.8)", overflow: "hidden", background: "#111B2E" }}>
      <div style={{ background: "#F3F4F6", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(90deg,#16A34A,#166534)", padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 8, color: "rgba(255,255,255,.7)", fontWeight: 600, marginBottom: 8 }}>
            <span>09:41</span>
            <span>▮▮▮ 100%</span>
          </div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.7)" }}>Pátio Centro</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#fff" }}>Nova entrada</p>
        </div>
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 9, fontWeight: 700, color: "#94A3B8" }}>PLACA</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ flex: 1, height: 36, borderRadius: 8, border: "2px solid #16A34A", background: "#fff", padding: "0 8px", display: "flex", alignItems: "center" }}>
                <span style={{ fontWeight: 800, letterSpacing: ".2em", fontSize: 13, color: "#1F2937", fontFamily: MONO }}>RIO2A18</span>
              </div>
              <span style={{ width: 36, height: 36, borderRadius: 8, background: "#DCFCE7", border: "1px solid #BBF7D0", display: "grid", placeItems: "center" }}>
                <ScanLine size={16} strokeWidth={2} color="#16A34A" />
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 8, fontWeight: 700, color: "#16A34A" }}>✓ lida pela câmera</p>
          </div>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 9, fontWeight: 700, color: "#94A3B8" }}>VEÍCULO</p>
            <div style={{ display: "flex", gap: 4 }}>
              <span style={{ flex: 1, textAlign: "center", fontSize: 10, fontWeight: 700, padding: "6px 0", borderRadius: 8, background: "#16A34A", color: "#fff" }}>Carro</span>
              <span style={{ flex: 1, textAlign: "center", fontSize: 10, fontWeight: 700, padding: "6px 0", borderRadius: 8, background: "#fff", border: "1px solid #E5E7EB", color: "#6B7280" }}>Moto</span>
              <span style={{ flex: 1, textAlign: "center", fontSize: 10, fontWeight: 700, padding: "6px 0", borderRadius: 8, background: "#fff", border: "1px solid #E5E7EB", color: "#6B7280" }}>Van</span>
            </div>
          </div>
          <div style={{ height: 40, borderRadius: 12, background: "linear-gradient(90deg,#16A34A,#166534)", display: "grid", placeItems: "center", boxShadow: "0 8px 24px -6px rgba(21,128,61,.5)" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>REGISTRAR ENTRADA</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, paddingBottom: 2 }}>
            <Printer size={12} strokeWidth={2} color="#94A3B8" />
            <span style={{ fontSize: 8, fontWeight: 600, color: "#94A3B8" }}>Imprime o ticket automaticamente</span>
          </div>
        </div>
      </div>
    </div>
  );
}
