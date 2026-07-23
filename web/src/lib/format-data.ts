/**
 * Formatação central de datas do painel — fonte ÚNICA de exibição.
 *
 * Regra: toda data mostrada ao usuário aparece completa —
 *   - `formatarDataHora` → `dd/MM/aaaa HH:mm:ss` (timestamptz / epoch-ms / Date)
 *   - `formatarData`      → `dd/MM/aaaa` (campos SÓ data no banco, ex.: vencimento)
 *
 * Timezone: fixo em `America/Sao_Paulo`. O produto é brasileiro, e boa parte
 * das telas são Server Components (renderizam na VPS, que roda em UTC) — o
 * default do Intl mostraria UTC nessas páginas. Fixar o fuso deixa server e
 * client consistentes em horário de Brasília. Os timestamps vêm como
 * timestamptz/epoch-ms e NÃO devem ser convertidos à mão.
 * Já `formatarData` trata `YYYY-MM-DD` como data CIVIL (sem fuso): fazer
 * `new Date('2026-08-10')` cairia em meia-noite UTC e escorregaria um dia no
 * horário de Brasília — por isso os componentes são lidos direto da string.
 */

type ValorData = string | number | Date | null | undefined;

const VAZIO = "—";
const FUSO = "America/Sao_Paulo";

const _dataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const _dataSo = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** `YYYY-MM-DD` puro (sem parte de hora) → data civil, sem fuso. */
const SO_DATA = /^\d{4}-\d{2}-\d{2}$/;

function paraDate(valor: ValorData): Date | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `dd/MM/aaaa HH:mm:ss` no fuso do navegador. Inválido/nulo → `—`. */
export function formatarDataHora(valor: ValorData): string {
  const d = paraDate(valor);
  return d ? _dataHora.format(d) : VAZIO;
}

/**
 * `dd/MM/aaaa` para campos apenas-data. Uma string `YYYY-MM-DD` é lida como
 * data civil (sem conversão de fuso); demais entradas usam o fuso do navegador.
 * Não inventa hora. Inválido/nulo → `—`.
 */
export function formatarData(valor: ValorData): string {
  if (typeof valor === "string") {
    const civil = valor.slice(0, 10);
    if (SO_DATA.test(civil)) {
      const [y, m, d] = civil.split("-");
      return `${d}/${m}/${y}`;
    }
  }
  const d = paraDate(valor);
  return d ? _dataSo.format(d) : VAZIO;
}

const _rel = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

const _UNIDADES: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
];

/**
 * Tempo relativo em pt-BR ("há 40 segundos", "há 3 dias", "agora mesmo").
 * Usa Intl.RelativeTimeFormat no mesmo fuso lógico das demais funções.
 * Inválido/nulo → `—`.
 */
export function tempoRelativo(valor: ValorData): string {
  const d = paraDate(valor);
  if (!d) return VAZIO;
  const seg = Math.round((d.getTime() - Date.now()) / 1000); // <0 = passado
  if (Math.abs(seg) < 5) return "agora mesmo";
  for (const [unidade, tamanho] of _UNIDADES) {
    if (Math.abs(seg) >= tamanho || unidade === "second") {
      return _rel.format(Math.round(seg / tamanho), unidade);
    }
  }
  return VAZIO;
}
