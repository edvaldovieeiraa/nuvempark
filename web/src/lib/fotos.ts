import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Bucket PRIVADO das fotos de entrada e de avaria. */
export const BUCKET_ENTRADAS = "nuvempark-entradas";

/** 1h — a lista é recarregada com frequência. */
const TTL = 3600;

type TicketComFoto = { id: string; foto_entrada_path: string | null };

/**
 * Assina EM LOTE as fotos de entrada de uma lista de tickets: uma única
 * chamada ao Storage por carregamento de página, não uma por linha.
 *
 * Usa a sessão do gestor (nunca service_role) — as policies do bucket
 * (fn_storage_patio_do_tenant) fazem o isolamento por tenant.
 *
 * Devolve um mapa `ticket.id → signedUrl`. Ticket sem foto, ou cuja assinatura
 * falhou, simplesmente não entra no mapa (a UI cai no placeholder).
 */
export async function assinarFotosEntrada(
  tickets: TicketComFoto[],
): Promise<Record<string, string>> {
  const caminhos = [
    ...new Set(
      tickets
        .map((t) => t.foto_entrada_path)
        .filter((p): p is string => Boolean(p)),
    ),
  ];
  if (caminhos.length === 0) return {};

  const sb = await createClient();
  const { data, error } = await sb.storage
    .from(BUCKET_ENTRADAS)
    .createSignedUrls(caminhos, TTL);
  if (error || !data) return {};

  const porCaminho = new Map<string, string>();
  for (const item of data) {
    // Item com `error` != null = caminho que não assinou (arquivo ausente,
    // upload da foto ainda pendente no app). Trata como "sem foto".
    if (item.error || !item.path || !item.signedUrl) continue;
    porCaminho.set(item.path, item.signedUrl);
  }

  const porTicket: Record<string, string> = {};
  for (const t of tickets) {
    const url = t.foto_entrada_path
      ? porCaminho.get(t.foto_entrada_path)
      : undefined;
    if (url) porTicket[t.id] = url;
  }
  return porTicket;
}
