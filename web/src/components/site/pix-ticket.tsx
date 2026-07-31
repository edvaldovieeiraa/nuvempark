import Image from "next/image";
import { QrCode, CheckCircle2 } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { pill, listItem } from "@/components/site/tokens";

/* =========================================================
   PIX NO TICKET — imagem real (pix-ticket-hero.png).
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
            <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", border: "1px solid #E5E7EB", boxShadow: "0 30px 80px -28px rgba(11,18,32,.3)" }}>
              {/* width/height = tamanho real do arquivo: reservam o espaço
                  antes do download (CLS) e deixam o next/image entregar uma
                  versão do tamanho certo — o PageSpeed acusou 1400x1045 sendo
                  exibida a 648x483, 55 KiB jogados fora só aqui. */}
              <Image
                src="/uploads/pix-ticket-hero.webp"
                alt="Cliente escaneia o QR do ticket NuvemPark e paga com Pix no celular"
                width={1400}
                height={1045}
                sizes="(max-width: 900px) 100vw, 548px"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

