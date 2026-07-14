import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Mapa `operador_id → nome`.
 *
 * `tickets.operador_id` é join manual (sem FK — ver db/01-schema.sql:275), então
 * o PostgREST não consegue embutir o nome no select do ticket. Resolve-se com
 * esta consulta e um mapa em memória: a tabela é pequena (os operadores do
 * tenant) e a RLS já limita ao tenant do gestor.
 */
export async function mapaOperadores(): Promise<Record<string, string>> {
  const sb = await createClient();
  const { data } = await sb.from("operadores").select("id, nome");

  const mapa: Record<string, string> = {};
  for (const o of data ?? []) {
    if (typeof o.id === "string" && typeof o.nome === "string") {
      mapa[o.id] = o.nome;
    }
  }
  return mapa;
}

/**
 * Operador que VALIDOU a saída, para tickets fechados ANTES de existir a coluna
 * `tickets.operador_saida_id` — o histórico, que nasceu sem o dado.
 *
 * Deriva do caixa: o app, ao cobrar, cria um movimento com `ticket_id` na sessão
 * de caixa aberta, e a sessão sabe de quem é. Cobre só as saídas PAGAS: isenção
 * e mensalista não geram movimento. Ticket novo não precisa disto — vem com o
 * operador gravado.
 *
 * Devolve `ticket_id → nome`.
 */
export async function operadorSaidaPeloCaixa(
  ticketIds: string[],
): Promise<Record<string, string>> {
  if (ticketIds.length === 0) return {};
  const sb = await createClient();

  const { data: movs } = await sb
    .from("caixa_movimentos")
    .select("ticket_id, caixa_sessao_id")
    .in("ticket_id", ticketIds)
    .eq("tipo", "entrada");
  if (!movs?.length) return {};

  const sessoes = [
    ...new Set(
      movs
        .map((m) => m.caixa_sessao_id)
        .filter((s): s is string => typeof s === "string"),
    ),
  ];
  const { data: caixas } = await sb
    .from("caixa_sessoes")
    .select("id, operador_nome")
    .in("id", sessoes);

  const nomePorSessao = new Map<string, string>();
  for (const c of caixas ?? []) {
    if (typeof c.id === "string" && typeof c.operador_nome === "string") {
      nomePorSessao.set(c.id, c.operador_nome);
    }
  }

  const porTicket: Record<string, string> = {};
  for (const m of movs) {
    const nome = m.caixa_sessao_id
      ? nomePorSessao.get(m.caixa_sessao_id)
      : undefined;
    if (typeof m.ticket_id === "string" && nome) porTicket[m.ticket_id] = nome;
  }
  return porTicket;
}
