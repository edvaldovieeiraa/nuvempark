import { diaEmSaoPaulo, motivosPraHoje, type MotivoHoje } from "@/lib/crm/prazos";
import type { Estagio, EstadoAssinatura } from "@/lib/crm/tipos";
import { formatarData, formatarHora } from "@/lib/format-data";

/**
 * Textos da lista e do kanban do CRM (design doc, telas 1, 2 e 6). Puro:
 * recebe `agora` e nunca lê o relógio.
 *
 * Toda data passa por `new Date(...)` antes de `formatarData`: com a string
 * ISO, `formatarData` lê os 10 primeiros caracteres, que são o dia em UTC.
 */

function nDias(n: number): string {
  return n === 1 ? "1 dia" : `${n} dias`;
}

/** Uma razão do "Por que hoje", em minúsculas ("trial expira em 2 dias"). */
export function textoMotivo(m: MotivoHoje, agora: Date): string {
  switch (m.tipo) {
    case "acao_hoje":
      return `ação hoje ${formatarHora(new Date(m.em))}`;
    case "acao_vencida": {
      const d = new Date(m.em);
      return diaEmSaoPaulo(d) === diaEmSaoPaulo(agora)
        ? `ação venceu hoje ${formatarHora(d)}`
        : `ação venceu em ${formatarData(d)}`;
    }
    case "trial_expirando":
      return m.dias === 0 ? "trial expira hoje" : `trial expira em ${nDias(m.dias)}`;
    case "trial_expirado":
      return m.dias === 0 ? "trial expirou hoje" : `trial expirou há ${nDias(m.dias)}`;
  }
}

export type TomMotivo = "aviso" | "perigo";

type LeadPraHoje = {
  status: Estagio;
  assinaturaEstado: EstadoAssinatura | null;
  trialExpiraEm: string | null;
  proximaAcaoEm: string | null;
};

/** Todos os motivos do lead, com o tom: vencido/expirado em vermelho, o resto em âmbar. */
export function textosPorQueHoje(
  lead: LeadPraHoje,
  agora: Date,
): { texto: string; tom: TomMotivo }[] {
  return motivosPraHoje(lead, agora).map((m) => ({
    texto: textoMotivo(m, agora),
    tom: m.tipo === "acao_vencida" || m.tipo === "trial_expirado" ? "perigo" : "aviso",
  }));
}

const COLUNA_VAZIA: Record<Estagio, string> = {
  novo: "Nenhum lead em Novo",
  em_contato: "Nenhum lead em contato",
  trial: "Nenhum trial ativo",
  ganho: "Nenhum ganho nos últimos 30 dias",
  perdido: "Nenhum perdido nos últimos 30 dias",
};

export function textoColunaVazia(e: Estagio): string {
  return COLUNA_VAZIA[e];
}

/** A regra de ordem escrita na tela da lista (Revisão 6). */
export const REGRA_ORDEM = {
  praHoje: "Vencidos primeiro, depois pelo horário.",
  lista: "Com próxima ação primeiro, pela mais cedo; depois os mais recentes.",
} as const;

/** Dica das colunas Trial e Ganho: os cards entram sozinhos, mas também se movem à mão. */
export const EXPLICACAO_AUTOMATICO =
  "conta criada vira Trial; assinatura ativada vira Ganho. Também dá para mover à mão";
