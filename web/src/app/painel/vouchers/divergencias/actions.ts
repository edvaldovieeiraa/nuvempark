"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

export type Resultado = { ok: boolean; msg: string } | null;

/**
 * Cancela a liberação e devolve a cota ao parceiro.
 *
 * É a saída para a divergência: o carro saiu sem o desconto ser aplicado (a
 * saída aconteceu offline, ou antes da liberação chegar ao aparelho). O
 * cliente já pagou cheio e isso não se desfaz daqui — o que dá para consertar
 * é a contabilidade: a liberação não fica pendurada consumindo cota nem entra
 * na fatura do parceiro por um desconto que ninguém deu.
 *
 * `cancelar_liberacao` é SECURITY INVOKER (db/34): passa pela policy de UPDATE
 * do gestor, que escopa por tenant. A ação não precisa conferir isso à mão.
 */
export async function cancelarDivergencia(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const id = String(formData.get("liberacao_id") ?? "");
  const motivo =
    String(formData.get("motivo") ?? "").trim() ||
    "Saída registrada sem o desconto aplicado.";

  if (!id) return { ok: false, msg: "Liberação não informada." };

  const sb = await createClient();
  const { error } = await sb.rpc("cancelar_liberacao", {
    p_liberacao_id: id,
    p_motivo: motivo,
  });

  if (error) {
    return {
      ok: false,
      msg:
        error.code === "NPV06"
          ? "Esta liberação já havia sido cancelada."
          : "Não foi possível cancelar.",
    };
  }

  await registrarAuditoria({
    modulo: "vouchers",
    acao: "cancelar_liberacao",
    descricao: `Liberação cancelada por divergência: ${motivo}`,
    dados: { liberacaoId: id, motivo },
  });

  revalidatePath("/painel/vouchers/divergencias");
  return { ok: true, msg: "Liberação cancelada e cota devolvida." };
}
