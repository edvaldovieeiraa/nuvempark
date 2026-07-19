"use client";

import { useActionState, useEffect, useState } from "react";
import { Printer, Save, QrCode, Loader2 } from "lucide-react";
import { salvarCupom, type Resultado } from "@/app/painel/patios/actions";
import { useToast } from "@/components/ui/toast";

/**
 * Personalização do cupom impresso (cabeçalho/rodapé) com preview ao vivo —
 * o gestor vê como o ticket sai na impressora térmica enquanto digita.
 */
export function ImpressaoClient({
  patioId,
  patioNome,
  cabecalhoInicial,
  rodapeInicial,
}: {
  patioId: string;
  patioNome: string;
  cabecalhoInicial: string[];
  rodapeInicial: string[];
}) {
  const toast = useToast();
  const [cabecalho, setCabecalho] = useState(cabecalhoInicial.join("\n"));
  const [rodape, setRodape] = useState(rodapeInicial.join("\n"));
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    salvarCupom,
    null,
  );

  useEffect(() => {
    if (!estado) return;
    if (estado.ok) toast.sucesso("Salvo!", estado.msg);
    else toast.erro("Não deu certo", estado.msg);
  }, [estado, toast]);

  const linhas = (s: string) =>
    s
      .split("\n")
      .map((l) => l.trim().slice(0, 48))
      .filter(Boolean)
      .slice(0, 4);

  const areaStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #E4E8EC",
    borderRadius: 11,
    background: "#FAFBFC",
    padding: "11px 13px",
    fontSize: 12,
    color: "#1F2937",
    lineHeight: 1.7,
    resize: "none",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: "#6B7280",
    marginBottom: 7,
  };

  const cabLinhas = linhas(cabecalho);
  const rodLinhas = linhas(rodape);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Cabeçalho da página */}
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: "-.02em",
          }}
        >
          Impressão
        </h2>
        <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
          <b style={{ color: "#1F2937" }}>{patioNome}</b> · personalize o ticket
          da impressora térmica. Até 4 linhas de 48 caracteres em cada bloco.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Formulário */}
        <div
          style={{
            borderRadius: 16,
            background: "#fff",
            border: "1px solid #E4E8EC",
            boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
            padding: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "#DCFCE7",
                color: "#16A34A",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Printer style={{ width: 16, height: 16 }} />
            </span>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
              Textos do cupom
            </h3>
          </div>

          <form action={agir}>
            <input type="hidden" name="patio_id" value={patioId} />

            <div style={labelStyle}>Cabeçalho (uma linha por linha)</div>
            <textarea
              className="mono"
              name="cabecalho"
              rows={4}
              value={cabecalho}
              onChange={(e) => setCabecalho(e.target.value)}
              style={{ ...areaStyle, minHeight: 96 }}
              placeholder={`${patioNome.toUpperCase()}\nRua Exemplo, 123 — Centro\nCNPJ 00.000.000/0001-00`}
            />

            <div style={{ ...labelStyle, margin: "16px 0 7px" }}>Rodapé</div>
            <textarea
              className="mono"
              name="rodape"
              rows={3}
              value={rodape}
              onChange={(e) => setRodape(e.target.value)}
              style={{ ...areaStyle, minHeight: 64 }}
              placeholder={`Obrigado pela preferência!\nNão nos responsabilizamos por objetos`}
            />

            <button
              type="submit"
              disabled={pendente}
              style={{
                marginTop: 18,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 42,
                padding: "0 18px",
                borderRadius: 11,
                border: "none",
                background: "linear-gradient(90deg,#16A34A,#22C55E)",
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                cursor: pendente ? "default" : "pointer",
                opacity: pendente ? 0.7 : 1,
                boxShadow: "0 8px 22px -8px rgba(22,163,74,.5)",
              }}
            >
              {pendente ? (
                <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />
              ) : (
                <Save style={{ width: 15, height: 15 }} />
              )}
              Salvar cupom
            </button>

            <div style={{ marginTop: 12, fontSize: 12, color: "#8695A0" }}>
              O app recebe na próxima sincronização — os próximos tickets já saem
              com o texto novo.
            </div>
          </form>
        </div>

        {/* Preview ao vivo */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "#8695A0",
              marginBottom: 9,
              paddingLeft: 2,
            }}
          >
            Prévia do ticket de entrada
          </div>
          <div
            className="mono"
            style={{
              width: 300,
              margin: "0 auto",
              background: "#fff",
              border: "1px solid #E4E8EC",
              borderRadius: 3,
              boxShadow: "0 12px 30px -12px rgba(16,27,20,.18)",
              padding: "20px 18px",
              fontSize: 11.5,
              lineHeight: 1.6,
              color: "#1F2937",
            }}
          >
            {/* Cabeçalho custom (ao vivo) */}
            {cabLinhas.length > 0 ? (
              cabLinhas.map((l, i) => (
                <div
                  key={i}
                  style={{
                    textAlign: "center",
                    fontWeight: 800,
                    textTransform: "uppercase",
                  }}
                >
                  {l}
                </div>
              ))
            ) : (
              <div
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "#8695A0",
                }}
              >
                (sem cabeçalho)
              </div>
            )}

            <Separador />
            <div
              style={{
                textAlign: "center",
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: ".08em",
              }}
            >
              TICKET DE ENTRADA
            </div>
            <Separador />

            <div>
              PLACA: <b style={{ letterSpacing: ".2em" }}>ABC1D23</b>
            </div>
            <div>TIPO: CARRO</div>
            <div>
              ENTRADA:{" "}
              {new Date().toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div>OPERADOR: OPERADOR01</div>

            <Separador />
            <div style={{ display: "grid", placeItems: "center", padding: "6px 0" }}>
              <span
                style={{
                  width: 96,
                  height: 96,
                  border: "2px solid #1F2937",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <QrCode style={{ width: 64, height: 64 }} strokeWidth={1.6} />
              </span>
              <div style={{ marginTop: 5, fontSize: 10 }}>apresente na saída</div>
            </div>
            <Separador />

            {/* Rodapé custom (ao vivo) */}
            {rodLinhas.length > 0 ? (
              rodLinhas.map((l, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  {l}
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", color: "#8695A0" }}>
                (sem rodapé)
              </div>
            )}

            {/* impeccable-disable design-system-font-size -- preview do ticket térmico 58mm: 9px imita o tamanho físico do papel, não é a rampa de UI */}
            <div
              style={{
                textAlign: "center",
                fontSize: 9,
                color: "#8695A0",
                marginTop: 12,
              }}
            >
              nuvempark.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Separador() {
  return (
    <div
      style={{
        color: "#8695A0",
        overflow: "hidden",
        whiteSpace: "nowrap",
        margin: "6px 0",
      }}
    >
      {"- ".repeat(24)}
    </div>
  );
}
