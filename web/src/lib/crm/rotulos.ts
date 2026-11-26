import type { EstadoAssinatura, Estagio, Fonte, MotivoPerda, TipoInteracao } from "@/lib/crm/tipos";

/** Todos os textos de estágio, fonte, motivo e tipo do CRM. Nenhum componente repete. */

export const ROTULO_ESTAGIO: Record<Estagio, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  trial: "Trial",
  ganho: "Ganho",
  perdido: "Perdido",
};

export const ROTULO_FONTE: Record<Fonte, string> = {
  contato: "Contato do site",
  trial: "Trial",
  master: "Master",
  manual: "Manual",
  importacao: "Importado",
};

/**
 * A UI mostra só a fonte gravada (Revisão 4). "Contato do site → Trial" é
 * derivado: veio do formulário e depois criou conta. Formulário × Google no
 * cadastro não é sabido e não aparece.
 */
export function rotuloFonte(lead: { fonte: Fonte; tenantId: string | null }): string {
  if (lead.fonte === "contato" && lead.tenantId) return "Contato do site → Trial";
  return ROTULO_FONTE[lead.fonte];
}

export const ROTULO_MOTIVO: Record<MotivoPerda, string> = {
  preco: "Preço",
  sem_retorno: "Sem retorno",
  concorrente: "Foi para um concorrente",
  sem_perfil: "Sem perfil",
  desistiu: "Desistiu",
  outro: "Outro",
  cancelou: "Cancelou o trial",
};

export const ROTULO_TIPO: Record<TipoInteracao, string> = {
  nota: "Nota",
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  reuniao: "Reunião",
  sistema: "Sistema",
};

export const ROTULO_ASSINATURA: Record<EstadoAssinatura, string> = {
  trial: "Em trial",
  ativa: "Ativa",
  atrasada: "Atrasada",
  suspensa: "Suspensa",
  cancelada: "Cancelada",
};
