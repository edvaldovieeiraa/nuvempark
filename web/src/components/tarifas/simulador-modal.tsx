"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Clock, Moon, ShieldCheck, X } from "lucide-react";
import { calcularTarifa, type TarifaSim } from "@/lib/tarifa-engine";
import { Campo, Input } from "@/components/ui/campos";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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
      cls: "bg-info-bg text-info border-info/20",
      Icone: ShieldCheck,
    },
    pernoite: {
      rotulo: "Pernoite",
      cls: "bg-violeta/10 text-violeta border-violeta/20",
      Icone: Moon,
    },
    normal: {
      rotulo: "Cobrança por tempo",
      cls: "bg-brand-50 text-brand-700 border-brand-200",
      Icone: Clock,
    },
    tetoDiaria: {
      rotulo: "Teto de diária atingido",
      cls: "bg-aviso-bg text-aviso border-aviso/25",
      Icone: ShieldCheck,
    },
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] grid place-items-center p-4 bg-noite/50 backdrop-blur-sm"
      onClick={fechar}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-superficie shadow-[var(--shadow-pop)] p-6 max-h-[85dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-extrabold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-brand-600" />
            Simular cobrança
          </h3>
          <button
            onClick={fechar}
            aria-label="Fechar"
            className="toque-44 text-texto-3 hover:text-texto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-texto-2 mb-5">
          Tarifa <b>{nome}</b> · mesmas regras que o app usa na saída.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Entrada">
            <Input
              type="datetime-local"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
            />
          </Campo>
          <Campo label="Saída">
            <Input
              type="datetime-local"
              value={saida}
              onChange={(e) => setSaida(e.target.value)}
            />
          </Campo>
        </div>

        <div className="mt-5">
          {resultado == null ? (
            <p className="text-sm font-semibold text-perigo bg-perigo-bg border border-perigo/20 rounded-xl px-3.5 py-2.5">
              A saída precisa ser depois da entrada.
            </p>
          ) : (
            <div className="rounded-2xl border border-borda bg-fundo/60 p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${MOTIVO[resultado.motivo].cls}`}
                >
                  {(() => {
                    const I = MOTIVO[resultado.motivo].Icone;
                    return <I className="w-3.5 h-3.5" />;
                  })()}
                  {MOTIVO[resultado.motivo].rotulo}
                </span>
                <span className="text-xs font-semibold text-texto-2 tabular-nums">
                  Permanência: {formatarPermanencia(resultado.duracaoMinutos)}
                </span>
              </div>

              <div className="mt-3 text-4xl font-black tabular-nums text-texto">
                {moeda.format(resultado.valor)}
              </div>

              <p className="mt-3 text-xs text-texto-2 leading-relaxed">
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
