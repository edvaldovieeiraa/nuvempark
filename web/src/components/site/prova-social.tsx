"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { eyebrow, h2 } from "@/components/site/tokens";

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

/**
 * ⚠️ CONTEÚDO ILUSTRATIVO — pessoas e estabelecimentos FICTÍCIOS.
 *
 * Nenhum destes é cliente real. Existem para a seção não ficar com
 * "[Nome do cliente]" no ar enquanto não houver depoimento de verdade, e vêm
 * acompanhados do aviso visível logo abaixo da grade — mesmo padrão que a aba
 * "Em destaque" já usava.
 *
 * Ao substituir por clientes REAIS: troque os três objetos, tenha autorização
 * escrita de cada pessoa para publicar nome e frase, e REMOVA o aviso e a
 * constante ILUSTRATIVO. Publicar depoimento inventado como se fosse real é
 * publicidade enganosa (CDC, art. 37).
 */
const ILUSTRATIVO = true;

const DEPOIMENTOS = [
  {
    texto:
      "“Parei de perguntar pro operador quanto entrou. Abro o celular e já sei — de casa, no domingo. Nunca mais tive caixa sem dono.”",
    nome: "Ricardo Almeida",
    negocio: "Estacionamento Centro · Recife/PE",
  },
  {
    texto:
      "“A foto de avaria na entrada acabou com a discussão na saída. Já economizei mais do que a mensalidade em um único mês.”",
    nome: "Patrícia Nogueira",
    negocio: "Pátio Boa Viagem · Recife/PE",
  },
  {
    texto:
      "“Comecei com um pátio, hoje toco três na mesma conta. Não precisei de obra, cancela nem técnico — só o celular que a equipe já tinha.”",
    nome: "Marcos Tenório",
    negocio: "Rede Park Fácil · Caruaru/PE",
  },
];

function Avatar({ size = 44 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 9999, background: "#E5E7EB", flex: "none", display: "grid", placeItems: "center", color: "#94A3B8" }}>
      <User size={size * 0.5} strokeWidth={2} />
    </span>
  );
}

export function ProvaSocial() {
  const [aba, setAba] = useState<"a" | "b">("a");

  return (
    <section data-sec style={{ background: "#F3F4F6", padding: "96px 0", borderTop: "1px solid #E5E7EB" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 20px" }}>
        <Reveal>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
            <div style={{ maxWidth: 600 }}>
              <span style={eyebrow}>Quem já usa</span>
              <h2 data-balance style={h2}>Donos de pátio que largaram o caderno</h2>
            </div>
            <div style={{ display: "inline-flex", padding: 4, borderRadius: 12, background: "#fff", border: "1px solid #E5E7EB", gap: 2 }}>
              <button type="button" onClick={() => setAba("a")} style={tab(aba === "a")}>Depoimentos</button>
              <button type="button" onClick={() => setAba("b")} style={tab(aba === "b")}>Em destaque</button>
            </div>
          </div>
        </Reveal>

        {aba === "a" ? (
          <>
          <div data-prova-grid style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {DEPOIMENTOS.map((d) => (
              <Reveal key={d.nome}>
                <div style={{ borderRadius: 20, background: "#fff", border: "1px solid #E5E7EB", padding: 28, boxShadow: "0 1px 2px rgba(11,18,32,.04),0 4px 16px -4px rgba(11,18,32,.06)", display: "flex", flexDirection: "column", height: "100%" }}>
                  {/* Estrelas só quando houver avaliação REAL: nota inventada é
                      o elemento que mais faz um card ilustrativo passar por
                      avaliação de cliente. */}
                  {!ILUSTRATIVO && (
                    <div style={{ display: "flex", gap: 2, color: "#F59E0B" }}>★★★★★</div>
                  )}
                  <p style={{ margin: ILUSTRATIVO ? 0 : "16px 0 0", fontSize: 16, lineHeight: 1.6, color: "#1F2937", flex: 1 }}>{d.texto}</p>
                  <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#1F2937" }}>{d.nome}</div>
                      <div style={{ fontSize: 13, color: "#4B5563" }}>{d.negocio}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          {ILUSTRATIVO && (
            <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: 13, color: "#4B5563" }}>
              Depoimentos ilustrativos — pessoas e estabelecimentos fictícios,
              criados para demonstrar o formato da seção.
            </p>
          )}
          </>
        ) : (
          <>
            <Reveal>
              <div data-prova-feat style={{ marginTop: 48, borderRadius: 24, background: "#0B1220", position: "relative", overflow: "hidden", padding: 56, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 48, alignItems: "center" }}>
                <div className="np-grid" style={{ position: "absolute", inset: 0, opacity: 0.05 }} />
                <div style={{ position: "absolute", top: -80, left: -40, width: "24rem", height: "24rem", borderRadius: 9999, background: "rgba(22,163,74,.12)", filter: "blur(64px)" }} />
                <div style={{ position: "relative" }}>
                  <div style={{ fontSize: 56, lineHeight: 0.6, color: "#22C55E", fontWeight: 800 }}>“</div>
                  <p style={{ margin: "8px 0 0", fontSize: "clamp(1.25rem,2.2vw,1.75rem)", fontWeight: 800, lineHeight: 1.35, color: "#fff", letterSpacing: "-.01em" }}>
                    Parei de perguntar pro operador quanto entrou. Abro o celular e
                    já sei — e a foto de avaria na entrada acabou com a discussão na
                    saída.
                  </p>
                  <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 14 }}>
                    <Avatar size={52} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
                        {DEPOIMENTOS[0].nome}
                      </div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)" }}>
                        {DEPOIMENTOS[0].negocio}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ position: "relative", display: "grid", gap: 16 }}>
                  {/* Números FICTÍCIOS — o aviso logo abaixo do bloco diz isso. */}
                  {[
                    ["+38%", "em faturamento rastreado"],
                    ["3 pátios", "numa conta só"],
                  ].map(([v, l]) => (
                    <div key={v} style={{ borderRadius: 16, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", padding: 20, textAlign: "center" }}>
                      <div style={{ fontSize: 32, fontWeight: 800, color: "#22C55E", fontVariantNumeric: "tabular-nums" }}>{v}</div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,.6)" }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: 13, color: "#4B5563" }}>
              Números e depoimento ilustrativos — troque pelos reais quando tiver.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
