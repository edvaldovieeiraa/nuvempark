/**
 * Regra de vencimento do mensalista (espelha web/src/lib/vencimento.ts).
 * 1 pagamento estende a vigência por 1 ciclo:
 *   - dia_vencimento (1..28): esse dia no mês SEGUINTE ao vencimento atual;
 *   - nulo: vencimento atual + 30 dias.
 * Base = vencimento atual, ou hoje (UTC) se o cliente ainda não tiver.
 * Datas 'YYYY-MM-DD', aritmética em UTC (imune a fuso/DST).
 */

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' de hoje em UTC (fallback quando não há vencimento atual). */
export function hojeYmdUtc(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Próximo vencimento a partir do atual (ou de hoje, se nulo). */
export function proximoVencimento(
  atual: string | null,
  diaVencimento: number | null,
  hojeYmd: string,
): string {
  const base = (atual ?? hojeYmd).slice(0, 10);
  const parts = base.split('-');
  const by = Number(parts[0]);
  const bm = Number(parts[1]);
  const bd = Number(parts[2]);

  if (diaVencimento && diaVencimento >= 1 && diaVencimento <= 28) {
    let ny = by;
    let nm = bm + 1;
    if (nm > 12) {
      nm = 1;
      ny += 1;
    }
    return `${ny}-${pad2(nm)}-${pad2(diaVencimento)}`;
  }

  const d = new Date(Date.UTC(by, bm - 1, bd));
  d.setUTCDate(d.getUTCDate() + 30);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
