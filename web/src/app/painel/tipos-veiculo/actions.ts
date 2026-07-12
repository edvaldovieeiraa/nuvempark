"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Resultado = { ok: boolean; msg: string } | null;

/**
 * Salva a lista ORDENADA de tipos de veículo do pátio (patio_config.tipos_veiculo).
 * A ordem importa: o app do operador pré-seleciona o primeiro.
 */
export async function salvarTiposVeiculo(
  patioId: string,
  tipos: string[],
): Promise<Resultado> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const tenantId = (user?.app_metadata as { tenant_id?: string })?.tenant_id;
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const limpos = tipos
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    // remove duplicados preservando a primeira ocorrência
    .filter((t, i, arr) => arr.indexOf(t) === i);

  if (limpos.length === 0)
    return { ok: false, msg: "Mantenha pelo menos um tipo de veículo." };

  const { error } = await sb
    .from("patio_config")
    .upsert(
      { patio_id: patioId, tenant_id: tenantId, tipos_veiculo: limpos },
      { onConflict: "patio_id" },
    );
  if (error) return { ok: false, msg: "Não foi possível salvar." };

  revalidatePath("/painel/tipos-veiculo");
  revalidatePath("/painel/tarifas");
  return { ok: true, msg: "Tipos de veículo atualizados — o app recebe no próximo sync." };
}
