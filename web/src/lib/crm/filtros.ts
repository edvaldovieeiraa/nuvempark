import { inicioJanela } from "@/lib/crm/consulta";
import { ESTAGIOS, FONTES, type Estagio, type Fonte, type Temperatura } from "@/lib/crm/tipos";

/**
 * Filtros da tela do CRM (req. 21): busca, fonte, praça, temperatura e a janela de 30 dias
 * de Ganho e Perdido (req. 22). Puro; nenhuma função muda o array recebido.
 */

type LeadBuscavel = {
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
};

/** Sem caixa e sem acento: "São José" casa com "sao jose". */
function normalizar(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Nome, empresa e e-mail por trecho; telefone pelos dígitos. O telefone só
 * entra quando o termo tem dígito: "ana" sem dígitos viraria "" e casaria
 * com todo lead que tem telefone.
 */
export function casaBusca(lead: LeadBuscavel, termo: string): boolean {
  const t = normalizar(termo.trim());
  if (!t) return true;
  for (const campo of [lead.nome, lead.empresa, lead.email]) {
    if (campo && normalizar(campo).includes(t)) return true;
  }
  const digitos = t.replace(/\D/g, "");
  if (!digitos || !lead.telefone) return false;
  return lead.telefone.replace(/\D/g, "").includes(digitos);
}

/** Ganho e Perdido só contam e aparecem no kanban nos últimos 30 dias. */
export function naJanela(lead: { status: Estagio; estagioEm: string }, agora: Date): boolean {
  if (lead.status !== "ganho" && lead.status !== "perdido") return true;
  return Date.parse(lead.estagioEm) >= Date.parse(inicioJanela(agora));
}

/** Um nível, ou "sem" para os leads sem marca; null = todas. */
export type FiltroTemperatura = Temperatura | "sem";

export type FiltrosCrm = {
  busca?: string;
  fonte?: Fonte | null;
  praca?: string | null;
  temperatura?: FiltroTemperatura | null;
};

function casaTemperatura(t: Temperatura | null, f: FiltroTemperatura | null | undefined): boolean {
  if (!f) return true;
  return f === "sem" ? t === null : t === f;
}

export function aplicarFiltros<
  T extends LeadBuscavel & { fonte: Fonte; praca: string | null; temperatura: Temperatura | null },
>(leads: readonly T[], f: FiltrosCrm): T[] {
  return leads.filter(
    (l) =>
      (!f.fonte || l.fonte === f.fonte) &&
      (!f.praca || l.praca === f.praca) &&
      casaTemperatura(l.temperatura, f.temperatura) &&
      casaBusca(l, f.busca ?? ""),
  );
}

export function contarPorEstagio(leads: readonly { status: Estagio }[]): Record<Estagio, number> {
  const c = Object.fromEntries(ESTAGIOS.map((e) => [e, 0])) as Record<Estagio, number>;
  for (const l of leads) c[l.status] += 1;
  return c;
}

export function opcoesPraca(leads: readonly { praca: string | null }[]): string[] {
  const s = new Set<string>();
  for (const l of leads) if (l.praca) s.add(l.praca);
  return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function opcoesFonte(leads: readonly { fonte: Fonte }[]): Fonte[] {
  const s = new Set(leads.map((l) => l.fonte));
  return FONTES.filter((f) => s.has(f));
}
