/**
 * Labels amigáveis para os enums exibidos no painel. Camada de EXIBIÇÃO apenas —
 * o banco continua guardando o valor cru; filtros/queries usam o valor cru.
 * Tipagem casada com os CHECKs (db/01-schema, db/10, db/11).
 */

export type TicketStatus = "aberto" | "fechado" | "removido" | "cancelado";
export type AssinaturaEstado =
  | "trial"
  | "ativa"
  | "atrasada"
  | "suspensa"
  | "cancelada";
export type CaixaStatus = "aberta" | "fechada";
export type CaixaTipo = "entrada" | "sangria" | "isencao";

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  aberto: "Aberto",
  fechado: "Saiu",
  removido: "Removido",
  cancelado: "Cancelado",
};

export const ASSINATURA_ESTADO_LABEL: Record<AssinaturaEstado, string> = {
  trial: "Período de teste",
  ativa: "Ativa",
  atrasada: "Atrasada",
  suspensa: "Suspensa",
  cancelada: "Cancelada",
};

export const CAIXA_STATUS_LABEL: Record<CaixaStatus, string> = {
  aberta: "Aberto",
  fechada: "Fechado",
};

export const CAIXA_TIPO_LABEL: Record<CaixaTipo, string> = {
  entrada: "Entrada",
  sangria: "Sangria",
  isencao: "Isenção",
};

/** Capitaliza a primeira letra — fallback para valores fora do mapa. */
export function capitalizar(v: string): string {
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : v;
}

function comFallback<K extends string>(
  mapa: Record<K, string>,
  v: string | null | undefined,
): string {
  if (!v) return "—";
  return (mapa as Record<string, string>)[v] ?? capitalizar(v);
}

export const labelTicketStatus = (v: string | null | undefined): string =>
  comFallback(TICKET_STATUS_LABEL, v);
export const labelAssinaturaEstado = (v: string | null | undefined): string =>
  comFallback(ASSINATURA_ESTADO_LABEL, v);
export const labelCaixaStatus = (v: string | null | undefined): string =>
  comFallback(CAIXA_STATUS_LABEL, v);
export const labelCaixaTipo = (v: string | null | undefined): string =>
  comFallback(CAIXA_TIPO_LABEL, v);
