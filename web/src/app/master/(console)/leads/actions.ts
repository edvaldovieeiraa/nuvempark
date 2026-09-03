"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessaoMasterAtiva } from "@/lib/master-auth";

export type Resultado = { ok: true; msg: string } | { ok: false; msg: string } | null;

export const STATUS_LEAD = ["novo", "em_contato", "ganho", "perdido"] as const;
export type StatusLead = (typeof STATUS_LEAD)[number];

/**
 * Trilha comercial dos leads do site (db/39).
 *
 * Tudo aqui roda com service_role, então CADA action revalida a sessão master
 * antes de tocar no banco — uma server action é um endpoint HTTP como qualquer
 * outro, e o layout ter checado a sessão não protege a action.
 */

/**
 * Muda o estágio do lead. Sair de 'novo' carimba `atendido_em` na primeira vez
 * — é o dado que responde "quanto tempo o lead esperou", e por isso não é
 * sobrescrito quando o lead volta a mudar de estágio depois.
 */
export async function mudarStatusLead(
  id: string,
  status: StatusLead,
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };
  if (!STATUS_LEAD.includes(status))
    return { ok: false, msg: "Estágio inválido." };

  const sb = createAdminClient();

  const { data: atual } = await sb
    .from("leads_site")
    .select("atendido_em")
    .eq("id", id)
    .maybeSingle();

  const patch: Record<string, unknown> = { status };
  if (status !== "novo" && !(atual as { atendido_em?: string | null } | null)?.atendido_em) {
    patch.atendido_em = new Date().toISOString();
  }

  const { error } = await sb.from("leads_site").update(patch).eq("id", id);
  if (error) {
    console.error("[master/leads] mudarStatus:", error.message);
    return { ok: false, msg: "Não foi possível mudar o estágio." };
  }

  revalidatePath("/master/leads");
  const rotulo: Record<StatusLead, string> = {
    novo: "de volta para novos",
    em_contato: "marcado como em contato",
    ganho: "marcado como ganho",
    perdido: "marcado como perdido",
  };
  return { ok: true, msg: `Lead ${rotulo[status]}.` };
}

/** Anotação interna do comercial. Vazio apaga a observação. */
export async function salvarObservacaoLead(
  id: string,
  texto: string,
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const limpo = texto.trim().slice(0, 2000);
  const sb = createAdminClient();
  const { error } = await sb
    .from("leads_site")
    .update({ observacao: limpo || null })
    .eq("id", id);

  if (error) {
    console.error("[master/leads] salvarObservacao:", error.message);
    return { ok: false, msg: "Não foi possível salvar a observação." };
  }

  revalidatePath("/master/leads");
  return { ok: true, msg: limpo ? "Observação salva." : "Observação removida." };
}

/**
 * Apaga o lead de vez. Existe para spam que passou pelo honeypot — não é o
 * caminho de "não deu certo", que é o estágio 'perdido' (aquele preserva o
 * histórico e conta na taxa de conversão).
 */
export async function excluirLead(id: string): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();
  const { error } = await sb.from("leads_site").delete().eq("id", id);
  if (error) {
    console.error("[master/leads] excluir:", error.message);
    return { ok: false, msg: "Não foi possível excluir." };
  }

  revalidatePath("/master/leads");
  return { ok: true, msg: "Lead excluído." };
}
