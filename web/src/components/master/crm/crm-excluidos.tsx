"use client";

import { useEffect, useRef } from "react";
import { Archive, ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { ROTULO_ESTAGIO, rotuloFonte } from "@/lib/crm/rotulos";
import type { LeadCrm } from "@/lib/crm/tipos";
import { formatarDataHora } from "@/lib/format-data";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { COR_ESTAGIO, FOCO } from "@/components/master/crm/cores-estagio";
import { BTN_PEQUENO } from "@/components/master/crm/estilos";
import { SeloTemperatura } from "@/components/master/crm/selo-temperatura";

/**
 * Visão "Excluídos" (design, tela 5 e revisão 1, itens 12 e 21). Outro conjunto
 * de dados, carregado pelo servidor (`?visao=excluidos`): sem faixa, busca,
 * filtros nem "Pra hoje". Restaurar devolve o card ao estágio em que estava.
 *
 * Depois de restaurar, a linha some; o foco vai para o Restaurar da linha
 * seguinte (ou da anterior) e, sem mais linhas, para o título.
 */
export function CrmExcluidos({
  leads,
  restaurandoId,
  onAbrir,
  onRestaurar,
  onVoltar,
}: {
  leads: LeadCrm[];
  restaurandoId: string | null;
  onAbrir: (id: string, gatilho: HTMLElement) => void;
  onRestaurar: (lead: LeadCrm) => void;
  onVoltar: () => void;
}) {
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const focarRef = useRef<string | "titulo" | null>(null);

  useEffect(() => {
    const alvo = focarRef.current;
    if (!alvo) return;
    const ativo = document.activeElement;
    if (ativo && ativo !== document.body && document.body.contains(ativo)) return;
    focarRef.current = null;
    if (alvo === "titulo") tituloRef.current?.focus({ preventScroll: true });
    else document.querySelector<HTMLButtonElement>(`[data-restaurar="${CSS.escape(alvo)}"]`)?.focus();
  });

  function restaurar(lead: LeadCrm) {
    const i = leads.findIndex((l) => l.id === lead.id);
    const vizinho = leads[i + 1] ?? leads[i - 1];
    focarRef.current = vizinho ? vizinho.id : "titulo";
    onRestaurar(lead);
  }

  return (
    <section aria-labelledby="titulo-excluidos" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onVoltar} className={BTN_PEQUENO}>
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
          Voltar ao CRM
        </button>
        <h2
          id="titulo-excluidos"
          ref={tituloRef}
          tabIndex={-1}
          className="inline-flex items-center gap-2 text-lg font-extrabold outline-none"
        >
          <Archive className="w-5 h-5 text-texto-2" aria-hidden />
          Excluídos
        </h2>
        <p className="text-sm text-texto-2">
          Saem do quadro, das contagens e da busca. O histórico fica, e Restaurar devolve o card ao estágio em que
          estava.
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] px-5 py-14 text-center">
          <p className="text-sm text-texto-2">Nenhum lead excluído.</p>
        </div>
      ) : (
        <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
          <ResponsiveTable className="max-h-[min(70vh,720px)] overflow-y-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="sticky top-0 z-10 bg-fundo">
                <tr className="text-left text-[11px] font-extrabold tracking-wide text-texto-2 uppercase">
                  <th scope="col" className="px-4 py-3">Lead</th>
                  <th scope="col" className="px-4 py-3">Estava em</th>
                  <th scope="col" className="px-4 py-3">Fonte</th>
                  <th scope="col" className="px-4 py-3">Excluído em</th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const cor = COR_ESTAGIO[lead.status];
                  const pendente = restaurandoId === lead.id;
                  return (
                    <tr key={lead.id} className="border-t border-borda align-top">
                      <td className="px-4 py-3 max-w-[280px]">
                        <button
                          type="button"
                          onClick={(e) => onAbrir(lead.id, e.currentTarget)}
                          className={`text-left font-bold text-texto hover:text-brand-700 break-words rounded ${FOCO}`}
                        >
                          {lead.nome}
                        </button>
                        {(lead.semResponsavel ? "sem responsável informado" : lead.empresa) && (
                          <div className="text-xs text-texto-2 break-words">
                            {lead.semResponsavel ? "sem responsável informado" : lead.empresa}
                          </div>
                        )}
                        {lead.temperatura && (
                          <div className="mt-1">
                            <SeloTemperatura temperatura={lead.temperatura} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 h-[22px] px-2 rounded-full text-[11px] font-bold whitespace-nowrap ${cor.fundo} ${cor.texto}`}
                        >
                          <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${cor.ponto}`} />
                          {ROTULO_ESTAGIO[lead.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-texto-2 whitespace-nowrap">{rotuloFonte(lead)}</td>
                      <td className="px-4 py-3 text-texto-2 whitespace-nowrap tabular-nums">
                        {lead.excluidoEm ? formatarDataHora(lead.excluidoEm) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          data-restaurar={lead.id}
                          aria-label={`Restaurar ${lead.nome}`}
                          aria-disabled={pendente || undefined}
                          onClick={() => !pendente && restaurar(lead)}
                          className={BTN_PEQUENO}
                        >
                          {pendente ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                          )}
                          Restaurar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ResponsiveTable>
        </div>
      )}
    </section>
  );
}
