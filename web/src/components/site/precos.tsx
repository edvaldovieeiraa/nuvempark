"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { urlApp } from "@/lib/urls";
import { eyebrow, h2, btnPrimary } from "@/components/site/tokens";

const PLANO = [
  "App operacional offline-first",
  "Cobrança automática por tempo",
  "Leitura de placa por câmera",
  "Impressão Bluetooth com QR Code",
  "Painel web em tempo real",
  "Vários pátios na mesma conta",
  "Mensalistas e livre passagem",
  "Operadores e caixa por sessão",
  "Relatórios de faturamento",
  "Suporte no WhatsApp",
  "Atualizações incluídas",
  "Sem fidelidade — cancele quando quiser",
];

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

function Item({ children }: { children: string }) {
  return (
    <li style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14 }}>
      <span style={{ marginTop: 1, width: 18, height: 18, borderRadius: 9999, background: "#DCFCE7", border: "1px solid #BBF7D0", color: "#16A34A", display: "grid", placeItems: "center", flex: "none" }}>
        <Check size={11} strokeWidth={3.2} />
      </span>
      <span style={{ color: "#6B7280" }}>{children}</span>
    </li>
  );
}

export function Precos() {
  const [aba, setAba] = useState<"a" | "b">("a");

  return (
    <section id="precos" data-sec style={{ background: "#F3F4F6", padding: "96px 0", borderTop: "1px solid #E5E7EB" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px" }}>
        <Reveal>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            <span style={eyebrow}>Preço</span>
            <h2 data-balance style={h2}>Teste 15 dias grátis. Depois, R$ 129,90 por pátio.</h2>
            <p style={{ margin: "16px 0 0", fontSize: 17, lineHeight: 1.6, color: "#6B7280" }}>
              Um preço só: sem taxa de instalação, sem cobrança por operador, sem
              surpresa no boleto. Um carro por dia paga o sistema.
            </p>
            <div style={{ marginTop: 24, display: "inline-flex", padding: 4, borderRadius: 12, background: "#fff", border: "1px solid #E5E7EB", gap: 2 }}>
              <button type="button" onClick={() => setAba("a")} style={tab(aba === "a")}>Vitrine</button>
              <button type="button" onClick={() => setAba("b")} style={tab(aba === "b")}>Cartão único</button>
            </div>
          </div>
        </Reveal>

        {aba === "a" ? <Vitrine /> : <CartaoUnico />}

        {/* garantias */}
        <div data-garantias style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          <Garantia titulo="Você mesmo cria a conta" texto="Sem vendedor, sem espera. Em 1 minuto está dentro do painel." ico="phone" />
          <Garantia titulo="Sem cartão para testar" texto="15 dias completos, todos os recursos. Só paga se decidir ficar." ico="shield" />
          <Garantia titulo="Cancele quando quiser" texto="Sem fidelidade e sem multa. Seus dados são seus." ico="refresh" />
        </div>
      </div>
    </section>
  );
}

function Vitrine() {
  return (
    <Reveal>
      <div data-precos-a style={{ marginTop: 48, borderRadius: 24, background: "#fff", border: "1px solid #E5E7EB", boxShadow: "0 24px 64px -24px rgba(11,18,32,.18)", overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ position: "relative", overflow: "hidden", padding: 40, display: "flex", flexDirection: "column", justifyContent: "center", background: "#0B1220" }}>
          <div className="np-grid" style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundSize: "40px 40px" }} />
          <div style={{ position: "absolute", top: -80, right: -64, width: "18rem", height: "18rem", borderRadius: 9999, background: "rgba(22,163,74,.15)", filter: "blur(64px)" }} />
          <div style={{ position: "relative" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#86EFAC", background: "rgba(22,163,74,.1)", border: "1px solid rgba(34,197,94,.25)", padding: "5px 12px", borderRadius: 9999 }}>
              15 dias grátis, depois:
            </span>
            <div style={{ marginTop: 20, display: "flex", alignItems: "flex-end", gap: 8 }}>
              <span style={{ fontSize: "clamp(3rem,6vw,3.75rem)", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#fff", lineHeight: 1 }}>
                R$ 129<span style={{ fontSize: "0.6em" }}>,90</span>
              </span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.6)" }}>por mês, por pátio — tudo incluso</p>
            <p style={{ margin: "20px 0 0", fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,.7)" }}>
              Menos do que um único cliente deixa no seu caixa por dia. Adicione
              ou remova pátios quando quiser — o valor acompanha.
            </p>
            <a href={urlApp("/cadastro")} style={{ ...btnPrimary(52), marginTop: 28 }}>
              Começar grátis agora
              <ArrowRight size={16} strokeWidth={2.4} />
            </a>
            <p style={{ margin: "12px 0 0", fontSize: 11, color: "rgba(255,255,255,.55)" }}>Sem cartão para testar. Cancele quando quiser, sem multa.</p>
          </div>
        </div>
        <div style={{ padding: 40, background: "#FAFBFA" }}>
          <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#94A3B8" }}>Tudo incluso</p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
            {PLANO.map((r) => (
              <Item key={r}>{r}</Item>
            ))}
          </ul>
        </div>
      </div>
    </Reveal>
  );
}

function CartaoUnico() {
  return (
    <Reveal>
      <div style={{ marginTop: 48, maxWidth: 600, marginLeft: "auto", marginRight: "auto", borderRadius: 24, background: "#fff", border: "2px solid #16A34A", boxShadow: "0 24px 64px -24px rgba(21,128,61,.3)", overflow: "hidden", position: "relative" }}>
        <div style={{ background: "linear-gradient(90deg,#16A34A,#166534)", padding: 8, textAlign: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "#fff" }}>Plano único · sem pegadinha</span>
        </div>
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 8 }}>
            <span style={{ fontSize: "clamp(3.25rem,7vw,4.5rem)", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#1F2937", lineHeight: 1 }}>
              R$ 129<span style={{ fontSize: "0.5em", color: "#6B7280" }}>,90</span>
            </span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 15, fontWeight: 600, color: "#6B7280" }}>por mês, por pátio — tudo incluso</p>
          <a href={urlApp("/cadastro")} style={{ ...btnPrimary(52, 36), margin: "28px auto 0" }}>
            Começar grátis por 15 dias
            <ArrowRight size={16} strokeWidth={2.4} />
          </a>
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "#94A3B8" }}>Sem cartão para testar · cancele quando quiser</p>
        </div>
        <div style={{ borderTop: "1px solid #E5E7EB", padding: "32px 40px", background: "#FAFBFA" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
            {PLANO.map((r) => (
              <Item key={r}>{r}</Item>
            ))}
          </ul>
        </div>
      </div>
    </Reveal>
  );
}

function Garantia({ titulo, texto, ico }: { titulo: string; texto: string; ico: "phone" | "shield" | "refresh" }) {
  const path =
    ico === "phone" ? (
      <>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M12 18h.01" />
      </>
    ) : ico === "shield" ? (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ) : (
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
    );
  return (
    <Reveal>
      <div>
        <span style={{ display: "inline-grid", placeItems: "center", width: 44, height: 44, borderRadius: 12, background: "#DCFCE7", color: "#16A34A", marginBottom: 12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {path}
          </svg>
        </span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1F2937" }}>{titulo}</h3>
        <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.55, color: "#6B7280" }}>{texto}</p>
      </div>
    </Reveal>
  );
}
