/**
 * Ponte entre o `<input type="datetime-local">` e o ISO do banco.
 *
 * O campo devolve a hora de parede sem fuso ("2026-11-26T09:30"). O master
 * pensa em hora de São Paulo, então a conversão é explícita e não depende do
 * fuso do navegador: o Brasil não tem horário de verão, e São Paulo é
 * sempre UTC-03:00. Mandar o valor cru para o servidor faria ele ler UTC.
 */

const FUSO = "America/Sao_Paulo";
const RE_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "AAAA-MM-DDTHH:mm" (hora de São Paulo) → ISO em UTC; null se vazio ou inválido. */
export function localSPParaIso(valor: string): string | null {
  const m = RE_LOCAL.exec(valor.trim());
  if (!m) return null;
  const [, a, mes, d, h, min, s] = m;
  const iso = `${a}-${mes}-${d}T${h}:${min}:${s ?? "00"}-03:00`;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  // Rejeita datas que o Date "conserta" (31/02 vira 03/03).
  if (isoParaLocalSP(data.toISOString()) !== `${a}-${mes}-${d}T${h}:${min}`) return null;
  return data.toISOString();
}

/** ISO → "AAAA-MM-DDTHH:mm" no relógio de São Paulo, para preencher o campo. */
export function isoParaLocalSP(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
