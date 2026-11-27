"use client";

import { CheckCircle2, Inbox, SearchX } from "lucide-react";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { COR_ESTAGIO, FOCO } from "@/components/master/crm/cores-estagio";
import { SeloTemperatura } from "@/components/master/crm/selo-temperatura";
import { ordenarLista, ordenarPraHoje } from "@/lib/crm/ordenacao";
import { varianteProximaAcao } from "@/lib/crm/prazos";
import { ROTULO_ESTAGIO, rotuloFonte } from "@/lib/crm/rotulos";
import { textoProximaAcao } from "@/lib/crm/textos-card";
import { REGRA_ORDEM, textosPorQueHoje, type TomMotivo } from "@/lib/crm/textos-lista";
import type { LeadCrm } from "@/lib/crm/tipos";
import { formatarData } from "@/lib/format-data";

const TOM_ACAO = {
  vencida: "text-perigo-texto",
  hoje: "text-aviso-texto",
  futura: "text-texto-2",
  sem: "text-texto-2",
} as const;

const TOM_MOTIVO: Record<TomMotivo, string> = {
  aviso: "bg-aviso-bg text-aviso-texto border-aviso-borda",
  perigo: "bg-perigo-bg text-perigo-texto border-perigo-borda",
};

const CAIXA =
  "bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] px-5 py-14 flex flex-col items-center gap-3 text-center";

const BOTAO_SECUNDARIO = `toque-44 relative inline-flex items-center h-10 px-4 rounded-xl border border-borda-campo bg-superficie text-sm font-bold text-texto-2 hover:border-brand-300 hover:text-brand-700 transition-colors ${FOCO}`;

/** CRM sem nenhum lead (design doc, "Estados"). Também serve ao kanban. */
export function CrmVazio() {
  return (
    <div className={CAIXA}>
      <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
        <Inbox className="w-6 h-6 text-brand-600" aria-hidden />
      </span>
      <p className="text-sm text-texto-2 max-w-sm">
        Nenhum lead ainda. Contatos do site, contas trial e clientes aparecem aqui sozinhos.
      </p>
    </div>
  );
}

/**
 * Visão de lista do CRM (design doc, tela 2). Com "Pra hoje", ganha a coluna
 * "Por que hoje" com todos os motivos e a ordem de `ordenarPraHoje`.
 * Os leads chegam já filtrados; `total` é a contagem antes dos filtros, para
 * separar "CRM vazio" de "filtro sem resultado".
 */
export function CrmLista({
  leads,
  agora,
  praHoje,
  busca,
  total,
  onAbrir,
  onLimparBusca,
  onDesligarPraHoje,
}: {
  leads: LeadCrm[];
  /** ISO vindo da página do servidor; a lista nunca lê o relógio. */
  agora: string;
  praHoje: boolean;
  busca: string;
  total: number;
  onAbrir: (id: string, gatilho: HTMLElement) => void;
  onLimparBusca: () => void;
  onDesligarPraHoje: () => void;
}) {
  if (total === 0) return <CrmVazio />;

  const termo = busca.trim();
  if (leads.length === 0) {
    if (termo)
      return (
        <div className={CAIXA}>
          <SearchX className="w-6 h-6 text-texto-2" aria-hidden />
          <p className="text-sm text-texto-2 max-w-sm break-words">Nada com “{termo}”.</p>
          <button type="button" onClick={onLimparBusca} className={BOTAO_SECUNDARIO}>
            Limpar busca
          </button>
        </div>
      );
    if (praHoje)
      return (
        <div className={CAIXA}>
          <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
            <CheckCircle2 className="w-6 h-6 text-brand-600" aria-hidden />
          </span>
          <p className="text-sm font-bold text-texto">Nada pendente para hoje.</p>
          <button type="button" onClick={onDesligarPraHoje} className={BOTAO_SECUNDARIO}>
            Desligar “Pra hoje”
          </button>
        </div>
      );
    return (
      <div className={CAIXA}>
        <p className="text-sm text-texto-2 max-w-sm">Nenhum lead com esses filtros.</p>
      </div>
    );
  }

  const agoraD = new Date(agora);
  const ordenados = praHoje ? ordenarPraHoje(leads, agoraD) : ordenarLista(leads);

  return (
    <section aria-label="Leads em lista" className="space-y-2">
      <p className="text-xs text-texto-2">
        <b>Ordem:</b> {praHoje ? REGRA_ORDEM.praHoje : REGRA_ORDEM.lista}
      </p>
      <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        <ResponsiveTable className="max-h-[min(70vh,720px)] overflow-y-auto">
          <table className={`w-full text-sm ${praHoje ? "min-w-[1040px]" : "min-w-[860px]"}`}>
            <thead className="sticky top-0 z-10 bg-fundo">
              <tr className="text-left text-[11px] font-extrabold tracking-wide text-texto-2 uppercase">
                <th scope="col" className="px-4 py-3">Lead</th>
                <th scope="col" className="px-4 py-3">Estágio</th>
                {praHoje && <th scope="col" className="px-4 py-3">Por que hoje</th>}
                <th scope="col" className="px-4 py-3">Praça</th>
                <th scope="col" className="px-4 py-3">Fonte</th>
                <th scope="col" className="px-4 py-3">Próxima ação</th>
                <th scope="col" className="px-4 py-3">Chegada</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((lead) => (
                <LinhaLead
                  key={lead.id}
                  lead={lead}
                  agora={agoraD}
                  praHoje={praHoje}
                  onAbrir={onAbrir}
                />
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      </div>
    </section>
  );
}

function LinhaLead({
  lead,
  agora,
  praHoje,
  onAbrir,
}: {
  lead: LeadCrm;
  agora: Date;
  praHoje: boolean;
  onAbrir: (id: string, gatilho: HTMLElement) => void;
}) {
  const cor = COR_ESTAGIO[lead.status];
  const quandoAcao = textoProximaAcao(lead.proximaAcaoEm, agora);
  const varAcao = varianteProximaAcao(lead.proximaAcaoEm, agora);
  const empresa = lead.semResponsavel ? "sem responsável informado" : lead.empresa?.trim() || null;

  return (
    <tr
      // A linha inteira abre o lead; o clique no botão do nome chega aqui
      // pelo bubbling, e o gatilho é sempre o botão (o foco volta para ele).
      onClick={(e) => {
        const botao = e.currentTarget.querySelector<HTMLButtonElement>("button[data-abrir]");
        if (botao) onAbrir(lead.id, botao);
      }}
      className="border-t border-borda cursor-pointer transition-colors hover:bg-fundo/60 align-top"
    >
      <td className="px-4 py-3 max-w-[260px]">
        <button
          type="button"
          data-abrir
          className={`text-left font-bold text-texto hover:text-brand-700 break-words rounded ${FOCO}`}
        >
          {lead.nome}
        </button>
        {empresa && <div className="text-xs text-texto-2 break-words">{empresa}</div>}
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
      {praHoje && (
        <td className="px-4 py-3">
          <ul className="flex flex-wrap gap-1">
            {textosPorQueHoje(lead, agora).map((m) => (
              <li
                key={m.texto}
                className={`inline-flex items-center h-[22px] px-2 rounded-full border text-[11px] font-bold whitespace-nowrap ${TOM_MOTIVO[m.tom]}`}
              >
                {m.texto}
              </li>
            ))}
          </ul>
        </td>
      )}
      <td className="px-4 py-3 text-texto-2 whitespace-nowrap">{lead.praca ?? "—"}</td>
      <td className="px-4 py-3 text-texto-2 whitespace-nowrap">{rotuloFonte(lead)}</td>
      <td className={`px-4 py-3 max-w-[240px] ${TOM_ACAO[varAcao]}`}>
        {quandoAcao ? (
          <span className="line-clamp-2 break-words">
            <b>{quandoAcao}</b>
            {lead.proximaAcao ? ` · ${lead.proximaAcao}` : null}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-3 text-texto-2 whitespace-nowrap tabular-nums">
        {formatarData(new Date(lead.criadoEm))}
      </td>
    </tr>
  );
}
