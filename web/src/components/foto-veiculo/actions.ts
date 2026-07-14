"use server";

import { createClient } from "@/lib/supabase/server";
import { BUCKET_ENTRADAS } from "@/lib/fotos";

export type DetalheTicket = {
  fotoEntrada: string | null;
  avarias: {
    id: string;
    descricao: string;
    criadoEm: string;
    fotos: string[]; // URLs assinadas
  }[];
};

const TTL = 3600; // 1h

/**
 * Carrega o detalhe de um ticket para o modal: a foto de entrada e as
 * avarias, todas com URLs assinadas (bucket privado). RLS garante que só
 * volta o que é do tenant do gestor.
 */
export async function detalheTicket(
  ticketId: string,
  fotoEntradaPath: string | null,
): Promise<DetalheTicket> {
  const sb = await createClient();

  async function assinar(path: string | null): Promise<string | null> {
    if (!path) return null;
    const { data } = await sb.storage
      .from(BUCKET_ENTRADAS)
      .createSignedUrl(path, TTL);
    return data?.signedUrl ?? null;
  }

  const [fotoEntrada, { data: avarias }] = await Promise.all([
    assinar(fotoEntradaPath),
    sb
      .from("avarias")
      .select("id, descricao, criado_em, fotos")
      .eq("ticket_id", ticketId)
      .order("criado_em", { ascending: true }),
  ]);

  const avariasComUrl = await Promise.all(
    (avarias ?? []).map(async (a) => {
      const paths = Array.isArray(a.fotos) ? (a.fotos as string[]) : [];
      const fotos = (await Promise.all(paths.map((p) => assinar(p)))).filter(
        (u): u is string => Boolean(u),
      );
      return {
        id: a.id,
        descricao: a.descricao,
        criadoEm: a.criado_em,
        fotos,
      };
    }),
  );

  return { fotoEntrada, avarias: avariasComUrl };
}
