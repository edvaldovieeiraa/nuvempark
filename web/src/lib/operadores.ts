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
