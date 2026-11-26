import type { Estagio, EstadoAssinatura } from "@/lib/crm/tipos";

/**
 * Prazos do CRM: alerta do trial (req. 16), variantes da próxima ação
 * (Revisão 9) e o filtro "Pra hoje" (req. 17).
 *
 * "Hoje" é o dia do calendário em São Paulo. O banco guarda UTC, e às 23:30
 * em São Paulo já é o dia seguinte em UTC: calcular em UTC jogaria a ação de
 * amanhã cedo no "Pra hoje" de hoje à noite.
 */

const FUSO = "America/Sao_Paulo";
const DIA_MS = 24 * 60 * 60 * 1000;
/** Trial com até 3 dias de prazo fica em alerta (âmbar). */
export const DIAS_ALERTA_TRIAL = 3;

const fmtDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "AAAA-MM-DD" do instante no calendário de São Paulo. */
export function diaEmSaoPaulo(d: Date): string {
  return fmtDia.format(d);
}

/** Dias de calendário (São Paulo) de `de` até `ate`. */
function diasDeCalendario(de: Date, ate: Date): number {
  const a = Date.parse(`${diaEmSaoPaulo(de)}T00:00:00Z`);
  const b = Date.parse(`${diaEmSaoPaulo(ate)}T00:00:00Z`);
  return Math.round((b - a) / DIA_MS);
}

export type ClasseTrial =
  | { tipo: "ok"; dias: number }
  | { tipo: "expirando"; dias: number }
  | { tipo: "expirado"; dias: number };

/**
 * `ok` (4 dias ou mais), `expirando` (3 dias ou menos; 0 = expira hoje) ou
 * `expirado` (já passou; `dias` desde a expiração).
 */
export function classificarTrial(expiraEm: string | null, agora: Date): ClasseTrial | null {
  if (!expiraEm) return null;
  const expira = new Date(expiraEm);
  if (Number.isNaN(expira.getTime())) return null;

  if (expira.getTime() <= agora.getTime())
    return { tipo: "expirado", dias: diasDeCalendario(expira, agora) };

  const dias = diasDeCalendario(agora, expira);
  return dias <= DIAS_ALERTA_TRIAL ? { tipo: "expirando", dias } : { tipo: "ok", dias };
}

type LeadComTrial = {
  status: Estagio;
  assinaturaEstado: EstadoAssinatura | null;
  trialExpiraEm: string | null;
};

/** O alerta do card só vale para lead em Trial com a assinatura ainda em trial. */
export function alertaTrial(lead: LeadComTrial, agora: Date): ClasseTrial | null {
  if (lead.status !== "trial" || lead.assinaturaEstado !== "trial") return null;
  return classificarTrial(lead.trialExpiraEm, agora);
}

export type VarianteProximaAcao = "vencida" | "hoje" | "futura" | "sem";

/** Vencida = antes de agora (mesmo que hoje cedo); hoje = ainda hoje em São Paulo. */
export function varianteProximaAcao(em: string | null, agora: Date): VarianteProximaAcao {
  if (!em) return "sem";
  const d = new Date(em);
  if (Number.isNaN(d.getTime())) return "sem";
  if (d.getTime() < agora.getTime()) return "vencida";
  return diaEmSaoPaulo(d) === diaEmSaoPaulo(agora) ? "hoje" : "futura";
}

export type MotivoHoje =
  | { tipo: "acao_vencida"; em: string }
  | { tipo: "acao_hoje"; em: string }
  | { tipo: "trial_expirando"; dias: number; em: string }
  | { tipo: "trial_expirado"; dias: number; em: string };

type LeadPraHoje = LeadComTrial & { proximaAcaoEm: string | null };

/** Todos os motivos do lead estar no "Pra hoje" (a lista mostra todos). */
export function motivosPraHoje(lead: LeadPraHoje, agora: Date): MotivoHoje[] {
  const motivos: MotivoHoje[] = [];

  const v = varianteProximaAcao(lead.proximaAcaoEm, agora);
  if (lead.proximaAcaoEm && v === "vencida") motivos.push({ tipo: "acao_vencida", em: lead.proximaAcaoEm });
  if (lead.proximaAcaoEm && v === "hoje") motivos.push({ tipo: "acao_hoje", em: lead.proximaAcaoEm });

  const t = alertaTrial(lead, agora);
  if (t && lead.trialExpiraEm) {
    if (t.tipo === "expirando") motivos.push({ tipo: "trial_expirando", dias: t.dias, em: lead.trialExpiraEm });
    if (t.tipo === "expirado") motivos.push({ tipo: "trial_expirado", dias: t.dias, em: lead.trialExpiraEm });
  }
  return motivos;
}

export function estaPraHoje(lead: LeadPraHoje, agora: Date): boolean {
  return motivosPraHoje(lead, agora).length > 0;
}

/** Algo venceu ou expirou: é o que pinta a borda do card de vermelho. */
export function temAlertaVencido(lead: LeadPraHoje, agora: Date): boolean {
  return motivosPraHoje(lead, agora).some(
    (m) => m.tipo === "acao_vencida" || m.tipo === "trial_expirado",
  );
}
