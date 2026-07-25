/**
 * Datas do blog, em pt-BR e no fuso de Brasília.
 *
 * O painel usa `format-data.ts` (dd/MM/aaaa, foco em auditoria). No blog o tom
 * é editorial: data por extenso e "há 3 dias" para o que é recente. Fuso fixo
 * em America/Sao_Paulo porque as páginas renderizam no servidor (VPS em UTC) —
 * sem fixar, a mesma data apareceria diferente no servidor e no cliente.
 */

const FUSO = "America/Sao_Paulo";

const _longa = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const _curta = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const _relativa = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

function paraDate(valor: string | Date): Date | null {
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `12 de julho de 2026`. */
export function dataLonga(valor: string | Date): string {
  const d = paraDate(valor);
  return d ? _longa.format(d) : "—";
}

/** `12 de jul. de 2026` — para cards, onde o espaço é curto. */
export function dataCurta(valor: string | Date): string {
  const d = paraDate(valor);
  return d ? _curta.format(d) : "—";
}

/** `2026-07-12` — valor do atributo `datetime` de `<time>`. */
export function dataAtributo(valor: string | Date): string {
  const d = paraDate(valor);
  return d ? d.toISOString() : "";
}

/**
 * "há 3 dias" enquanto o post é recente; data por extenso a partir de ~1 mês.
 *
 * Renderizado no servidor e servido de cache ISR: o texto envelhece até a
 * próxima revalidação. Por isso a granularidade é grosseira (horas/dias) — um
 * "há 5 minutos" ficaria visivelmente errado; "há 2 dias", não.
 */
export function dataRelativa(valor: string | Date): string {
  const d = paraDate(valor);
  if (!d) return "—";

  const segundos = Math.round((d.getTime() - Date.now()) / 1000);
  const absoluto = Math.abs(segundos);

  if (absoluto < 60) return "agora mesmo";
  if (absoluto < 3600) return _relativa.format(Math.round(segundos / 60), "minute");
  if (absoluto < 86400) return _relativa.format(Math.round(segundos / 3600), "hour");
  if (absoluto < 7 * 86400) return _relativa.format(Math.round(segundos / 86400), "day");
  if (absoluto < 30 * 86400)
    return _relativa.format(Math.round(segundos / (7 * 86400)), "week");

  return dataLonga(d);
}
