import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { CtaFinal } from "@/components/site/secoes";
import { SolucaoStyle } from "@/components/solucoes/solucao-style";
import {
  POPPINS,
  WHATSAPP,
  btnGhostDark,
  btnPrimary,
  eyebrow,
  h2 as h2Style,
} from "@/components/site/tokens";
import { urlApp } from "@/lib/urls";
import {
  type PaginaSolucao,
  type SecaoSolucao,
  resumoCurto,
  tituloCurto,
} from "@/lib/solucoes";

/**
 * Template das páginas comerciais de busca.
 *
 * COMPONENTE DE SERVIDOR de propósito, sem `"use client"`: todo o texto precisa
 * estar no HTML da primeira resposta. É o oposto do FAQ da home, que guardava
 * as respostas atrás de estado do React e só entregava ao rastreador a que
 * estivesse aberta.
 *
 * Pelo mesmo motivo o acordeão do FAQ é o `<details>` nativo: abre e fecha sem
 * JavaScript, é acessível por teclado e mantém a resposta no DOM fechada.
 */
export function PaginaSolucaoView({ pagina }: { pagina: PaginaSolucao }) {
  return (
    <div style={{ overflowX: "hidden", fontFamily: POPPINS }}>
      <SolucaoStyle />
      <HeroSolucao pagina={pagina} />

      {pagina.secoes.map((secao, i) => (
        <Secao key={secao.h2} secao={secao} claro={i % 2 === 1} />
      ))}

      <FaqSolucao itens={pagina.faq} />

      {pagina.leituras && pagina.leituras.length > 0 ? (
        <Leituras itens={pagina.leituras} />
      ) : null}

      <Relacionados caminhos={pagina.relacionados} />

      <CtaFinal />
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */

function HeroSolucao({ pagina }: { pagina: PaginaSolucao }) {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#0B1220",
        padding: "128px 0 72px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg,#0B1220,#10201A 55%,#0B1220)",
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
          left: "20%",
          width: "34rem",
          height: "34rem",
          borderRadius: 9999,
          background: "rgba(22,163,74,.12)",
          filter: "blur(64px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{ position: "relative", maxWidth: 880, margin: "0 auto", padding: "0 20px" }}
      >
        {/* Migalhas visíveis: o mesmo caminho que vai no BreadcrumbList. Sem a
            versão visível, o dado estruturado descreve uma navegação que não
            existe na página. */}
        <nav aria-label="Você está aqui">
          <ol
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 6,
              margin: 0,
              padding: 0,
              listStyle: "none",
              fontSize: 13,
              color: "rgba(255,255,255,.5)",
            }}
          >
            {pagina.migalhas.map((m) => (
              <li key={m.caminho} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Link href={m.caminho} style={{ color: "rgba(255,255,255,.6)" }}>
                  {m.nome}
                </Link>
                <ChevronRight size={14} aria-hidden />
              </li>
            ))}
            <li aria-current="page" style={{ color: "rgba(255,255,255,.85)" }}>
              {pagina.h1}
            </li>
          </ol>
        </nav>

        <h1
          data-balance
          style={{
            margin: "20px 0 0",
            fontSize: "clamp(2.25rem,5vw,3.5rem)",
            fontWeight: 800,
            letterSpacing: "-.03em",
            lineHeight: 1.06,
            color: "#fff",
          }}
        >
          {pagina.h1}
        </h1>

        <p
          style={{
            margin: "18px 0 0",
            maxWidth: 620,
            fontSize: 19,
            lineHeight: 1.6,
            color: "rgba(255,255,255,.75)",
          }}
        >
          {pagina.subtitulo}
        </p>

        {/* Caixa de resposta direta: é o bloco que o Google recorta como
            definição. Fica acima da dobra e antes de qualquer seção. */}
        <div
          style={{
            marginTop: 32,
            borderRadius: 18,
            border: "1px solid rgba(34,197,94,.28)",
            background: "rgba(22,163,74,.1)",
            padding: "22px 26px",
          }}
        >
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,.9)" }}>
            {pagina.resposta}
          </p>
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
          }}
        >
          <a href={urlApp("/cadastro")} style={btnPrimary()}>
            Começar grátis por 15 dias
            <ArrowRight size={16} strokeWidth={2.4} />
          </a>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            style={btnGhostDark}
          >
            Tirar dúvidas no WhatsApp
          </a>
        </div>

        <p
          style={{
            marginTop: 16,
            fontSize: 13,
            color: "rgba(255,255,255,.55)",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 18px",
          }}
        >
          {["Sem cartão de crédito", "Liberação na hora", "Cancele quando quiser"].map((t) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={14} strokeWidth={2.4} color="#22C55E" />
              {t}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

/* ── Seções ───────────────────────────────────────────────────────────────── */

function Secao({ secao, claro }: { secao: SecaoSolucao; claro: boolean }) {
  return (
    <section
      style={{
        background: claro ? "#F3F4F6" : "#fff",
        padding: "80px 0",
        borderTop: "1px solid #E5E7EB",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 20px" }}>
        <Reveal>
          <h2 data-balance style={{ ...h2Style, fontSize: "clamp(1.75rem,3.2vw,2.25rem)" }}>
            {secao.h2}
          </h2>
        </Reveal>

        {secao.texto ? (
          <Reveal>
            <p style={{ margin: "16px 0 0", fontSize: 17, lineHeight: 1.7, color: "#4B5563" }}>
              {secao.texto}
            </p>
          </Reveal>
        ) : null}

        {secao.lista ? (
          <Reveal>
            <ul
              style={{
                margin: "28px 0 0",
                padding: 0,
                listStyle: "none",
                display: "grid",
                gap: 12,
              }}
            >
              {secao.lista.map((item) => (
                <li
                  key={item}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    fontSize: 16,
                    lineHeight: 1.55,
                    color: "#1F2937",
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2
                    size={20}
                    strokeWidth={2.4}
                    color="#16A34A"
                    style={{ flex: "none", marginTop: 1 }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        ) : null}

        {secao.tabela ? <Tabela tabela={secao.tabela} /> : null}

        {secao.itens ? (
          <div style={{ marginTop: 36, display: "grid", gap: 20 }}>
            {secao.itens.map((item, i) => (
              <Reveal key={item.h3} delay={i * 0.06}>
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid #E5E7EB",
                    background: claro ? "#fff" : "#FAFBFA",
                    padding: 26,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#1F2937",
                      letterSpacing: "-.01em",
                    }}
                  >
                    {item.h3}
                  </h3>
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: 15.5,
                      lineHeight: 1.65,
                      color: "#6B7280",
                    }}
                  >
                    {item.texto}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        ) : null}

        {secao.textoFinal ? (
          <Reveal>
            <p style={{ margin: "28px 0 0", fontSize: 17, lineHeight: 1.7, color: "#4B5563" }}>
              {secao.textoFinal}
            </p>
          </Reveal>
        ) : null}

        {secao.link ? (
          <Reveal>
            <p style={{ margin: "28px 0 0" }}>
              <Link
                href={secao.link.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#15803D",
                }}
              >
                {secao.link.texto}
                <ArrowRight size={16} strokeWidth={2.4} />
              </Link>
            </p>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}

/** Tabela de comparação. Rola sozinha no celular em vez de estourar a página. */
function Tabela({
  tabela,
}: {
  tabela: NonNullable<SecaoSolucao["tabela"]>;
}) {
  return (
    <Reveal>
      <div
        style={{
          marginTop: 28,
          overflowX: "auto",
          borderRadius: 18,
          border: "1px solid #E5E7EB",
          background: "#fff",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: 520,
            borderCollapse: "collapse",
            fontSize: 15,
          }}
        >
          <thead>
            <tr>
              {tabela.cabecalho.map((c, i) => (
                <th
                  key={c || `col-${i}`}
                  scope="col"
                  style={{
                    textAlign: "left",
                    padding: "14px 18px",
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    color: i === tabela.cabecalho.length - 1 ? "#15803D" : "#94A3B8",
                    borderBottom: "1px solid #E5E7EB",
                    background: i === tabela.cabecalho.length - 1 ? "#F0FDF4" : "#FAFBFA",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabela.linhas.map((linha) => (
              <tr key={linha[0]}>
                {linha.map((celula, i) => (
                  <td
                    key={`${linha[0]}-${i}`}
                    style={{
                      padding: "14px 18px",
                      borderBottom: "1px solid #F3F4F6",
                      color: i === 0 ? "#1F2937" : "#4B5563",
                      fontWeight: i === 0 ? 700 : 500,
                      background:
                        i === linha.length - 1 && linha.length > 2 ? "#F0FDF4" : undefined,
                      lineHeight: 1.5,
                    }}
                  >
                    {celula}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Reveal>
  );
}

/* ── FAQ ──────────────────────────────────────────────────────────────────── */

function FaqSolucao({ itens }: { itens: PaginaSolucao["faq"] }) {
  return (
    <section style={{ background: "#fff", padding: "80px 0", borderTop: "1px solid #E5E7EB" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 20px" }}>
        <Reveal>
          <span style={eyebrow}>Dúvidas comuns</span>
          <h2 data-balance style={{ ...h2Style, fontSize: "clamp(1.75rem,3.2vw,2.25rem)" }}>
            Perguntas frequentes
          </h2>
        </Reveal>

        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 12 }}>
          {itens.map((item, i) => (
            <details
              key={item.pergunta}
              // A primeira já abre: dá uma resposta imediata a quem chegou da
              // busca sem obrigar a um clique.
              open={i === 0}
              style={{
                borderRadius: 16,
                border: "1px solid #E5E7EB",
                background: "#F3F4F6",
                overflow: "hidden",
              }}
            >
              <summary
                className="np-faq-sumario"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "18px 22px",
                  cursor: "pointer",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#1F2937",
                  listStyle: "none",
                }}
              >
                {item.pergunta}
                <ChevronDown
                  size={18}
                  strokeWidth={2.4}
                  color="#16A34A"
                  style={{ flex: "none" }}
                  aria-hidden
                />
              </summary>
              <div
                style={{
                  padding: "0 22px 18px",
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "#4B5563",
                }}
              >
                {item.resposta}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Blocos de ligação interna ────────────────────────────────────────────── */

function Leituras({ itens }: { itens: NonNullable<PaginaSolucao["leituras"]> }) {
  return (
    <section
      style={{ background: "#F3F4F6", padding: "72px 0", borderTop: "1px solid #E5E7EB" }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 20px" }}>
        <span style={eyebrow}>Aprofunde</span>
        <h2 style={{ ...h2Style, fontSize: "clamp(1.5rem,2.6vw,1.875rem)" }}>
          Leituras que explicam o porquê
        </h2>
        <ul
          style={{
            margin: "24px 0 0",
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 10,
          }}
        >
          {itens.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  borderRadius: 14,
                  border: "1px solid #E5E7EB",
                  background: "#fff",
                  padding: "16px 20px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#1F2937",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 9999,
                    background: "#16A34A",
                    flex: "none",
                  }}
                />
                {l.titulo}
                <ArrowRight
                  size={16}
                  strokeWidth={2.4}
                  color="#94A3B8"
                  style={{ marginLeft: "auto", flex: "none" }}
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Relacionados({ caminhos }: { caminhos: string[] }) {
  if (caminhos.length === 0) return null;
  return (
    <section style={{ background: "#fff", padding: "72px 0", borderTop: "1px solid #E5E7EB" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 20px" }}>
        <span style={eyebrow}>Continue por aqui</span>
        <h2 style={{ ...h2Style, fontSize: "clamp(1.5rem,2.6vw,1.875rem)" }}>
          Outras partes do sistema
        </h2>
        <div
          data-solucoes-grid
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(caminhos.length, 3)},1fr)`,
            gap: 16,
          }}
        >
          {caminhos.map((c) => (
            <Link
              key={c}
              href={c}
              style={{
                display: "block",
                height: "100%",
                borderRadius: 18,
                border: "1px solid #E5E7EB",
                background: "#FAFBFA",
                padding: 24,
                textDecoration: "none",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1F2937" }}>
                {tituloCurto(c)}
              </h3>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "#6B7280",
                }}
              >
                {resumoCurto(c)}
              </p>
              <span
                style={{
                  marginTop: 14,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#15803D",
                }}
              >
                Ver
                <ArrowRight size={15} strokeWidth={2.4} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
