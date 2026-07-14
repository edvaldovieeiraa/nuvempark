import { createClient } from "@/lib/supabase/server";

export type PatioLite = { id: string; nome: string };

/**
 * Resolve o pátio em escopo para as telas por-pátio.
 *
 * Regra (decisão 2026-07-09): as telas de operação/cadastro operam sobre UM
 * pátio, escolhido no seletor da sidebar e carregado via `?patio=<id>`.
 * Se o param estiver ausente ou inválido, cai no primeiro pátio ativo.
 *
 * Retorna a lista (para o seletor) e o pátio ativo (null se a rede não tem
 * nenhum pátio ainda).
 */
export async function resolverPatio(patioParam: string | undefined): Promise<{
  patios: PatioLite[];
  patioId: string | null;
  patioNome: string | null;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patios")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");

  const patios = data ?? [];
  if (patios.length === 0) {
    return { patios, patioId: null, patioNome: null };
  }

  const escolhido =
    patios.find((p) => p.id === patioParam) ?? patios[0];

  return { patios, patioId: escolhido.id, patioNome: escolhido.nome };
}

/**
 * Última sincronização de um pátio (ISO) — o registro mais recente que o app
 * daquele pátio enviou. Olha tickets e caixa_sessoes e pega o mais novo.
 * Retorna null se o pátio nunca sincronizou nada.
 */
export async function ultimaSincronizacao(
  patioId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const [ticket, caixa] = await Promise.all([
    supabase
      .from("tickets")
      .select("sincronizado_em")
      .eq("patio_id", patioId)
      .not("sincronizado_em", "is", null)
      .order("sincronizado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("caixa_sessoes")
      .select("sincronizado_em")
      .eq("patio_id", patioId)
      .not("sincronizado_em", "is", null)
      .order("sincronizado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const datas = [
    ticket.data?.sincronizado_em,
    caixa.data?.sincronizado_em,
  ].filter((d): d is string => Boolean(d));

  if (datas.length === 0) return null;
  return datas.sort().at(-1) ?? null;
}

/**
 * Última sincronização de VÁRIOS pátios de uma vez → mapa `patio_id → ISO`.
 * Pátio que nunca sincronizou fica fora do mapa.
 *
 * Usado pela sidebar, que é server component e NÃO recebe `searchParams` — ela
 * não sabe qual pátio está ativo (isso é do seletor, no cliente). Então manda a
 * data de todos e o seletor escolhe a do ativo.
 *
 * São 2 queries por pátio. O gestor típico tem poucos pátios; se um dia isso
 * pesar, o caminho é uma view com `max(sincronizado_em)` agrupado por pátio.
 */
export async function ultimaSincronizacaoPorPatio(
  patioIds: string[],
): Promise<Record<string, string>> {
  if (patioIds.length === 0) return {};
  const pares = await Promise.all(
    patioIds.map(async (id) => [id, await ultimaSincronizacao(id)] as const),
  );
  return Object.fromEntries(
    pares.filter((p): p is [string, string] => p[1] !== null),
  );
}
