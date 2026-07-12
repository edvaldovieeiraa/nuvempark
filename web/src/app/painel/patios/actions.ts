"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Resultado = { ok: boolean; msg: string } | null;

async function tenantDoGestor() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return {
    sb,
    tenantId: (user?.app_metadata as { tenant_id?: string })?.tenant_id,
  };
}

export async function criarPatio(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await tenantDoGestor();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const nome = String(formData.get("nome") || "").trim();
  const codigo = String(formData.get("codigo") || "").trim() || null;
  const qtdVagas = Number(formData.get("qtd_vagas") || 0);
  if (!nome) return { ok: false, msg: "Informe o nome do pátio." };

  const { data: patio, error } = await sb
    .from("patios")
    .insert({ tenant_id: tenantId, nome, codigo, qtd_vagas: qtdVagas })
    .select("id")
    .single();
  if (error || !patio)
    return { ok: false, msg: "Não foi possível criar o pátio." };

  // Config default do pátio (cupom, tipos de veículo, formas de pagamento)
  await sb.from("patio_config").insert({
    patio_id: patio.id,
    tenant_id: tenantId,
    patio_ativo: true,
    ticket_cabecalho: [nome],
  });

  revalidatePath("/painel/patios");
  return { ok: true, msg: `Pátio "${nome}" criado.` };
}

export async function atualizarPatio(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb } = await tenantDoGestor();
  const id = String(formData.get("id"));
  const nome = String(formData.get("nome") || "").trim();
  if (!nome) return { ok: false, msg: "Informe o nome do pátio." };

  const { error } = await sb
    .from("patios")
    .update({
      nome,
      codigo: String(formData.get("codigo") || "").trim() || null,
      qtd_vagas: Number(formData.get("qtd_vagas") || 0),
    })
    .eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível salvar." };

  revalidatePath("/painel/patios");
  return { ok: true, msg: "Pátio atualizado." };
}

export async function alternarAtivoPatio(
  id: string,
  ativoAtual: boolean,
): Promise<Resultado> {
  const { sb } = await tenantDoGestor();
  const { error } = await sb
    .from("patios")
    .update({ ativo: !ativoAtual })
    .eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível alterar o status." };
  revalidatePath("/painel/patios");
  return {
    ok: true,
    msg: ativoAtual ? "Pátio desativado." : "Pátio reativado.",
  };
}

export async function salvarCupom(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await tenantDoGestor();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const patioId = String(formData.get("patio_id"));
  const linhas = (v: unknown) =>
    String(v || "")
      .split(/\r?\n/)
      .map((l) => l.trim().slice(0, 48))
      .filter(Boolean)
      .slice(0, 4);

  const cabecalho = linhas(formData.get("cabecalho"));
  const rodape = linhas(formData.get("rodape"));

  const { error } = await sb
    .from("patio_config")
    .upsert(
      {
        patio_id: patioId,
        tenant_id: tenantId,
        ticket_cabecalho: cabecalho,
        ticket_rodape: rodape,
      },
      { onConflict: "patio_id" },
    );
  if (error) return { ok: false, msg: "Não foi possível salvar o cupom." };

  revalidatePath("/painel/patios");
  return { ok: true, msg: "Cupom do pátio atualizado." };
}
