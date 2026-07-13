"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { soDigitos, cnpjValido } from "@/lib/cnpj";

export type Resultado = { ok: boolean; msg: string } | null;

/**
 * Edita os dados da rede (tenant): nome, razão social e CNPJ. Roda com a SESSÃO
 * do gestor — a policy tenant_self_update isola a própria linha (sem service_role).
 * CNPJ é validado (DV) e persistido só com dígitos.
 */
export async function atualizarRede(input: {
  nome: string;
  razaoSocial: string | null;
  cnpj: string | null;
}): Promise<Resultado> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const tenantId = (user?.app_metadata as { tenant_id?: string })?.tenant_id;
  if (!user || !tenantId)
    return { ok: false, msg: "Sessão sem rede vinculada." };

  const nome = input.nome.trim();
  if (nome.length < 2) return { ok: false, msg: "Informe o nome da rede." };

  const cnpjDigitos = input.cnpj ? soDigitos(input.cnpj) : "";
  if (cnpjDigitos && !cnpjValido(cnpjDigitos))
    return { ok: false, msg: "CNPJ inválido — confira os dígitos." };

  const { error } = await sb
    .from("tenants")
    .update({
      nome,
      razao_social: input.razaoSocial?.trim() || null,
      cnpj: cnpjDigitos || null,
    })
    .eq("id", tenantId);
  if (error)
    return { ok: false, msg: "Não foi possível salvar os dados da rede." };

  await registrarAuditoria({
    modulo: "config",
    acao: "alterou",
    descricao: `Atualizou os dados da rede ("${nome}")`,
    dados: {
      nome,
      razao_social: input.razaoSocial?.trim() || null,
      cnpj: cnpjDigitos || null,
    },
  });

  revalidatePath("/painel/configuracoes");
  return { ok: true, msg: "Dados da rede atualizados." };
}

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
