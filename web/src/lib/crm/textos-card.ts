import { temContato } from "@/lib/crm/contato";
import { diaEmSaoPaulo, varianteProximaAcao, type ClasseTrial } from "@/lib/crm/prazos";
import { ROTULO_ASSINATURA, ROTULO_MOTIVO, rotuloFonte } from "@/lib/crm/rotulos";
import type { Estagio, LeadCrm } from "@/lib/crm/tipos";
import { formatarData, formatarHora } from "@/lib/format-data";

/**
 * Textos do card do kanban (e da linha da lista). Puro: recebe `agora` e
 * nunca lê o relógio, para o servidor e o navegador escreverem o mesmo.
 *
 * Toda data passa por `new Date(...)` antes de `formatarData`: com a string
 * ISO, `formatarData` lê os 10 primeiros caracteres, que são o dia em UTC.
 */

function dia(iso: string): string {
  return formatarData(new Date(iso));
}

/** "empresa · praça"; "sem responsável informado" no lead do vínculo; "sem contato". */
export function subtituloCard(lead: LeadCrm): string | null {
  const partes: string[] = [];
  if (lead.semResponsavel) partes.push("sem responsável informado");
  else if (lead.empresa?.trim()) partes.push(lead.empresa.trim());
  if (lead.praca) partes.push(lead.praca);
  if (!temContato(lead)) partes.push("sem contato");
  return partes.length > 0 ? partes.join(" · ") : null;
}

function nDias(n: number): string {
  return n === 1 ? "1 dia" : `${n} dias`;
}

/** Frase do bloco do trial (req. 16). A cor vem de `classe.tipo`. */
export function textoTrial(classe: ClasseTrial, expiraEm: string): string {
  if (classe.tipo === "expirado")
    return classe.dias === 0
      ? "Expirou hoje, sem pagamento"
      : `Expirou há ${nDias(classe.dias)}, sem pagamento`;
  const quando = classe.dias === 0 ? "Expira hoje" : `Expira em ${nDias(classe.dias)}`;
  return `${quando} · ${dia(expiraEm)}`;
}

/** Quando é a próxima ação; null sem ação. A cor vem de `varianteProximaAcao`. */
export function textoProximaAcao(em: string | null, agora: Date): string | null {
  const v = varianteProximaAcao(em, agora);
  if (!em || v === "sem") return null;
  const d = new Date(em);
  if (v === "vencida")
    return diaEmSaoPaulo(d) === diaEmSaoPaulo(agora)
      ? `Venceu hoje às ${formatarHora(d)}`
      : `Venceu em ${formatarData(d)}`;
  if (v === "hoje") return `Hoje às ${formatarHora(d)}`;
  return `${formatarData(d)} às ${formatarHora(d)}`;
}

export type TomSelo = "aviso" | "perigo" | "neutro";

/**
 * Selo do card: a assinatura com problema em Ganho (atrasada em âmbar,
 * suspensa e cancelada em vermelho) ou o motivo da perda, neutro.
 */
export function seloCard(lead: LeadCrm): { texto: string; tom: TomSelo } | null {
  if (lead.status === "ganho") {
    const a = lead.assinaturaEstado;
    if (a === "atrasada") return { texto: `Assinatura ${ROTULO_ASSINATURA[a].toLowerCase()}`, tom: "aviso" };
    if (a === "suspensa" || a === "cancelada")
      return { texto: `Assinatura ${ROTULO_ASSINATURA[a].toLowerCase()}`, tom: "perigo" };
    return null;
  }
  if (lead.status === "perdido" && lead.motivoPerda)
    return { texto: ROTULO_MOTIVO[lead.motivoPerda], tom: "neutro" };
  return null;
}

const PREFIXO_DATA: Record<Estagio, string> = {
  novo: "chegou em",
  em_contato: "em contato desde",
  trial: "em trial desde",
  ganho: "ganho em",
  perdido: "perdido em",
};

/** "fonte · desde quando": chegada no Novo, entrada no estágio nos demais. */
export function rodapeCard(lead: LeadCrm): string {
  const data = lead.status === "novo" ? lead.criadoEm : lead.estagioEm;
  return `${rotuloFonte(lead)} · ${PREFIXO_DATA[lead.status]} ${dia(data)}`;
}
