"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Resultado = { ok: boolean; msg: string } | null;

export async function criarTarifa(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const tenantId = (user?.app_metadata as { tenant_id?: string })?.tenant_id;
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const num = (k: string) => Number(String(formData.get(k)).replace(",", "."));
  const nome = String(formData.get("nome") || "Padrão");

  const { error } = await sb.from("tarifas").insert({
    tenant_id: tenantId,
    patio_id: String(formData.get("patio_id")),
    nome,
    tipo_veiculo: String(formData.get("tipo_veiculo") || "carro"),
    fracao_inicial_minutos: num("fracao_inicial_minutos"),
    fracao_inicial_valor: num("fracao_inicial_valor"),
    fracao_adicional_minutos: num("fracao_adicional_minutos"),
    fracao_adicional_valor: num("fracao_adicional_valor"),
    teto_diaria: num("teto_diaria"),
    tolerancia_minutos: num("tolerancia_minutos"),
    pernoite_valor: num("pernoite_valor"),
    pernoite_hora_inicio: num("pernoite_hora_inicio"),
    pernoite_hora_fim: num("pernoite_hora_fim"),
  });

  if (error) return { ok: false, msg: "Não foi possível criar a tarifa." };
  revalidatePath("/painel/tarifas");
  return { ok: true, msg: `Tarifa "${nome}" criada com sucesso.` };
}

export async function atualizarTarifa(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const sb = await createClient();
  const num = (k: string) => Number(String(formData.get(k)).replace(",", "."));
  const nome = String(formData.get("nome") || "Padrão");

  const { error } = await sb
    .from("tarifas")
    .update({
      nome,
      tipo_veiculo: String(formData.get("tipo_veiculo") || "carro"),
      fracao_inicial_minutos: num("fracao_inicial_minutos"),
      fracao_inicial_valor: num("fracao_inicial_valor"),
      fracao_adicional_minutos: num("fracao_adicional_minutos"),
      fracao_adicional_valor: num("fracao_adicional_valor"),
      teto_diaria: num("teto_diaria"),
      tolerancia_minutos: num("tolerancia_minutos"),
      pernoite_valor: num("pernoite_valor"),
      pernoite_hora_inicio: num("pernoite_hora_inicio"),
      pernoite_hora_fim: num("pernoite_hora_fim"),
    })
    .eq("id", String(formData.get("id")));

  if (error) return { ok: false, msg: "Não foi possível salvar a tarifa." };
  revalidatePath("/painel/tarifas");
  return { ok: true, msg: `Tarifa "${nome}" atualizada — vale já na próxima cobrança do app.` };
}

/**
 * Salva a nova ordem das tarifas (a ordem que o app mostra os chips e o app
 * pré-seleciona a primeira). Recebe os ids na ordem desejada.
 */
export async function reordenarTarifas(ids: string[]): Promise<Resultado> {
  const sb = await createClient();
  // Uma escrita por tarifa — poucas por pátio, custo desprezível.
  const updates = await Promise.all(
    ids.map((id, i) =>
      sb.from("tarifas").update({ ordem: i }).eq("id", id),
    ),
  );
  if (updates.some((u) => u.error))
    return { ok: false, msg: "Não foi possível salvar a ordem." };
  revalidatePath("/painel/tarifas");
  return { ok: true, msg: "Ordem das tarifas atualizada." };
}

export async function desativarTarifa(id: string): Promise<Resultado> {
  const sb = await createClient();
  const { error } = await sb
    .from("tarifas")
    .update({ ativo: false })
    .eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível desativar." };
  revalidatePath("/painel/tarifas");
  return { ok: true, msg: "Tarifa desativada." };
}
