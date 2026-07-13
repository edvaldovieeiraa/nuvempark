/**
 * Regra de vencimento do mensalista — 1 pagamento estende a vigência por 1 ciclo.
 *
 *   - dia_vencimento definido (1..28): próximo vencimento = esse dia no MÊS
 *     SEGUINTE ao vencimento atual (base);
 *   - dia_vencimento nulo: vencimento atual + 30 dias.
 *
 * A base é o vencimento atual (estende a vigência de onde estava); se o cliente
 * ainda não tem vencimento, usa "hoje". Datas em 'YYYY-MM-DD' e aritmética em
 * UTC para não escorregar por fuso/DST. Mesma regra replicada na API e no app.
 */

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 'YYYY-MM-DD' de hoje no fuso de São Paulo (dia civil correto perto da virada). */
export function hojeYmdSaoPaulo(): string {
  const sp = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  return `${sp.getFullYear()}-${pad2(sp.getMonth() + 1)}-${pad2(sp.getDate())}`;
}

/**
 * Próximo vencimento a partir do atual (ou de hoje, se nulo).
 * @param atual         vencimento vigente 'YYYY-MM-DD' | null
 * @param diaVencimento dia fixo 1..28 | null
 * @param hojeYmd       'YYYY-MM-DD' usado como base quando `atual` é nulo
 */
export function proximoVencimento(
  atual: string | null,
  diaVencimento: number | null,
  hojeYmd: string,
): string {
  const base = (atual ?? hojeYmd).slice(0, 10);
  const [by, bm, bd] = base.split("-").map(Number);

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

/** Dias entre hoje e o vencimento (>0 futuro, 0 hoje, <0 atrasado). */
export function diasAteVencimento(vencimentoYmd: string, hojeYmd: string): number {
  const [vy, vm, vd] = vencimentoYmd.slice(0, 10).split("-").map(Number);
  const [hy, hm, hd] = hojeYmd.slice(0, 10).split("-").map(Number);
  const venc = Date.UTC(vy, vm - 1, vd);
  const hoje = Date.UTC(hy, hm - 1, hd);
  return Math.round((venc - hoje) / 86_400_000);
}

/** '10/08/2026' a partir de 'YYYY-MM-DD'. */
export function formatarVencimentoBR(vencimentoYmd: string): string {
  const [y, m, d] = vencimentoYmd.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
