"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

export type Resultado = { ok: boolean; msg: string } | null;

export async function alternarDispositivo(
  id: string,
  statusAtual: string,
): Promise<Resultado> {
  const sb = await createClient();
  const novo = statusAtual === "ativo" ? "revogado" : "ativo";

  const { data: antes } = await sb
    .from("dispositivos")
    .select("nome, device_uuid, patio_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb
    .from("dispositivos")
    .update({ status: novo })
    .eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível alterar o dispositivo." };

  const rotulo =
    (antes?.nome as string | undefined) ||
    (antes?.device_uuid ? `dispositivo ${String(antes.device_uuid).slice(0, 8)}` : "dispositivo");
  await registrarAuditoria({
    modulo: "config",
    acao: "alterou",
    patioId: (antes?.patio_id as string | undefined) ?? null,
    descricao: `${novo === "revogado" ? "Revogou" : "Reativou"} o ${rotulo}`,
    dados: { id, status: novo },
  });

  revalidatePath("/painel/configuracoes");
  return {
    ok: true,
    msg:
      novo === "revogado"
        ? "Dispositivo revogado — perde o acesso no próximo sync."
        : "Dispositivo reativado.",
  };
}
