"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { descreverRegra } from "@/lib/vouchers/calculo";

export type Resultado = { ok: boolean; msg: string } | null;

/**
 * Os três números de uma regra, lidos do formulário.
 *
 * O formulário oferece atalhos ("2 horas", "isenção total"), mas eles só
 * PREENCHEM estes campos — não existe tipo de regra no banco. Foi o que
 * permitiu cobrir os quatro casos do negócio sem uma linguagem de regras, e
 * reintroduzir um campo "tipo" aqui desfaria isso em silêncio.
 */
function lerNumeros(formData: FormData) {
  const inteiro = (k: string) => {
    const n = Number(String(formData.get(k) ?? "0").replace(",", "."));
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  };
  const decimal = (k: string) => {
    const n = Number(String(formData.get(k) ?? "0").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    abater_minutos: inteiro("abater_minutos"),
    desconto_percentual: inteiro("desconto_percentual"),
    desconto_valor: decimal("desconto_valor"),
  };
}

/**
 * Espelha as constraints de `db/31` para dar mensagem em português em vez de
 * deixar o Postgres responder com o nome da constraint. O banco continua sendo
 * a garantia — isto é cortesia com quem está preenchendo o formulário.
 */
function validar(v: ReturnType<typeof lerNumeros>): string | null {
  if (!v.nome) return "Dê um nome à regra.";
  if (v.abater_minutos < 0) return "O tempo abatido não pode ser negativo.";
  if (v.desconto_percentual < 0 || v.desconto_percentual > 100) {
    return "O desconto percentual vai de 0 a 100.";
  }
  if (v.desconto_valor < 0) return "O abatimento em reais não pode ser negativo.";
  if (
    v.abater_minutos === 0 &&
    v.desconto_percentual === 0 &&
    v.desconto_valor === 0
  ) {
    return "Esta regra não desconta nada — preencha ao menos um dos três campos.";
  }
  return null;
}

async function contexto() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const tenantId = (user?.app_metadata as { tenant_id?: string })?.tenant_id;
  return { sb, tenantId };
}

export async function criarRegra(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await contexto();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const patioId = String(formData.get("patio_id") ?? "");
  if (!patioId) return { ok: false, msg: "Pátio não informado." };

  const valores = lerNumeros(formData);
  const erro = validar(valores);
  if (erro) return { ok: false, msg: erro };

  const { error } = await sb
    .from("voucher_regras")
    .insert({ ...valores, patio_id: patioId, tenant_id: tenantId });

  if (error) {
    // A mensagem ao gestor é genérica; o motivo real (constraint, RLS, tabela
    // ausente) só existe aqui. Sem este log o erro some e não há o que olhar.
    console.error("[painel/vouchers] criarRegra:", error);
    return { ok: false, msg: "Não foi possível criar a regra." };
  }

  await registrarAuditoria({
    modulo: "vouchers",
    acao: "criar_regra",
    descricao: `Regra "${valores.nome}" criada (${descreverRegra(valores)}).`,
    dados: valores,
    patioId,
  });

  revalidatePath("/painel/vouchers/regras");
  return { ok: true, msg: `Regra "${valores.nome}" criada.` };
}

export async function salvarRegra(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await contexto();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, msg: "Regra não informada." };

  const valores = lerNumeros(formData);
  const erro = validar(valores);
  if (erro) return { ok: false, msg: erro };

  const { error } = await sb.from("voucher_regras").update(valores).eq("id", id);
  if (error) {
    console.error("[painel/vouchers] salvarRegra:", error);
    return { ok: false, msg: "Não foi possível salvar a regra." };
  }

  await registrarAuditoria({
    modulo: "vouchers",
    acao: "editar_regra",
    descricao: `Regra "${valores.nome}" alterada (${descreverRegra(valores)}).`,
    dados: { id, ...valores },
    patioId: String(formData.get("patio_id") ?? "") || null,
  });

  revalidatePath("/painel/vouchers/regras");
  return { ok: true, msg: "Regra salva." };
}

/**
 * Desativa em vez de apagar.
 *
 * As liberações já feitas apontam para a regra, e o extrato do parceiro
 * precisa continuar dizendo QUAL regra gerou cada abatimento — inclusive numa
 * competência já fechada. Apagar levaria o histórico junto.
 */
export async function alternarRegra(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await contexto();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const id = String(formData.get("id") ?? "");
  const ativo = String(formData.get("ativo") ?? "") === "true";
  if (!id) return { ok: false, msg: "Regra não informada." };

  const { error } = await sb
    .from("voucher_regras")
    .update({ ativo: !ativo })
    .eq("id", id);
  if (error) {
    console.error("[painel/vouchers] alternarRegra:", error);
    return { ok: false, msg: "Não foi possível alterar a regra." };
  }

  await registrarAuditoria({
    modulo: "vouchers",
    acao: ativo ? "desativar_regra" : "reativar_regra",
    descricao: `Regra ${ativo ? "desativada" : "reativada"}.`,
    dados: { id },
    patioId: String(formData.get("patio_id") ?? "") || null,
  });

  revalidatePath("/painel/vouchers/regras");
  return { ok: true, msg: ativo ? "Regra desativada." : "Regra reativada." };
}
