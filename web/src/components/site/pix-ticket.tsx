import { QrCode, CheckCircle2, Smartphone } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { MONO, pill, listItem } from "@/components/site/tokens";

/* =========================================================
   PIX NO TICKET — imagem original (pix-ticket-hero.png) não
   disponível: reconstruída como mock de ticket + QR on-brand.
   ========================================================= */
export function PixTicket() {
  const bullets = [
    "Fim da fila no caixa na hora de sair",
    "Sem maquininha e sem taxa de cartão",
    "Pago é pago: cai na sua conta e a saída libera",
  ];
  return (
    <section data-sec style={{ background: "#fff", padding: "96px 0" }}>
      <div data-pix style={{ maxWidth: 1152, margin: "0 auto", padding: "0 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
        <Reveal>
          <div>
            <span style={pill("#DCFCE7", "#BBF7D0", "#15803D")}>
              <QrCode size={14} strokeWidth={2} />
              Pagamento por Pix no ticket
            </span>
            <h3 style={{ margin: "20px 0 0", fontSize: "clamp(1.5rem,2.4vw,2rem)", fontWeight: 800, letterSpacing: "-.01em", lineHeight: 1.12, color: "#1F2937" }}>
              O cliente paga sozinho,<br />sem passar no caixa.
            </h3>
            <p style={{ margin: "16px 0 0", fontSize: 17, lineHeight: 1.65, color: "#6B7280" }}>
              No ticket sai um QR Code de Pix. O cliente aponta a câmera do
              próprio celular, o{" "}
              <b style={{ color: "#1F2937" }}>Pix copia-e-cola abre direto no banco dele</b>{" "}
              e ele paga na hora — sem fila no caixa, sem maquininha e sem troco.
              O valor cai na sua conta e a saída é liberada.
            </p>
            <ul style={{ margin: "24px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
              {bullets.map((b) => (
                <li key={b} style={listItem}>
                  <CheckCircle2 size={20} strokeWidth={2.4} color="#16A34A" style={{ flex: "none", marginTop: 1 }} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: -24, borderRadius: 32, background: "radial-gradient(60% 60% at 50% 45%,rgba(22,163,74,.14),transparent 70%)", pointerEvents: "none" }} />
            <TicketMock />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Mock de ticket térmico com QR de Pix (substitui a imagem ausente). */
function TicketMock() {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid #E5E7EB",
        boxShadow: "0 30px 80px -28px rgba(11,18,32,.3)",
        background: "linear-gradient(160deg,#0B1220,#10201A)",
        padding: 40,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div className="np-grid" style={{ position: "absolute", inset: 0, opacity: 0.05 }} />
      <div style={{ position: "absolute", top: -60, right: -40, width: "18rem", height: "18rem", borderRadius: 9999, background: "rgba(22,163,74,.16)", filter: "blur(64px)" }} />

      {/* recibo térmico */}
      <div style={{ position: "relative", width: 260, background: "#fff", borderRadius: 12, boxShadow: "0 24px 60px -20px rgba(0,0,0,.5)", overflow: "hidden", fontFamily: MONO }}>
        <div style={{ background: "linear-gradient(90deg,#16A34A,#166534)", padding: "14px 16px", textAlign: "center" }}>
          <div style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: ".08em" }}>PÁTIO CENTRO</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,.8)", marginTop: 2 }}>COMPROVANTE DE SAÍDA</div>
        </div>
        <div style={{ padding: 16, color: "#1F2937" }}>
          {[
            ["PLACA", "RIO2A18"],
            ["ENTRADA", "14:07"],
            ["SAÍDA", "16:42"],
            ["PERMANÊNCIA", "2h35"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0", color: "#6B7280" }}>
              <span>{k}</span>
              <span style={{ color: "#1F2937", fontWeight: 700, letterSpacing: ".06em" }}>{v}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px dashed #E5E7EB", margin: "10px 0", height: 0 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#1F2937" }}>TOTAL</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#15803D" }}>R$ 12,00</span>
          </div>

          {/* QR pix */}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ padding: 8, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8 }}>
              <QrArte />
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 9, fontWeight: 700, color: "#15803D", background: "#DCFCE7", border: "1px solid #BBF7D0", borderRadius: 9999, padding: "3px 10px" }}>
              <span style={{ fontFamily: "inherit" }}>PAGUE COM PIX</span>
            </div>
          </div>
        </div>
      </div>

      {/* celular sobreposto pagando */}
      <div style={{ position: "absolute", right: 18, bottom: 18, width: 116, borderRadius: 20, border: "5px solid #111B2E", background: "#111B2E", boxShadow: "0 24px 50px -18px rgba(0,0,0,.7)", overflow: "hidden" }}>
        <div style={{ background: "#F3F4F6", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ background: "#16A34A", padding: "8px 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <Smartphone size={12} color="#fff" strokeWidth={2.4} />
            <span style={{ fontSize: 8, fontWeight: 800, color: "#fff" }}>Banco</span>
          </div>
          <div style={{ padding: 10, textAlign: "center" }}>
            <CheckCircle2 size={26} color="#16A34A" strokeWidth={2.2} />
            <div style={{ fontSize: 9, fontWeight: 800, color: "#1F2937", marginTop: 4 }}>Pix pago</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#15803D", marginTop: 2 }}>R$ 12,00</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** QR estilizado (decorativo). */
function QrArte() {
  const c = "#0B1220";
  return (
    <svg width={92} height={92} viewBox="0 0 29 29" aria-hidden="true">
      <rect width="29" height="29" fill="#fff" />
      {/* três olhos */}
      {[
        [0, 0],
        [22, 0],
        [0, 22],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="7" height="7" fill={c} />
          <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
          <rect x={x + 2} y={y + 2} width="3" height="3" fill={c} />
        </g>
      ))}
      {/* padrão pseudo-aleatório determinístico */}
      {Array.from({ length: 29 * 29 }).map((_, i) => {
        const x = i % 29;
        const y = Math.floor(i / 29);
        const inEye = (x < 8 && y < 8) || (x > 20 && y < 8) || (x < 8 && y > 20);
        if (inEye) return null;
        const on = (x * 7 + y * 13 + x * y) % 3 === 0;
        return on ? <rect key={i} x={x} y={y} width="1" height="1" fill={c} /> : null;
      })}
    </svg>
  );
}
