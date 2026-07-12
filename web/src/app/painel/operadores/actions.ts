"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

export type Resultado = { ok: boolean; msg: string } | null;

export async function criarOperador(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const tenantId = (user?.app_metadata as { tenant_id?: string })?.tenant_id;
  if (!tenantId) return { ok: false, msg: "Sessão sem rede vinculada." };

  const nome = String(formData.get("nome") || "").trim();
  const usuario = String(formData.get("usuario") || "").trim().toUpperCase();
  const senha = String(formData.get("senha") || "");
  const patioId = String(formData.get("patio_id") || "");

  if (!nome || !usuario)
    return { ok: false, msg: "Preencha nome e usuário." };
  if (senha.length < 6)
    return { ok: false, msg: "A senha precisa de pelo menos 6 caracteres." };
  if (!patioId)
    return { ok: false, msg: "Pátio não identificado." };

  const senhaHash = bcrypt.hashSync(senha, 10);

  const { data: op, error } = await sb
    .from("operadores")
    .insert({ tenant_id: tenantId, nome, usuario, senha_hash: senhaHash })
    .select("id")
    .single();
  if (error || !op)
    return {
      ok: false,
      msg: error?.code === "23505"
        ? `Já existe um operador com o usuário ${usuario}.`
        : "Não foi possível criar o operador.",
    };

  const { error: erroVinculo } = await sb.from("operador_patios").insert({
    operador_id: op.id,
    patio_id: patioId,
    tenant_id: tenantId,
  });
  if (erroVinculo)
    return { ok: false, msg: "Operador criado, mas falhou o vínculo com o pátio." };

  // Auditoria — NUNCA loga a senha/hash, só o fato.
  await registrarAuditoria({
    modulo: "operadores",
    acao: "criou",
    patioId: null, // operador é da rede (tenant), vinculado a pátios
    descricao: `Criou o operador "${nome}" (login ${usuario}) com acesso a 1 pátio`,
    dados: { usuario, nome, patio_id: patioId },
  });

  revalidatePath("/painel/operadores");
  return { ok: true, msg: `Operador ${nome} criado. Login: ${usuario}.` };
}

export async function alternarAtivo(
  id: string,
  ativoAtual: boolean,
): Promise<Resultado> {
  const sb = await createClient();
  const { data: antes } = await sb
    .from("operadores")
    .select("nome, usuario")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb
    .from("operadores")
    .update({ ativo: !ativoAtual })
    .eq("id", id);
  if (error) return { ok: false, msg: "Não foi possível alterar o status." };

  await registrarAuditoria({
    modulo: "operadores",
    acao: "alterou",
    patioId: null,
    descricao: `${ativoAtual ? "Desativou" : "Reativou"} o operador "${antes?.nome ?? "?"}" (login ${antes?.usuario ?? "?"})`,
    dados: { id, ativo: !ativoAtual },
  });

  revalidatePath("/painel/operadores");
  return {
    ok: true,
    msg: ativoAtual ? "Operador desativado." : "Operador reativado.",
  };
}
