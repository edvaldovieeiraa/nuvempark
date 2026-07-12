"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Resultado = { ok: boolean; msg: string } | null;

export async function alternarDispositivo(
  id: string,
  statusAtual: string,
): Promise<Resultado> {
  const sb = await createClient();
  const novo = statusAtual === "ativo" ? "revogado" : "ativo";
  const { error } = await sb
    .from("dispositivos")
    .update({ status: novo })
    .eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível alterar o dispositivo." };
  revalidatePath("/painel/configuracoes");
  return {
    ok: true,
    msg:
      novo === "revogado"
        ? "Dispositivo revogado — perde o acesso no próximo sync."
        : "Dispositivo reativado.",
  };
}
