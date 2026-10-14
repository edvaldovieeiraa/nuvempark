/**
 * Hora de parede no fuso do pátio. O único lugar do motor que conhece fuso:
 * as janelas das regras ("Noturno 20:00–06:00, seg a dom") são de parede, mas
 * entrada e saída chegam como instantes. Sempre IANA, nunca offset fixo — o
 * offset muda com horário de verão. A cópia Dart usa o pacote `timezone`.
 */

export interface PartesLocais {
  ano: number;
  mes: number;
  dia: number;
  /** ISO: 1 = segunda … 7 = domingo. */
  diaSemana: number;
  minutoDoDia: number;
}

const DIA_SEMANA: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

const formatos = new Map<string, Intl.DateTimeFormat>();

function formato(fuso: string): Intl.DateTimeFormat {
  let f = formatos.get(fuso);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: fuso,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
    });
    formatos.set(fuso, f);
  }
  return f;
}

export function partesLocais(instante: Date, fuso: string): PartesLocais {
  const p: Record<string, string> = {};
  for (const { type, value } of formato(fuso).formatToParts(instante)) p[type] = value;
  return {
    ano: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    diaSemana: DIA_SEMANA[p.weekday ?? ''] ?? 0,
    minutoDoDia: Number(p.hour) * 60 + Number(p.minute),
  };
}

/** Diferença (local − UTC), em minutos, no instante dado. */
function offsetMinutos(ms: number, fuso: string): number {
  const l = partesLocais(new Date(ms), fuso);
  const comoUtc = Date.UTC(l.ano, l.mes - 1, l.dia, 0, l.minutoDoDia);
  return Math.round((comoUtc - Math.floor(ms / 60_000) * 60_000) / 60_000);
}

/**
 * O instante em que o relógio do fuso marca `ano-mes-dia` + `minutoDoDia`.
 * Na hora que não existe (adiantamento do horário de verão) volta uma hora:
 * 02:30 de Nova York em 08/03/2026 vira 01:30 (−5). Na hora repetida, fica com
 * a primeira. O Dart faz a mesma conta à mão em vez de usar a regra do pacote
 * `timezone`, para as cópias não divergirem.
 */
export function instanteLocal(
  ano: number,
  mes: number,
  dia: number,
  minutoDoDia: number,
  fuso: string,
): Date {
  const comoUtc = Date.UTC(ano, mes - 1, dia, 0, minutoDoDia);
  const antes = offsetMinutos(comoUtc, fuso);
  let ms = comoUtc - antes * 60_000;
  const depois = offsetMinutos(ms, fuso);
  if (depois !== antes) ms = comoUtc - depois * 60_000;
  return new Date(ms);
}

export function somarDias(
  ano: number,
  mes: number,
  dia: number,
  dias: number,
): { ano: number; mes: number; dia: number } {
  const d = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}
