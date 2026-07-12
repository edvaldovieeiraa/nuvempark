"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessaoMasterAtiva } from "@/lib/master-auth";

export type Resultado =
  | { ok: true; msg: string; codigo?: string }
  | { ok: false; msg: string }
  | null;

/**
 * Cria uma rede completa: tenant (com código 4-díg gerado no banco) +
 * primeiro gestor (usuário Supabase Auth com app_metadata.tenant_id) +
 * assinatura. Tudo com service_role — exclusivo do console master.
 */
export async function criarTenant(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();

  const nome = String(formData.get("nome") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const senha = String(formData.get("senha") || "");
  const valor = Number(String(formData.get("valor_por_patio") || "0").replace(",", "."));

  if (!nome) return { ok: false, msg: "Informe o nome da rede." };
  if (!email.includes("@"))
    return { ok: false, msg: "Informe um e-mail válido para o gestor." };
  if (senha.length < 6)
    return { ok: false, msg: "A senha do gestor precisa de ao menos 6 caracteres." };

  // 1) Código único de 4 dígitos (função do banco).
  const { data: codigoData, error: erroCodigo } = await sb.rpc(
    "fn_gerar_codigo_tenant",
  );
  if (erroCodigo || !codigoData)
    return { ok: false, msg: "Não foi possível gerar o código da rede." };
  const codigo = String(codigoData);

  // 2) Tenant.
  const { data: tenant, error: erroTenant } = await sb
    .from("tenants")
    .insert({ nome, codigo })
    .select("id")
    .single();
  if (erroTenant || !tenant)
    return { ok: false, msg: "Não foi possível criar a rede." };

  // 3) Gestor (Supabase Auth). tenant_id vai em app_metadata → RLS do painel.
  const { error: erroUser } = await sb.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    app_metadata: { tenant_id: tenant.id },
  });
  if (erroUser) {
    // rollback do tenant para não deixar órfão
    await sb.from("tenants").delete().eq("id", tenant.id);
    return {
      ok: false,
      msg: erroUser.message.includes("already")
        ? `Já existe um usuário com o e-mail ${email}.`
        : "Não foi possível criar o gestor.",
    };
  }

  // 4) Assinatura.
  await sb.from("assinaturas").insert({
    tenant_id: tenant.id,
    valor_por_patio: valor,
    estado: "ativa",
  });

  revalidatePath("/master/tenants");
  return {
    ok: true,
    msg: `Rede "${nome}" criada. Código de acesso: ${codigo}.`,
    codigo,
  };
}

export async function mudarEstadoAssinatura(
  tenantId: string,
  novoEstado: "ativa" | "atrasada" | "suspensa",
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();
  const { error } = await sb
    .from("assinaturas")
    .update({ estado: novoEstado })
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, msg: "Não foi possível mudar o estado." };

  revalidatePath("/master/tenants");
  const rotulo = { ativa: "reativada", atrasada: "marcada como atrasada", suspensa: "suspensa" };
  return { ok: true, msg: `Assinatura ${rotulo[novoEstado]}.` };
}

/** Converte um trial (ou qualquer estado) em assinatura ativa. */
export async function ativarAssinatura(tenantId: string): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };
  const sb = createAdminClient();
  const { error } = await sb
    .from("assinaturas")
    .update({ estado: "ativa", trial_expira_em: null })
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, msg: "Não foi possível ativar." };
  revalidatePath("/master/tenants");
  revalidatePath("/master/financeiro");
  return { ok: true, msg: "Assinatura ativada." };
}

/** Estende o trial por mais N dias (default 15). */
export async function estenderTrial(
  tenantId: string,
  dias: number = 15,
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };
  const sb = createAdminClient();
  const nova = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  const { error } = await sb
    .from("assinaturas")
    .update({ estado: "trial", trial_expira_em: nova.toISOString() })
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, msg: "Não foi possível estender." };
  revalidatePath("/master/tenants");
  return { ok: true, msg: `Trial estendido por ${dias} dias.` };
}

export async function alternarTenantAtivo(
  tenantId: string,
  ativoAtual: boolean,
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();
  const { error } = await sb
    .from("tenants")
    .update({ ativo: !ativoAtual })
    .eq("id", tenantId);
  if (error) return { ok: false, msg: "Não foi possível alterar a rede." };

  revalidatePath("/master/tenants");
  return {
    ok: true,
    msg: ativoAtual ? "Rede desativada." : "Rede reativada.",
  };
}
