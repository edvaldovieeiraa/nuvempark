import { motivosPraHoje, temAlertaVencido } from "@/lib/crm/prazos";
import type { Estagio, EstadoAssinatura } from "@/lib/crm/tipos";

/**
 * Ordem dos cards (Revisão 6). Nenhuma função muda o array recebido.
 *
 * - coluna do kanban: vencido/expirado → próxima ação → chegada;
 * - "Pra hoje": vencido primeiro, depois pelo horário;
 * - lista sem filtro: próxima ação, depois chegada.
 *
 * "Chegada" é `criadoEm`, o mais recente primeiro.
 */

type LeadOrdenavel = {
  id: string;
  status: Estagio;
  proximaAcaoEm: string | null;
  trialExpiraEm: string | null;
  assinaturaEstado: EstadoAssinatura | null;
  criadoEm: string;
};

const ms = (iso: string | null) => (iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY);

/** O instante mais cedo entre os motivos do lead (ação ou expiração do trial). */
function momento(lead: LeadOrdenavel, agora: Date): number {
  const tempos = motivosPraHoje(lead, agora).map((m) => ms(m.em));
  return tempos.length ? Math.min(...tempos) : ms(lead.proximaAcaoEm);
}

function porChegada(a: LeadOrdenavel, b: LeadOrdenavel): number {
  return ms(b.criadoEm) - ms(a.criadoEm) || a.id.localeCompare(b.id);
}

export function ordenarColuna<T extends LeadOrdenavel>(leads: readonly T[], agora: Date): T[] {
  const grupo = (l: T) => (temAlertaVencido(l, agora) ? 0 : l.proximaAcaoEm ? 1 : 2);
  return [...leads].sort((a, b) => {
    const g = grupo(a) - grupo(b);
    if (g) return g;
    if (grupo(a) === 0) return momento(a, agora) - momento(b, agora) || porChegada(a, b);
    if (grupo(a) === 1) return ms(a.proximaAcaoEm) - ms(b.proximaAcaoEm) || porChegada(a, b);
    return porChegada(a, b);
  });
}

export function ordenarPraHoje<T extends LeadOrdenavel>(leads: readonly T[], agora: Date): T[] {
  const grupo = (l: T) => (temAlertaVencido(l, agora) ? 0 : 1);
  return [...leads].sort(
    (a, b) => grupo(a) - grupo(b) || momento(a, agora) - momento(b, agora) || porChegada(a, b),
  );
}

export function ordenarLista<T extends LeadOrdenavel>(leads: readonly T[]): T[] {
  return [...leads].sort((a, b) => {
    const ga = a.proximaAcaoEm ? 0 : 1;
    const gb = b.proximaAcaoEm ? 0 : 1;
    if (ga !== gb) return ga - gb;
    if (ga === 0) return ms(a.proximaAcaoEm) - ms(b.proximaAcaoEm) || porChegada(a, b);
    return porChegada(a, b);
  });
}
