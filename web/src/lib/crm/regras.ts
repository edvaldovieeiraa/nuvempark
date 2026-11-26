import type { Estagio, EstadoAssinatura, Fonte, MotivoPerda } from "@/lib/crm/tipos";

/**
 * Matriz de estágio do CRM (Revisão 1 da spec). A regra mora só aqui: o menu do
 * card mostra `destinosPossiveis` e a action confere `podeMoverPara` antes de
 * gravar. O banco só guarda as invariantes que nunca mudam (db/47,
 * `fn_crm_mover`).
 *
 * - sem rede ligada: livre entre novo, em_contato e perdido;
 * - trial: só perdido (desistiu no teste);
 * - perdido com rede: só "Reabrir" (volta a trial), e só com a assinatura
 *   ainda em trial. Se a rede pagar, o card vai sozinho para ganho;
 * - ganho: nenhum destino manual (churn fora do escopo).
 */

/** Destinos que o master pode escolher. `trial` só aparece como "Reabrir". */
export type DestinoManual = "novo" | "em_contato" | "perdido" | "trial";

type LeadParaRegra = {
  status: Estagio;
  tenantId: string | null;
  assinaturaEstado: EstadoAssinatura | null;
};

const LIVRES: readonly DestinoManual[] = ["novo", "em_contato", "perdido"];

export function destinosPossiveis(lead: LeadParaRegra): DestinoManual[] {
  switch (lead.status) {
    case "ganho":
      return [];
    case "trial":
      return ["perdido"];
    case "perdido":
      if (lead.tenantId) return lead.assinaturaEstado === "trial" ? ["trial"] : [];
      return LIVRES.filter((d) => d !== "perdido");
    case "novo":
    case "em_contato":
      return LIVRES.filter((d) => d !== lead.status);
    default:
      return [];
  }
}

export function podeMoverPara(lead: LeadParaRegra, destino: DestinoManual): boolean {
  return destinosPossiveis(lead).includes(destino);
}

/** Por que o card não tem destino manual; null quando tem. */
export function motivoSemDestino(lead: LeadParaRegra): string | null {
  if (destinosPossiveis(lead).length > 0) return null;
  if (lead.status === "ganho")
    return "Ganho é automático: o card chega aqui quando a assinatura é ativada e não muda à mão.";
  if (lead.status === "perdido" && lead.tenantId)
    return "A rede não está mais em trial. Se ela pagar, o card vai sozinho para Ganho.";
  return null;
}

/** Os 6 motivos que o master escolhe. `cancelou` é só do sistema (req. 2). */
export const MOTIVOS_MANUAIS: readonly Exclude<MotivoPerda, "cancelou">[] = [
  "preco",
  "sem_retorno",
  "concorrente",
  "sem_perfil",
  "desistiu",
  "outro",
];

/**
 * "Excluir: é spam" (Revisão 3): só lead do formulário, sem rede e sem nenhuma
 * interação humana. O resto vai para Perdido, que guarda o histórico. O banco
 * repete a condição no próprio DELETE (`fn_crm_excluir_spam`).
 */
export function podeExcluirComoSpam(lead: {
  fonte: Fonte;
  tenantId: string | null;
  temInteracaoHumana: boolean;
}): boolean {
  return lead.fonte === "contato" && !lead.tenantId && !lead.temInteracaoHumana;
}
