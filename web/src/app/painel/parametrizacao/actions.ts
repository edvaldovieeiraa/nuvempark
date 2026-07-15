"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MODOS = ["ativada", "operador", "desativada"] as const;
type ModoFoto = (typeof MODOS)[number];

/**
 * Salva a parametrização do pátio (foto no recibo + modo quiosque).
 * A RLS do gestor garante que só pátios do próprio tenant são afetados.
 */
export async function salvarParametrizacao(
  patioId: string,
  fotoReciboModo: string,
  modoQuiosque: boolean,
) {
  if (!MODOS.includes(fotoReciboModo as ModoFoto)) {
    return { ok: false as const, erro: "Modo inválido." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("patios")
    .update({
      foto_recibo_modo: fotoReciboModo,
      modo_quiosque: modoQuiosque,
    })
    .eq("id", patioId);

  if (error) {
    return { ok: false as const, erro: "Não foi possível salvar." };
  }
  revalidatePath("/painel/parametrizacao");
  return { ok: true as const };
}
