import { ESTAGIOS, type Estagio, type Fonte, type MotivoPerda } from "@/lib/crm/tipos";

/**
 * Movimento de estágio do CRM. Decisão de 26/11/2026 (substitui a matriz da
 * Revisão 1 da spec): o master move qualquer card para qualquer estágio,
 * inclusive Trial e Ganho. Caso real: rede ativada só para estender o teste
 * entra em Ganho pelo vínculo e precisa voltar para Trial à mão.
 *
 * Os movimentos automáticos continuam (db/48): conta criada → Trial, assinatura
 * ativada → Ganho, trial cancelado → Perdido. Eles só acontecem quando o estado
 * da assinatura MUDA, então não desfazem um movimento manual sozinhos.
 * Perdido continua exigindo o motivo (`validacao.ts`).
 */

export type DestinoManual = Estagio;

export function destinosPossiveis(lead: { status: Estagio }): DestinoManual[] {
  return ESTAGIOS.filter((e) => e !== lead.status);
}

export function podeMoverPara(lead: { status: Estagio }, destino: DestinoManual): boolean {
  return destinosPossiveis(lead).includes(destino);
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
