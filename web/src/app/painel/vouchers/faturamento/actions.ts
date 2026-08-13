"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

export type Resultado = { ok: boolean; msg: string } | null;

const POR_CODIGO: Record<string, string> = {
  NPV10: "Competência inválida.",
  NPV11: "Parceiro não encontrado.",
  NPV12: "Este mês ainda não terminou — só dá para fechar depois do último dia.",
};

/**
 * Fecha a competência de um parceiro.
 *
 * A função do banco é idempotente: chamada duas vezes devolve a MESMA linha,
 * sem recalcular nem duplicar. Isso é decisão de db/35 e não daqui — um duplo
 * clique não pode emitir duas cobranças, e um erro obrigaria esta tela a
 * distinguir "falhou" de "já estava feito".
 */
export async function fecharCompetencia(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const parceiroId = String(formData.get("parceiro_id") ?? "");
  const competencia = String(formData.get("competencia") ?? "");
  if (!parceiroId || !competencia) {
    return { ok: false, msg: "Parceiro ou competência não informados." };
  }

  const sb = await createClient();
  const { error } = await sb.rpc("fechar_competencia", {
    p_parceiro_id: parceiroId,
    p_competencia: competencia,
  });

  if (error) {
    return {
      ok: false,
      msg: POR_CODIGO[error.code ?? ""] ?? "Não foi possível fechar.",
    };
  }

  await registrarAuditoria({
    modulo: "vouchers",
    acao: "fechar_competencia",
    descricao: `Competência ${competencia} fechada.`,
    dados: { parceiroId, competencia },
  });

  revalidatePath("/painel/vouchers/faturamento");
  return { ok: true, msg: `Competência ${competencia} fechada.` };
}
