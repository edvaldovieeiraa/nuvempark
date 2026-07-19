"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Gauge, Moon, ShieldCheck, X } from "lucide-react";
import { calcularTarifa, type TarifaSim } from "@/lib/tarifa-engine";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// ── Tokens do painel (fiéis ao protótipo Claude Design) ──
const cssLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#6B7280",
  marginBottom: 6,
};
const cssInput: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 11,
  border: "1px solid #E4E8EC",
  background: "#FAFBFC",
  fontSize: 13,
  color: "#1F2937",
  padding: "0 13px",
  outline: "none",
};

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function formatarPermanencia(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h${String(min % 60).padStart(2, "0")}`;
  return `${Math.floor(h / 24)}d ${h % 24}h${String(min % 60).padStart(2, "0")}`;
}

/**
 * Simulador de cobrança — usa o porte fiel do TarifaEngine do app
 * (lib/tarifa-engine.ts). Aceita qualquer TarifaSim: tarifa salva ou os
 * valores ainda não salvos de um formulário.
 */
export function ModalSimulador({
  nome,
  tarifa,
  fechar,
}: {
  nome: string;
  tarifa: TarifaSim;
  fechar: () => void;
}) {
  const agora = useMemo(() => new Date(), []);
  const [entrada, setEntrada] = useState(
    toLocalInput(new Date(agora.getTime() - 2 * 3_600_000)),
  );
  const [saida, setSaida] = useState(toLocalInput(agora));

  const resultado = useMemo(() => {
    const e = new Date(entrada);
    const s = new Date(saida);
    if (isNaN(e.getTime()) || isNaN(s.getTime()) || s <= e) return null;
    return calcularTarifa(e, s, tarifa);
  }, [entrada, saida, tarifa]);

  const MOTIVO = {
    tolerancia: {
      rotulo: "Dentro da tolerância",
      fg: "#0369A1",
      bg: "#EFF6FF",
      bd: "#BFDBFE",
      Icone: ShieldCheck,
    },
    pernoite: {
      rotulo: "Pernoite",
      fg: "#7C3AED",
      bg: "#F5F3FF",
      bd: "#DDD6FE",
      Icone: Moon,
    },
    normal: {
      rotulo: "Cobrança por tempo",
      fg: "#15803D",
      bg: "#F0FDF4",
      bd: "#BBF7D0",
      Icone: Clock,
    },
    tetoDiaria: {
      rotulo: "Teto de diária atingido",
      fg: "#B45309",
      bg: "#FEF7E6",
      bd: "#FCE3A6",
      Icone: ShieldCheck,
    },
  } as const;

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
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85dvh] overflow-y-auto"
        style={{
          background: "#fff",
          border: "1px solid #E4E8EC",
          borderRadius: 16,
          boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
          padding: 22,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-.02em",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#1F2937",
            }}
          >
            <Gauge style={{ width: 18, height: 18, color: "#16A34A" }} />
            Simular cobrança
          </h3>
          <button
            onClick={fechar}
            aria-label="Fechar"
            style={{
              display: "grid",
              placeItems: "center",
              width: 34,
              height: 34,
              borderRadius: 9,
              border: "none",
              background: "transparent",
              color: "#8695A0",
              cursor: "pointer",
            }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <p style={{ margin: "3px 0 18px", fontSize: 12, color: "#6B7280" }}>
          Tarifa <b style={{ color: "#1F2937" }}>{nome}</b> · mesmas regras que o
          app usa na saída.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <label style={cssLabel}>Entrada</label>
            <input
              type="datetime-local"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              className="mono"
              style={cssInput}
            />
          </div>
          <div>
            <label style={cssLabel}>Saída</label>
            <input
              type="datetime-local"
              value={saida}
              onChange={(e) => setSaida(e.target.value)}
              className="mono"
              style={cssInput}
            />
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          {resultado == null ? (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: "#B91C1C",
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: 11,
                padding: "10px 14px",
              }}
            >
              A saída precisa ser depois da entrada.
            </p>
          ) : (
            <div
              style={{
                borderRadius: 12,
                border: "1px solid #E4E8EC",
                background: "#FAFBFC",
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 999,
                    color: MOTIVO[resultado.motivo].fg,
                    background: MOTIVO[resultado.motivo].bg,
                    border: `1px solid ${MOTIVO[resultado.motivo].bd}`,
                  }}
                >
                  {(() => {
                    const I = MOTIVO[resultado.motivo].Icone;
                    return <I style={{ width: 13, height: 13 }} />;
                  })()}
                  {MOTIVO[resultado.motivo].rotulo}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 12, fontWeight: 600, color: "#6B7280" }}
                >
                  Permanência: {formatarPermanencia(resultado.duracaoMinutos)}
                </span>
              </div>

              <div
                className="mono"
                style={{
                  marginTop: 12,
                  fontSize: 34,
                  fontWeight: 700,
                  color: "#1F2937",
                }}
              >
                {moeda.format(resultado.valor)}
              </div>

              <p
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: "#8695A0",
                  lineHeight: 1.6,
                }}
              >
                {resultado.motivo === "tolerancia" &&
                  `Permanência de até ${tarifa.tolerancia_minutos}min não é cobrada.`}
                {resultado.motivo === "pernoite" &&
                  `O veículo atravessou a janela de pernoite (${tarifa.pernoite_hora_inicio}h às ${tarifa.pernoite_hora_fim}h do dia seguinte) — cobra o valor fixo no lugar do tempo.`}
                {resultado.motivo === "normal" &&
                  (resultado.fracoesAdicionais === 0
                    ? `Fração inicial (${tarifa.fracao_inicial_minutos}min) = ${moeda.format(tarifa.fracao_inicial_valor)}.`
                    : `Fração inicial (${tarifa.fracao_inicial_minutos}min) = ${moeda.format(tarifa.fracao_inicial_valor)} + ${resultado.fracoesAdicionais} ${resultado.fracoesAdicionais === 1 ? "fração adicional" : "frações adicionais"} de ${tarifa.fracao_adicional_minutos}min × ${moeda.format(tarifa.fracao_adicional_valor)}.`)}
                {resultado.motivo === "tetoDiaria" &&
                  `Por tempo daria ${moeda.format(resultado.valorSemTeto)}, mas o teto de diária limita a cobrança a ${moeda.format(tarifa.teto_diaria)}.`}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
