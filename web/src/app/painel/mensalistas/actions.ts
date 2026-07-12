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

export async function criarPlano(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await tenantDoGestor();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const nome = String(formData.get("nome") || "").trim();
  if (!nome) return { ok: false, msg: "Informe o nome do plano." };

  const { error } = await sb.from("planos").insert({
    tenant_id: tenantId,
    patio_id: String(formData.get("patio_id")),
    nome,
    tipo: String(formData.get("tipo") || "mensalista"),
  });
  if (error) return { ok: false, msg: "Não foi possível criar o plano." };

  revalidatePath("/painel/mensalistas");
  return { ok: true, msg: `Plano "${nome}" criado.` };
}

export async function desativarPlano(id: string): Promise<Resultado> {
  const { sb } = await tenantDoGestor();
  const { error } = await sb
    .from("planos")
    .update({ ativo: false })
    .eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível desativar o plano." };
  revalidatePath("/painel/mensalistas");
  return { ok: true, msg: "Plano desativado." };
}

export async function criarCliente(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await tenantDoGestor();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const nome = String(formData.get("nome") || "").trim();
  const patioId = String(formData.get("patio_id"));
  const placa = String(formData.get("placa") || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!nome) return { ok: false, msg: "Informe o nome do cliente." };

  const { data: cliente, error } = await sb
    .from("clientes")
    .insert({
      tenant_id: tenantId,
      patio_id: patioId,
      plano_id: String(formData.get("plano_id") || "") || null,
      nome,
      documento: String(formData.get("documento") || "").trim() || null,
      telefone: String(formData.get("telefone") || "").trim() || null,
      vencimento: String(formData.get("vencimento") || "") || null,
      vagas: Number(formData.get("vagas") || 1),
    })
    .select("id")
    .single();
  if (error || !cliente)
    return { ok: false, msg: "Não foi possível criar o cliente." };

  if (placa) {
    const { error: erroVeic } = await sb.from("cliente_veiculos").insert({
      cliente_id: cliente.id,
      patio_id: patioId,
      tenant_id: tenantId,
      placa,
    });
    if (erroVeic)
      return {
        ok: false,
        msg:
          erroVeic.code === "23505"
            ? `Cliente criado, mas a placa ${placa} já está cadastrada neste pátio.`
            : "Cliente criado, mas falhou o cadastro da placa.",
      };
  }

  revalidatePath("/painel/mensalistas");
  return { ok: true, msg: `Cliente ${nome} cadastrado.` };
}

export async function alternarBloqueio(
  id: string,
  bloqueadoAtual: boolean,
): Promise<Resultado> {
  const { sb } = await tenantDoGestor();
  const { error } = await sb
    .from("clientes")
    .update({ bloqueado: !bloqueadoAtual })
    .eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível alterar o bloqueio." };
  revalidatePath("/painel/mensalistas");
  return {
    ok: true,
    msg: bloqueadoAtual
      ? "Cliente desbloqueado — volta a ter livre passagem."
      : "Cliente bloqueado — o app passa a cobrar normalmente.",
  };
}

export async function adicionarVeiculo(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { sb, tenantId } = await tenantDoGestor();
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const placa = String(formData.get("placa") || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (placa.length < 7) return { ok: false, msg: "Placa inválida." };

  const { error } = await sb.from("cliente_veiculos").insert({
    cliente_id: String(formData.get("cliente_id")),
    patio_id: String(formData.get("patio_id")),
    tenant_id: tenantId,
    placa,
    descricao: String(formData.get("descricao") || "").trim() || null,
  });
  if (error)
    return {
      ok: false,
      msg:
        error.code === "23505"
          ? `A placa ${placa} já está cadastrada neste pátio.`
          : "Não foi possível adicionar o veículo.",
    };

  revalidatePath("/painel/mensalistas");
  return { ok: true, msg: `Placa ${placa} adicionada.` };
}

export async function removerVeiculo(id: string): Promise<Resultado> {
  const { sb } = await tenantDoGestor();
  const { error } = await sb.from("cliente_veiculos").delete().eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível remover o veículo." };
  revalidatePath("/painel/mensalistas");
  return { ok: true, msg: "Veículo removido." };
}
