"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ParkingSquare } from "lucide-react";

import { FotoVeiculoModal } from "@/components/foto-veiculo/foto-veiculo-modal";
import { FotoVeiculoThumb } from "@/components/foto-veiculo/foto-veiculo-thumb";

type Veiculo = {
  id: string;
  placa: string;
  tipo_veiculo: string;
  entrada: string;
  origem: string;
  foto_entrada_path: string | null;
  /** Quem registrou a entrada. */
  operador_id: string | null;
};

const horaFmt = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Pílula de origem: app (verde), mensalista (violeta), manual (cinza). */
function origemPill(origem: string): { rotulo: string; style: React.CSSProperties } {
  if (origem === "plano") {
    return {
      rotulo: "mensalista",
      style: { color: "#8B5CF6", background: "#F3EEFE", border: "1px solid #DDD0FB" },
    };
  }
  if (origem === "app") {
    return {
      rotulo: "app",
      style: { color: "#16A34A", background: "#DCFCE7", border: "1px solid #BBF7D0" },
    };
  }
  return {
    rotulo: "manual",
    style: { color: "#6B7280", background: "#F1F4F6", border: "1px solid #E4E8EC" },
  };
}

/**
 * Lista dos veículos no pátio. Clicar na linha (ou na miniatura) abre a foto de
 * entrada no mesmo modal que Movimentos usa. Veículo sem foto abre igual, no
 * estado "Sem foto de entrada" — o comportamento é o mesmo nas duas telas.
 */
export function PatioLista({
  veiculos,
  fotos,
  operadores,
}: {
  veiculos: Veiculo[];
  /** ticket.id → URL assinada da foto de entrada (assinadas em lote). */
  fotos: Record<string, string>;
  /** operador_id → nome (join manual: a tabela não tem FK). */
  operadores: Record<string, string>;
}) {
  const [detalhe, setDetalhe] = useState<Veiculo | null>(null);

  if (veiculos.length === 0) {
    return (
      <section
        style={{
          background: "#fff",
          border: "1px solid #E4E8EC",
          borderRadius: 16,
          boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
          overflow: "hidden",
        }}
      >
        <div className="px-5 py-14 flex flex-col items-center gap-3 text-center">
          <span
            className="grid place-items-center"
            style={{ width: 48, height: 48, borderRadius: 14, background: "#DCFCE7" }}
          >
            <ParkingSquare className="w-6 h-6" style={{ color: "#16A34A" }} />
          </span>
          <p style={{ fontSize: 13, color: "#8695A0" }}>
            Nenhum veículo no pátio agora.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        style={{
          background: "#fff",
          border: "1px solid #E4E8EC",
          borderRadius: 16,
          boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
          overflow: "hidden",
        }}
      >
        {veiculos.map((t, i) => {
          const pill = origemPill(t.origem);
          const operador = operadores[t.operador_id ?? ""];
          const ultimo = i === veiculos.length - 1;
          return (
            <div
              key={t.id}
              onClick={() => setDetalhe(t)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 16px",
                borderBottom: ultimo ? "none" : "1px solid #EEF1F3",
                background: i % 2 === 1 ? "#FAFBFC" : "#fff",
                cursor: "pointer",
              }}
            >
              <FotoVeiculoThumb
                url={fotos[t.id]}
                placa={t.placa}
                aoClicar={() => setDetalhe(t)}
              />
              <span
                className="mono"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: ".1em",
                  background: "#F1F4F6",
                  border: "1px solid #E4E8EC",
                  borderRadius: 6,
                  padding: "3px 9px",
                  flexShrink: 0,
                }}
              >
                {t.placa}
              </span>
              <span
                style={{ fontSize: 12, color: "#6B7280", textTransform: "capitalize" }}
              >
                {t.tipo_veiculo}
              </span>
              <span
                className="mono hidden sm:inline"
                style={{ fontSize: 12, color: "#8695A0", whiteSpace: "nowrap" }}
              >
                {horaFmt.format(new Date(t.entrada))} · há {permanencia(t.entrada)}
              </span>
              <div
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  minWidth: 0,
                }}
              >
                {operador && (
                  <span
                    className="hidden md:inline truncate"
                    style={{ fontSize: 12, color: "#6B7280", maxWidth: 160 }}
                  >
                    {operador}
                  </span>
                )}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: "3px 9px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    ...pill.style,
                  }}
                >
                  {pill.rotulo}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <AnimatePresence>
        {detalhe && (
          <FotoVeiculoModal
            key={detalhe.id}
            ticket={detalhe}
            fechar={() => setDetalhe(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function permanencia(entrada: string) {
  const min = Math.max(
    0,
    Math.round((Date.now() - new Date(entrada).getTime()) / 60000),
  );
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h${String(min % 60).padStart(2, "0")}`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
