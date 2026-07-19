import Link from "next/link";
import { ArrowRight, UserPlus, Smartphone, RefreshCw } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { urlApp } from "@/lib/urls";
import { MONO, WHATSAPP, eyebrow, h2, btnPrimary, btnGhostDark } from "@/components/site/tokens";
import { Marca } from "@/components/marca";

/* Re-exports para as sub-páginas do site continuarem importando de "secoes". */
export { WHATSAPP } from "@/components/site/tokens";
export { Recursos } from "@/components/site/recursos";
export { Precos } from "@/components/site/precos";

/* =========================================================
   FAIXA DE NÚMEROS (ponte escura)
   ========================================================= */
export function Numeros() {
  const itens = [
    { valor: "100%", rotulo: "offline — a fila anda mesmo sem internet" },
    { valor: "3 seg", rotulo: "da placa lida ao ticket na mão do cliente" },
    { valor: "R$ 0", rotulo: "de equipamento — usa o celular que você já tem" },
    { valor: "1 painel", rotulo: "para enxergar todos os seus pátios ao vivo" },
  ];
  return (
    <section style={{ position: "relative", overflow: "hidden", background: "#0B1220", borderTop: "1px solid rgba(255,255,255,.08)" }}>
      <div className="np-grid" style={{ position: "absolute", inset: 0, opacity: 0.04 }} />
      <div data-num-grid style={{ position: "relative", maxWidth: 1152, margin: "0 auto", padding: "48px 20px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "32px 24px" }}>
        {itens.map((n, i) => (
          <Reveal key={n.rotulo} delay={i * 0.08}>
            <div style={{ textAlign: "center", padding: "0 12px", borderLeft: i === 0 ? undefined : "1px solid rgba(255,255,255,.1)" }}>
              <div style={{ fontSize: "clamp(2rem,4vw,2.5rem)", fontWeight: 800, color: "#22C55E", fontVariantNumeric: "tabular-nums" }}>{n.valor}</div>
              <div style={{ marginTop: 6, fontSize: 14, color: "rgba(255,255,255,.65)", fontWeight: 500 }}>{n.rotulo}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   COMO FUNCIONA (3 passos)
   ========================================================= */
export function ComoFunciona() {
  const passos = [
    { n: "01", Icone: UserPlus, numCor: "#DCFCE7", grad: "linear-gradient(135deg,#16A34A,#166534)", sombra: "0 8px 20px -8px rgba(21,128,61,.6)", titulo: "Crie sua conta em 1 minuto", texto: "Cadastro grátis, sem cartão e sem vendedor. Confirmou o e-mail, seu painel já abre — com 15 dias liberados na hora." },
    { n: "02", Icone: Smartphone, numCor: "#BAE6FD", grad: "linear-gradient(135deg,#0EA5E9,#166534)", sombra: "0 8px 20px -8px rgba(14,165,233,.6)", titulo: "Baixe o app e chame a equipe", texto: "Cadastre pátios e operadores no painel. Eles baixam o app no Android e entram com o código do pátio — sem obra, sem técnico." },
    { n: "03", Icone: RefreshCw, numCor: "#E9D5FF", grad: "linear-gradient(135deg,#8B5CF6,#0EA5E9)", sombra: "0 8px 20px -8px rgba(139,92,246,.6)", titulo: "Opere e acompanhe ao vivo", texto: "Carro chega, câmera lê a placa, ticket sai impresso. Cada real aparece no seu painel na hora." },
  ];

  return (
    <section id="como" data-sec style={{ background: "#F3F4F6", padding: "96px 0", borderTop: "1px solid #E5E7EB" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 20px" }}>
        <Reveal>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            <span style={eyebrow}>Como funciona</span>
            <h2 data-balance style={h2}>Do cadastro ao primeiro ticket, no mesmo dia.</h2>
            <p style={{ margin: "16px 0 0", fontSize: 17, lineHeight: 1.6, color: "#6B7280" }}>
              Sistema de estacionamento costuma significar semanas de instalação e
              equipamento caro. Aqui você mesmo põe pra rodar — em 3 passos.
            </p>
          </div>
        </Reveal>

        <div data-steps style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, position: "relative" }}>
          {passos.map((p) => (
            <Reveal key={p.n}>
              <div style={{ position: "relative", borderRadius: 20, background: "#fff", border: "1px solid #E5E7EB", padding: 28, boxShadow: "0 1px 2px rgba(11,18,32,.04),0 4px 16px -4px rgba(11,18,32,.06)", height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 44, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: p.numCor, lineHeight: 1 }}>{p.n}</span>
                  <span style={{ width: 44, height: 44, borderRadius: 12, background: p.grad, display: "grid", placeItems: "center", boxShadow: p.sombra }}>
                    <p.Icone size={20} strokeWidth={2} color="#fff" />
                  </span>
                </div>
                <h3 style={{ margin: "20px 0 0", fontSize: 18, fontWeight: 800, color: "#1F2937" }}>{p.titulo}</h3>
                <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.6, color: "#6B7280" }}>{p.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div style={{ marginTop: 40, textAlign: "center" }}>
            <a href={urlApp("/cadastro")} style={btnPrimary()}>
              Criar minha conta grátis
              <ArrowRight size={16} strokeWidth={2.4} />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* =========================================================
   ROADMAP
   ========================================================= */
export function Roadmap() {
  const proximas = ["Conciliação bancária", "App para o cliente", "Exportar relatórios", "Integrações via API"];
  return (
    <section style={{ background: "#fff", padding: "80px 0" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 20px" }}>
        <Reveal>
          <div data-roadmap style={{ borderRadius: 24, border: "1px solid #E5E7EB", background: "#F3F4F6", padding: 48, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
            <div>
              <span style={eyebrow}>Em constante evolução</span>
              <h2 style={{ margin: "12px 0 0", fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 800, letterSpacing: "-.01em", lineHeight: 1.12, color: "#1F2937" }}>
                Você assina uma vez.<br />O produto melhora todo mês.
              </h2>
              <p style={{ margin: "16px 0 0", fontSize: 16, lineHeight: 1.6, color: "#6B7280", maxWidth: 420 }}>
                Cada novidade entra no seu plano automaticamente, sem custo extra e
                sem “versão premium”. Olha o que está chegando:
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {proximas.map((p) => (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 14, border: "1px solid #E5E7EB", background: "#fff", padding: "14px 16px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#16A34A", flex: "none" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1F2937" }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* =========================================================
   CTA FINAL (bookend escuro)
   ========================================================= */
export function CtaFinal() {
  return (
    <section style={{ background: "#fff", padding: "0 0 96px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px" }}>
        <Reveal>
          <div style={{ position: "relative", overflow: "hidden", borderRadius: 32, background: "#0B1220", padding: "72px 40px", textAlign: "center", boxShadow: "0 32px 80px -24px rgba(11,18,32,.45)" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#0B1220,#10201A 55%,#0B1220)" }} />
            <div className="np-grid np-grid-mask-cta" style={{ position: "absolute", inset: 0, opacity: 0.05 }} />
            <div style={{ position: "absolute", top: -96, left: -64, width: "20rem", height: "20rem", borderRadius: 9999, background: "rgba(22,163,74,.12)", filter: "blur(64px)" }} />
            <div style={{ position: "absolute", bottom: -96, right: -64, width: "18rem", height: "18rem", borderRadius: 9999, background: "rgba(14,165,233,.1)", filter: "blur(64px)" }} />
            <div style={{ position: "relative" }}>
              <h2 style={{ margin: 0, fontSize: "clamp(2rem,4vw,2.75rem)", fontWeight: 800, letterSpacing: "-.02em", color: "#fff" }}>
                Quanto o seu pátio<br /><span style={{ color: "#22C55E" }}>faturou hoje?</span>
              </h2>
              <p style={{ margin: "16px auto 0", maxWidth: 560, fontSize: 17, lineHeight: 1.6, color: "rgba(255,255,255,.7)" }}>
                Se a resposta foi “preciso perguntar ao operador”, você já tem um
                bom motivo para testar. Comece a enxergar o faturamento em tempo
                real <b style={{ color: "#fff" }}>hoje mesmo</b> — grátis por 15
                dias, sem cartão.
              </p>
              <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <a href={urlApp("/cadastro")} style={btnPrimary(52, 32)}>
                  Criar minha conta grátis
                  <ArrowRight size={16} strokeWidth={2.4} />
                </a>
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={{ ...btnGhostDark, padding: "0 32px" }}>
                  Tirar dúvidas no WhatsApp
                </a>
              </div>
              <p style={{ margin: "16px 0 0", fontSize: 13, color: "rgba(255,255,255,.55)" }}>
                Leva 1 minuto. Você mesmo cria a conta — sem espera, sem vendedor.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* =========================================================
   FOOTER
   ========================================================= */
export function SiteFooter() {
  const colunas: {
    titulo: string;
    links: { href: string; label: string; externo?: boolean; app?: boolean; interno?: boolean }[];
  }[] = [
    {
      titulo: "Produto",
      links: [
        { href: "/recursos", label: "Recursos", interno: true },
        { href: "/precos", label: "Preços", interno: true },
        { href: "/novidades", label: "Novidades", interno: true },
      ],
    },
    {
      titulo: "Empresa",
      links: [
        { href: "/sobre", label: "Sobre nós", interno: true },
        { href: "/contato", label: "Contato", interno: true },
      ],
    },
    {
      titulo: "Acesso",
      links: [
        { href: urlApp("/cadastro"), label: "Começar grátis", app: true },
        { href: urlApp("/login"), label: "Painel do gestor", app: true },
        { href: WHATSAPP, label: "Falar no WhatsApp", externo: true },
      ],
    },
  ];

  const linkStyle: React.CSSProperties = { fontSize: 14, color: "#6B7280" };

  return (
    <footer style={{ background: "#fff", borderTop: "1px solid #E5E7EB" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "56px 20px" }}>
        <div data-footer style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#16A34A,#166534)", display: "grid", placeItems: "center" }}>
                <Marca className="w-5 h-5" corP="#166534" />
              </span>
              <span style={{ fontWeight: 300, fontSize: 19, color: "#1F2937" }}>
                Nuvem<span style={{ fontWeight: 800, color: "#15803D" }}>Park</span>
              </span>
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 14, color: "#94A3B8", maxWidth: 280, lineHeight: 1.6 }}>
              O sistema que cabe no bolso do operador — e coloca o faturamento do
              pátio na sua mão.
            </p>
          </div>

          {colunas.map((c) => (
            <div key={c.titulo}>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#94A3B8" }}>{c.titulo}</p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.interno ? (
                      <Link href={l.href} style={linkStyle}>{l.label}</Link>
                    ) : (
                      <a href={l.href} target={l.externo ? "_blank" : undefined} rel={l.externo ? "noopener noreferrer" : undefined} style={linkStyle}>{l.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #E5E7EB", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13, color: "#94A3B8" }}>
          <span>© 2026 NuvemPark. Todos os direitos reservados.</span>
          <span style={{ fontFamily: MONO }}>nuvempark.com</span>
        </div>
      </div>
    </footer>
  );
}
