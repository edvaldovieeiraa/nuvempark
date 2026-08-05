import Link from "next/link";
import {
  ArrowRight,
  UserPlus,
  Smartphone,
  RefreshCw,
  Zap,
  ShieldCheck,
  Target,
  HeartHandshake,
  MessageCircle,
  Mail,
  Clock,
} from "lucide-react";
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
    // `id="novidades"`: é o destino do item "Novidades" do menu, que antes
    // apontava para a página /novidades (agora 301 para cá).
    <section id="novidades" data-sec style={{ background: "#fff", padding: "80px 0" }}>
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
   SOBRE — versão enxuta da antiga /sobre.
   O site virou onepage: a página dedicada foi para /#sobre.
   Quatro valores em faixa, sem herói próprio.
   ========================================================= */
export function Sobre() {
  const valores = [
    {
      Icone: Zap,
      titulo: "Simplicidade primeiro",
      texto:
        "Se o operador precisa de treinamento longo, erramos. Cada tela é pensada para o ritmo real de um pátio cheio.",
      cor: "#F59E0B",
      fundo: "rgba(245,158,11,.1)",
    },
    {
      Icone: ShieldCheck,
      titulo: "Confiabilidade",
      texto:
        "Estacionamento não pode parar. Por isso o app funciona offline e cada centavo é registrado e auditável.",
      cor: "#16A34A",
      fundo: "rgba(22,163,74,.1)",
    },
    {
      Icone: Target,
      titulo: "Feito por quem opera",
      texto:
        "Não somos uma software house distante — a plataforma nasceu dentro de uma operação real de pátios.",
      cor: "#0EA5E9",
      fundo: "rgba(14,165,233,.1)",
    },
    {
      Icone: HeartHandshake,
      titulo: "Parceria de verdade",
      texto:
        "Seu sucesso é o nosso. O roadmap é guiado pelo que nossos clientes precisam no dia a dia.",
      cor: "#8B5CF6",
      fundo: "rgba(139,92,246,.1)",
    },
  ];
  return (
    <section id="sobre" data-sec style={{ background: "#F3F4F6", padding: "96px 0", borderTop: "1px solid #E5E7EB" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 20px" }}>
        <Reveal>
          <div style={{ maxWidth: 620 }}>
            <span style={eyebrow}>Quem faz</span>
            <h2 style={h2}>
              Nascemos dentro da operação,<br />não de uma reunião
            </h2>
            <p style={{ margin: "16px 0 0", fontSize: 16, lineHeight: 1.6, color: "#6B7280" }}>
              O NuvemPark é a tecnologia que construímos para o nosso próprio
              dia a dia de pátio — e que hoje está disponível para o seu.
            </p>
          </div>
        </Reveal>
        <div data-valores style={{ marginTop: 40, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
          {valores.map((v, i) => (
            <Reveal key={v.titulo} delay={i * 0.07}>
              <div style={{ height: "100%", borderRadius: 20, border: "1px solid #E5E7EB", background: "#fff", padding: 24 }}>
                <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 14, background: v.fundo, color: v.cor }}>
                  <v.Icone size={22} strokeWidth={2.2} />
                </span>
                <h3 style={{ margin: "16px 0 0", fontSize: 16, fontWeight: 800, color: "#1F2937" }}>{v.titulo}</h3>
                <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.55, color: "#6B7280" }}>{v.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   CONTATO — versão enxuta da antiga /contato.
   Fica colado no CTA final de propósito: quem rolou o site
   inteiro está pronto para falar com alguém ou criar a conta.
   ========================================================= */
export function Contato() {
  return (
    <section id="contato" data-sec style={{ background: "#fff", padding: "96px 0 56px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px" }}>
        <Reveal>
          <div style={{ maxWidth: 620 }}>
            <span style={eyebrow}>Falar com a gente</span>
            <h2 style={h2}>
              Sem robô, sem script<br />de vendas
            </h2>
            <p style={{ margin: "16px 0 0", fontSize: 16, lineHeight: 1.6, color: "#6B7280" }}>
              Você conta como opera hoje, a gente mostra funcionando — e você
              decide.
            </p>
          </div>
        </Reveal>

        <div data-contato style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Reveal>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", height: "100%", borderRadius: 20, border: "1px solid #E5E7EB", background: "#fff", padding: 28, textDecoration: "none", transition: "border-color .15s, box-shadow .15s" }}
            >
              <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(22,163,74,.1)", color: "#16A34A" }}>
                <MessageCircle size={24} strokeWidth={2.2} />
              </span>
              <h3 style={{ margin: "18px 0 0", fontSize: 19, fontWeight: 800, color: "#1F2937" }}>WhatsApp</h3>
              <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.55, color: "#6B7280" }}>
                O caminho mais rápido. Fale direto com quem entende do produto —
                sem robô, sem fila.
              </p>
              <span style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#15803D" }}>
                (81) 99614-2120
                <ArrowRight size={16} strokeWidth={2.4} />
              </span>
            </a>
          </Reveal>

          <Reveal delay={0.08}>
            <a
              href="mailto:contato@nuvempark.com"
              style={{ display: "block", height: "100%", borderRadius: 20, border: "1px solid #E5E7EB", background: "#fff", padding: 28, textDecoration: "none", transition: "border-color .15s, box-shadow .15s" }}
            >
              <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(14,165,233,.1)", color: "#0EA5E9" }}>
                <Mail size={24} strokeWidth={2.2} />
              </span>
              <h3 style={{ margin: "18px 0 0", fontSize: 19, fontWeight: 800, color: "#1F2937" }}>E-mail</h3>
              <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.55, color: "#6B7280" }}>
                Prefere escrever com calma? Envie sua dúvida ou pedido de
                proposta por e-mail.
              </p>
              <span style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#0284C7" }}>
                contato@nuvempark.com
                <ArrowRight size={16} strokeWidth={2.4} />
              </span>
            </a>
          </Reveal>
        </div>

        <Reveal delay={0.14}>
          <div style={{ marginTop: 20, borderRadius: 16, border: "1px solid #E5E7EB", background: "#F3F4F6", padding: "18px 22px", display: "flex", alignItems: "center", gap: 12 }}>
            <Clock size={20} strokeWidth={2.2} color="#9CA3AF" style={{ flex: "none" }} />
            <p style={{ margin: 0, fontSize: 14, color: "#6B7280" }}>
              Atendemos de <b style={{ color: "#1F2937" }}>segunda a sexta, das 8h às 18h</b>.
              Mensagens fora do horário são respondidas no próximo dia útil.
            </p>
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
    // Onepage: as âncoras levam para seções da home, com o `/` na frente para
    // funcionarem também a partir do blog. O blog e as páginas de solução são
    // rotas de verdade e usam <Link>.
    {
      titulo: "Produto",
      links: [
        { href: "/#recursos", label: "Recursos" },
        { href: "/#precos", label: "Preços" },
        { href: "/blog", label: "Blog", interno: true },
        { href: "/#novidades", label: "Novidades" },
      ],
    },
    // O silo de busca. Estar no rodapé põe estas quatro páginas em TODAS as
    // URLs do site — inclusive em cada post do blog, que é de onde vem a maior
    // parte do tráfego de descoberta. É o caminho pelo qual a autoridade do
    // conteúdo chega às páginas comerciais.
    {
      titulo: "Soluções",
      links: [
        { href: "/sistema-para-estacionamento", label: "Sistema para estacionamento", interno: true },
        { href: "/gestao-de-estacionamento", label: "Gestão de estacionamento", interno: true },
        { href: "/controle-de-estacionamento", label: "Controle de estacionamento", interno: true },
        { href: "/aplicativo-para-estacionamento", label: "Aplicativo para estacionamento", interno: true },
      ],
    },
    {
      titulo: "Empresa",
      links: [
        { href: "/#sobre", label: "Sobre nós" },
        { href: "/#contato", label: "Contato" },
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
        <div data-footer style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1.15fr 1fr 1fr", gap: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#16A34A,#166534)", display: "grid", placeItems: "center" }}>
                <Marca className="w-5 h-5" corP="#166534" />
              </span>
              <span style={{ fontWeight: 300, fontSize: 19, color: "#1F2937" }}>
                Nuvem<span style={{ fontWeight: 800, color: "#15803D" }}>Park</span>
              </span>
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 14, color: "#4B5563", maxWidth: 280, lineHeight: 1.6 }}>
              O sistema que cabe no bolso do operador — e coloca o faturamento do
              pátio na sua mão.
            </p>
          </div>

          {colunas.map((c) => (
            <div key={c.titulo}>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#4B5563" }}>{c.titulo}</p>
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

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #E5E7EB", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13, color: "#4B5563" }}>
          <span>© 2026 NuvemPark. Todos os direitos reservados.</span>
          <span style={{ fontFamily: MONO }}>nuvempark.com</span>
        </div>
      </div>
    </footer>
  );
}
