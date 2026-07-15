"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MODOS = ["ativada", "operador", "desativada"] as const;
type ModoFoto = (typeof MODOS)[number];

/**
 * Salva o modo de impressão da foto do veículo no recibo, por pátio.
 * A RLS do gestor garante que só pátios do próprio tenant são afetados.
 */
export async function salvarFotoReciboModo(patioId: string, modo: string) {
  if (!MODOS.includes(modo as ModoFoto)) {
    return { ok: false as const, erro: "Modo inválido." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("patios")
    .update({ foto_recibo_modo: modo })
    .eq("id", patioId);

  if (error) {
    return { ok: false as const, erro: "Não foi possível salvar." };
  }
  revalidatePath("/painel/parametrizacao");
  return { ok: true as const };
}
