"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Gauge, X } from "lucide-react";
import type { Contrato } from "@/lib/contrato";
import {
  brl,
  campoDoInstante,
  FUSO_PAINEL,
  instanteDoCampo,
  simular,
} from "@/lib/contrato-painel";
import { COR, cssInput, cssLabel } from "./estilo-contrato";

/**
 * Simulador do contrato: entrada e saída no horário de Brasília (`FUSO_PAINEL`,
 * não o fuso do navegador), total, "pago até" e a memória de cálculo fatia
 * por fatia. Serve o contrato salvo ou os valores ainda não salvos do editor.
 */
export function ModalSimuladorContrato({
  nome,
  contrato,
  naoSalvo = false,
  fechar,
}: {
  nome: string;
  contrato: Contrato;
  naoSalvo?: boolean;
  fechar: () => void;
}) {
  const agora = useMemo(() => new Date(), []);
  const [entrada, setEntrada] = useState(() =>
    campoDoInstante(new Date(agora.getTime() - 2 * 3_600_000), FUSO_PAINEL),
  );
  const [saida, setSaida] = useState(() => campoDoInstante(agora, FUSO_PAINEL));

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [fechar]);

  const sim = useMemo(() => {
    const e = instanteDoCampo(entrada, FUSO_PAINEL);
    const s = instanteDoCampo(saida, FUSO_PAINEL);
    if (!e || !s) return { ok: false as const, mensagem: "Informe a data e a hora de entrada e de saída." };
    return simular({ entrada: e, saida: s, contrato, fuso: FUSO_PAINEL });
  }, [entrada, saida, contrato]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] grid place-items-center p-4"
      style={{ background: "rgba(16,27,20,.5)", backdropFilter: "blur(4px)" }}
      onClick={fechar}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sim-contrato-titulo"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[90dvh] overflow-y-auto"
        style={{
          background: "#fff",
          border: "1px solid #E4E8EC",
          borderRadius: 16,
          boxShadow: "0 12px 32px -8px rgba(16,27,20,.25)",
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2
              id="sim-contrato-titulo"
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#1F2937",
              }}
            >
              <Gauge aria-hidden style={{ width: 18, height: 18, color: "#16A34A" }} />
              Simular contrato
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6B7280" }}>
              {nome} · horário de Brasília{naoSalvo ? " · valores ainda não salvos" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              border: "1px solid #E4E8EC",
              background: "#fff",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "#6B7280",
              flex: "none",
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div className="grid grid-cols-1 min-[480px]:grid-cols-2" style={{ gap: 12 }}>
          <div>
            <label htmlFor="sim-contrato-entrada" style={cssLabel}>
              ENTRADA
            </label>
            <input
              id="sim-contrato-entrada"
              type="datetime-local"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              className="mono"
              style={cssInput}
            />
          </div>
          <div>
            <label htmlFor="sim-contrato-saida" style={cssLabel}>
              SAÍDA
            </label>
            <input
              id="sim-contrato-saida"
              type="datetime-local"
              value={saida}
              onChange={(e) => setSaida(e.target.value)}
              className="mono"
              style={cssInput}
            />
          </div>
        </div>

        <div aria-live="polite">
          {!sim.ok ? (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: COR.erro.texto,
                background: COR.erro.fundo,
                border: `1px solid ${COR.erro.borda}`,
                borderRadius: 11,
                padding: "10px 14px",
              }}
            >
              {sim.mensagem}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  background: "#F4F8F5",
                  border: "1px solid #E4E8EC",
                  borderRadius: 14,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    gap: 8,
                    fontSize: 12,
                    color: "#4B5563",
                  }}
                >
                  <span>
                    Permanência{" "}
                    <b className="mono" style={{ color: "#1F2937" }}>
                      {sim.memoria.permanencia}
                    </b>
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: COR.verde,
                      background: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      borderRadius: 999,
                      padding: "2px 10px",
                    }}
                  >
                    {sim.memoria.motivo}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 34, fontWeight: 600, color: "#1F2937" }}>
                  {brl(sim.resultado.totalCentavos)}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#4B5563" }}>
                  Pago até <b style={{ color: "#1F2937" }}>{sim.memoria.pagoAte}</b>
                  {sim.resultado.minutosRestantes > 0 && (
                    <>
                      {" "}
                      · ainda restam <b style={{ color: "#1F2937" }}>{sim.memoria.restam}</b> pagas
                      depois da saída.
                    </>
                  )}
                </p>
              </div>

              {sim.memoria.avisos.map((a) => (
                <p
                  key={a}
                  style={{
                    margin: 0,
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                    fontSize: 12,
                    color: COR.ambar.forte,
                    background: COR.ambar.fundo,
                    border: `1px solid ${COR.ambar.borda}`,
                    borderRadius: 12,
                    padding: "10px 12px",
                  }}
                >
                  <AlertTriangle
                    aria-hidden
                    style={{ width: 15, height: 15, flex: "none", marginTop: 1, color: COR.ambar.texto }}
                  />
                  {a}
                </p>
              ))}

              <section aria-labelledby="sim-contrato-memoria" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h3 id="sim-contrato-memoria" style={{ ...cssLabel, margin: 0 }}>
                  MEMÓRIA DE CÁLCULO
                </h3>
                <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {sim.memoria.linhas.map((l, i) => (
                    <li
                      key={i}
                      style={{
                        border: "1px solid #E4E8EC",
                        borderRadius: 12,
                        padding: "12px 14px",
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: "4px 12px",
                        alignItems: "baseline",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1F2937" }}>{l.titulo}</span>
                      <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: "#1F2937" }}>
                        {brl(l.valorCentavos)}
                      </span>
                      <span style={{ fontSize: 12, color: "#4B5563", gridColumn: "1 / -1" }}>{l.detalhe}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </div>

        <p style={{ margin: 0, fontSize: 11, color: "#6B7280" }}>
          Cada regra conta a sua tabela do zero. Só simulação: este contrato ainda não cobra no app.
        </p>
      </motion.div>
    </motion.div>
  );
}
