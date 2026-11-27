"use client";

import { CalendarClock, Clock, Loader2, MoreVertical } from "lucide-react";
import { alertaTrial, temAlertaVencido, varianteProximaAcao } from "@/lib/crm/prazos";
import {
  rodapeCard,
  seloCard,
  subtituloCard,
  textoProximaAcao,
  textoTrial,
  type TomSelo,
} from "@/lib/crm/textos-card";
import type { LeadCrm } from "@/lib/crm/tipos";
import { FOCO } from "@/components/master/crm/cores-estagio";
import { SeloTemperatura } from "@/components/master/crm/selo-temperatura";

const TOM_SELO: Record<TomSelo, string> = {
  aviso: "bg-aviso-bg text-aviso-texto border-aviso-borda",
  perigo: "bg-perigo-bg text-perigo-texto border-perigo-borda",
  neutro: "bg-fundo text-texto-2 border-borda",
};

const TOM_TRIAL = {
  ok: "bg-fundo text-texto-2",
  expirando: "bg-aviso-bg text-aviso-texto",
  expirado: "bg-perigo-bg text-perigo-texto",
} as const;

const TOM_ACAO = {
  vencida: "text-perigo-texto",
  hoje: "text-aviso-texto",
  futura: "text-texto-2",
  sem: "text-texto-2",
} as const;


/**
 * Card do kanban (design doc, tela 1). O nome é o botão que abre o painel, e
 * a área dele cobre o card inteiro (`::after`); o ⋮ fica por cima dela.
 * Nenhuma regra mora aqui: cor, borda e textos vêm de `lib/crm`.
 */
export function CrmCard({
  lead,
  agora,
  movendo = false,
  onAbrir,
  onAbrirMenu,
}: {
  lead: LeadCrm;
  /** ISO vindo da página do servidor; o card nunca lê o relógio. */
  agora: string;
  movendo?: boolean;
  onAbrir: (id: string, gatilho: HTMLElement) => void;
  onAbrirMenu: (lead: LeadCrm, botao: HTMLElement) => void;
}) {
  const agoraD = new Date(agora);
  const subtitulo = subtituloCard(lead);
  const selo = seloCard(lead);
  const trial = alertaTrial(lead, agoraD);
  const quandoAcao = textoProximaAcao(lead.proximaAcaoEm, agoraD);
  const varAcao = varianteProximaAcao(lead.proximaAcaoEm, agoraD);
  const vencido = temAlertaVencido(lead, agoraD);
  return (
    <article
      data-lead-id={lead.id}
      aria-busy={movendo || undefined}
      className={`relative flex flex-col gap-2 rounded-xl border bg-superficie pl-3 pr-2.5 pt-3 pb-2.5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)] ${
        vencido ? "border-borda-vencido" : "border-borda"
      }`}
    >
      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0">
          <h3 className="m-0">
            {/* Sem `position` no botão, para o ::after esticar até o card; o
                line-clamp fica no span de dentro (overflow:hidden). */}
            <button
              type="button"
              onClick={(e) => onAbrir(lead.id, e.currentTarget)}
              className="block w-full text-left text-sm font-bold leading-snug text-texto break-words outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand-700"
            >
              <span className="line-clamp-2">{lead.nome}</span>
            </button>
          </h3>
          {subtitulo && <p className="mt-px text-xs text-texto-2 break-words">{subtitulo}</p>}
        </div>

        <button
          type="button"
          aria-haspopup="menu"
          aria-label={`Mudar estágio de ${lead.nome}`}
          disabled={movendo}
          onClick={(e) => onAbrirMenu(lead, e.currentTarget)}
          className={`toque-44 relative z-10 shrink-0 w-8 h-8 grid place-items-center rounded-lg text-texto-2 hover:bg-fundo hover:text-texto transition-colors disabled:opacity-50 ${FOCO}`}
        >
          <MoreVertical className="w-4 h-4" aria-hidden />
        </button>
      </div>

      {(selo || lead.temperatura) && (
        <div className="flex flex-wrap gap-1.5">
          <SeloTemperatura temperatura={lead.temperatura} />
          {selo && (
            <span
              className={`inline-flex items-center h-[22px] px-2 rounded-full border text-[11px] font-bold whitespace-nowrap ${TOM_SELO[selo.tom]}`}
            >
              {selo.texto}
            </span>
          )}
        </div>
      )}

      {trial && lead.trialExpiraEm && (
        <p
          className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold ${TOM_TRIAL[trial.tipo]}`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {textoTrial(trial, lead.trialExpiraEm)}
        </p>
      )}

      {quandoAcao && (
        <p className={`flex items-start gap-1.5 text-xs ${TOM_ACAO[varAcao]}`}>
          <CalendarClock className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
          <span className="line-clamp-2 break-words">
            <b>{quandoAcao}</b>
            {lead.proximaAcao ? ` · ${lead.proximaAcao}` : null}
          </span>
        </p>
      )}

      <p className="border-t border-borda pt-1.5 text-[11px] text-texto-2">{rodapeCard(lead)}</p>

      {movendo && (
        <div
          aria-hidden
          className="absolute inset-0 z-20 grid place-items-center rounded-xl bg-superficie/70"
        >
          <Loader2 className="w-5 h-5 animate-spin text-brand-700" />
        </div>
      )}
    </article>
  );
}
