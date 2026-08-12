"use server";

import { revalidatePath } from "next/cache";
import { registrarAuditoria } from "@/lib/auditoria";
import {
  criarUsuarioParceiro,
  removerUsuarioParceiro,
} from "@/lib/vouchers/usuario-parceiro";

/**
 * A senha volta no resultado de propósito.
 *
 * Foi a decisão de produto: o gestor define e repassa, como já acontece com
 * operador. Ela NÃO é recuperável depois — o Supabase guarda só o hash —, então
 * esta é a única vez que alguém vai vê-la. A tela precisa deixar isso explícito
 * em vez de mostrar e sumir.
 */
export type Resultado =
  | { ok: true; msg: string; credencial?: { email: string; senha: string } }
  | { ok: false; msg: string }
  | null;

export async function criarAcesso(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const parceiroId = String(formData.get("parceiro_id") ?? "");
  const email = String(formData.get("email") ?? "");
  const nome = String(formData.get("nome") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const r = await criarUsuarioParceiro({ parceiroId, email, nome, senha });
  if (!r.ok) return { ok: false, msg: r.msg };

  await registrarAuditoria({
    modulo: "vouchers",
    acao: "criar_acesso_parceiro",
    // A senha NÃO entra na auditoria. O registro serve para saber que um acesso
    // foi criado e por quem, não para reconstituir a credencial.
    descricao: `Acesso criado para ${email}.`,
    dados: { parceiroId, email, nome },
  });

  revalidatePath(`/painel/vouchers/parceiros/${parceiroId}`);
  return {
    ok: true,
    msg: "Acesso criado.",
    credencial: { email: email.trim().toLowerCase(), senha },
  };
}

export async function removerAcesso(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const usuarioId = String(formData.get("usuario_id") ?? "");
  const parceiroId = String(formData.get("parceiro_id") ?? "");

  const r = await removerUsuarioParceiro(usuarioId);
  if (!r.ok) return { ok: false, msg: r.msg };

  await registrarAuditoria({
    modulo: "vouchers",
    acao: "remover_acesso_parceiro",
    descricao: `Acesso de parceiro removido.`,
    dados: { usuarioId, parceiroId },
  });

  revalidatePath(`/painel/vouchers/parceiros/${parceiroId}`);
  return { ok: true, msg: r.msg };
}
