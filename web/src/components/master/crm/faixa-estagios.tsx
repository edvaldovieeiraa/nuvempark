"use client";

import { Clock } from "lucide-react";
import { ROTULO_ESTAGIO } from "@/lib/crm/rotulos";
import { ESTAGIOS, type Estagio } from "@/lib/crm/tipos";
import { COR_ESTAGIO, ESTAGIOS_COM_JANELA, FOCO } from "@/components/master/crm/cores-estagio";

/**
 * Faixa de contagem por estágio, comum ao kanban e à lista (Revisão 7).
 * Cada botão também filtra pelo estágio; clicar no selecionado limpa.
 * Ganho e Perdido contam só os últimos 30 dias, e isso fica escrito.
 */
export function FaixaEstagios({
  contagens,
  selecionado,
  onSelecionar,
}: {
  contagens: Record<Estagio, number>;
  selecionado: Estagio | null;
  onSelecionar: (e: Estagio | null) => void;
}) {
  return (
    <div role="group" aria-label="Leads por estágio" className="flex flex-wrap lg:flex-nowrap gap-2">
      {ESTAGIOS.map((e) => {
        const ativo = selecionado === e;
        const janela = ESTAGIOS_COM_JANELA.includes(e);
        return (
          <button
            key={e}
            type="button"
            aria-pressed={ativo}
            onClick={() => onSelecionar(ativo ? null : e)}
            className={`flex-[1_1_150px] lg:min-w-0 flex flex-col items-start gap-0.5 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${FOCO} ${
              ativo
                ? "bg-brand-50 border-brand-200"
                : "bg-superficie border-borda hover:border-brand-300"
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs font-bold text-texto-2">
              <span aria-hidden className={`w-2 h-2 rounded-full ${COR_ESTAGIO[e].ponto}`} />
              {ROTULO_ESTAGIO[e]}
            </span>
            <span className="text-[22px] font-extrabold leading-tight tabular-nums text-texto">
              {contagens[e]}
            </span>
            {janela && <span className="text-[11px] text-texto-2">nos últimos 30 dias</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Alternância "Pra hoje" (req. 17). Neutra quando desligada; a contagem fica
 * em vermelho enquanto houver pendência.
 */
export function AlternarPraHoje({
  ativo,
  total,
  onAlternar,
}: {
  ativo: boolean;
  total: number;
  onAlternar: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onAlternar}
      className={`toque-44 relative inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border text-sm font-bold transition-colors ${FOCO} ${
        ativo
          ? "bg-brand-50 border-brand-200 text-brand-700"
          : "bg-superficie border-borda-campo text-texto-2 hover:border-brand-300 hover:text-brand-700"
      }`}
    >
      <Clock className="w-4 h-4" aria-hidden />
      Pra hoje
      <span
        className={`min-w-[22px] h-[22px] px-1.5 rounded-full grid place-items-center text-xs font-extrabold tabular-nums ${
          total > 0 ? "bg-perigo-texto text-white" : "bg-fundo text-texto-2"
        }`}
      >
        <span className="sr-only">, </span>
        {total}
        <span className="sr-only"> {total === 1 ? "pendente" : "pendentes"}</span>
      </span>
    </button>
  );
}
