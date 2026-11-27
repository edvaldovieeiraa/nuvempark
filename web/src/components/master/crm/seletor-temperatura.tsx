"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { OPCOES_TEMPERATURA } from "@/lib/crm/temperatura";
import type { Temperatura } from "@/lib/crm/tipos";
import { FOCO } from "@/components/master/crm/cores-estagio";
import { VISUAL_TEMPERATURA } from "@/components/master/crm/selo-temperatura";

/**
 * Seletor de temperatura do painel (design, revisão 1, itens 1, 2 e 9).
 *
 * Botões com `aria-pressed`, e não rádios: num grupo de rádios cada seta já
 * muda a seleção, e cada mudança aqui grava e entra na linha do tempo. Só
 * clique, Enter e Espaço gravam. Com uma gravação pendente, os botões ficam
 * `aria-disabled` (ignoram o clique sem perder o foco) e o grupo `aria-busy`.
 *
 * Marcado: fundo branco, borda de 2 px na cor da temperatura, `Check` e
 * negrito (o Quente fica cheio). Não marcado: neutro.
 */
export function SeletorTemperatura({
  valor,
  pendente,
  onEscolher,
}: {
  valor: Temperatura | null;
  pendente: boolean;
  onEscolher: (t: Temperatura | null) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <p id={`${id}-rotulo`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-texto-2">
        Temperatura
      </p>
      <p id={`${id}-dica`} className="sr-only">
        Grava na hora e entra na linha do tempo.
      </p>
      <div
        role="group"
        aria-labelledby={`${id}-rotulo`}
        aria-describedby={`${id}-dica`}
        aria-busy={pendente || undefined}
        className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-fundo"
      >
        {OPCOES_TEMPERATURA.map((o) => {
          const marcado = o.valor === valor;
          const vis = o.valor ? VISUAL_TEMPERATURA[o.valor] : null;
          const Icone = marcado ? Check : vis?.Icone;
          const estilo = !marcado
            ? "border-transparent text-texto-2 hover:bg-superficie"
            : o.valor === "quente"
              ? "bg-temp-quente-fundo border-temp-quente-fundo text-temp-quente-texto font-extrabold"
              : `bg-superficie font-extrabold ${vis ? `${vis.borda} ${vis.texto}` : "border-texto-2 text-texto-2"}`;
          return (
            <button
              key={o.rotulo}
              type="button"
              aria-pressed={marcado}
              aria-disabled={pendente || undefined}
              onClick={() => {
                if (pendente || marcado) return;
                onEscolher(o.valor);
              }}
              className={`inline-flex items-center justify-center gap-1 h-9 [@media(pointer:coarse)]:h-11 rounded-lg border-2 text-xs font-semibold transition-colors ${estilo} ${
                pendente ? "opacity-60 cursor-progress" : ""
              } ${FOCO}`}
            >
              {Icone && <Icone className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} aria-hidden />}
              {o.rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}
