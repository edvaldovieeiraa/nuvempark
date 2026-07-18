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
/**
 * TODAS as tabelas em que o app carimba `sincronizado_em` ao enviar. Antes só
 * tickets e caixa_sessoes entravam na conta: se a última coisa que subiu foi um
 * movimento de caixa, um pagamento de mensalista ou uma avaria, o painel ficava
 * "para trás" do app sem nada estar errado.
 */
const TABELAS_SINCRONIZADAS = [
  "tickets",
  "caixa_sessoes",
  "caixa_movimentos",
  "mensalidade_pagamentos",
  "avarias",
] as const;

export async function ultimaSincronizacao(
  patioId: string,
): Promise<string | null> {
  const supabase = await createClient();

  const consultasDados = TABELAS_SINCRONIZADAS.map((tabela) =>
    supabase
      .from(tabela)
      .select("sincronizado_em")
      .eq("patio_id", patioId)
      .not("sincronizado_em", "is", null)
      .order("sincronizado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );

  // Contato vivo do(s) aparelho(s) do pátio: o app bate um heartbeat a cada 60s
  // e carimba `ultimo_acesso`, MESMO com o pátio parado. Sem entrar aqui, a
  // "última sincronização" só avançava quando dado subia — o painel mostrava o
  // app "atrasado" enquanto ele estava conectado e em dia. É o mesmo carimbo
  // que o app agora exibe (o servidor devolve no /heartbeat), então batem.
  const consultaDispositivo = supabase
    .from("dispositivos")
    .select("ultimo_acesso")
    .eq("patio_id", patioId)
    .neq("status", "revogado")
    .not("ultimo_acesso", "is", null)
    .order("ultimo_acesso", { ascending: false })
    .limit(1)
    .maybeSingle();

  const consultas = await Promise.all([
    ...consultasDados,
    consultaDispositivo,
  ]);

  // Uma tabela que falhe (ex.: RLS) não pode zerar o resultado das outras.
  const datas = consultas
    .map((r) => {
      const d = r.data as
        | { sincronizado_em?: string; ultimo_acesso?: string }
        | null;
      return d?.sincronizado_em ?? d?.ultimo_acesso;
    })
    .filter((d): d is string => typeof d === "string");

  if (datas.length === 0) return null;
  // ISO-8601 UTC ordena lexicograficamente == cronologicamente.
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
