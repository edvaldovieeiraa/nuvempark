"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { enviarEmailExtraAtivado } from "@/lib/emails/dispositivos";
import { competenciaSeguinte } from "@/lib/dispositivos-gestor";

/**
 * Ações de dispositivo do GESTOR (self-service). SEMPRE via sessão do gestor
 * (RLS ativa) — NUNCA service_role. Existem só aqui, no painel web: nunca no
 * app do operador (senão o operador se autoriza sozinho).
 */

export type Resultado = { ok: true; msg: string } | { ok: false; msg: string } | null;

const ROTA = "/painel/dispositivos";
const UNIQUE_VIOLATION = "23505";

type Ctx = { sb: SupabaseClient; user: User; tenantId: string };

async function contexto(): Promise<Ctx | { erro: string }> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  const tenantId = (user.app_metadata as { tenant_id?: string })?.tenant_id;
  if (!tenantId) return { erro: "Conta sem rede associada." };
  return { sb, user, tenantId };
}

type DispCtx = {
  id: string;
  tenant_id: string;
  patio_id: string;
  device_uuid: string;
  status: string;
  licenca: string;
  apelido: string | null;
  codigo_pareamento: string | null;
  patios: { nome: string } | null;
};

async function carregar(sb: SupabaseClient, id: string): Promise<DispCtx | null> {
  const { data } = await sb
    .from("dispositivos")
    .select(
      "id, tenant_id, patio_id, device_uuid, status, licenca, apelido, codigo_pareamento, patios(nome)",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as DispCtx | null) ?? null;
}

async function registrarEvento(
  sb: SupabaseClient,
  d: DispCtx,
  evento: string,
  motivo: string,
): Promise<string | null> {
  const { data } = await sb
    .from("dispositivo_acessos")
    .insert({
      patio_id: d.patio_id,
      tenant_id: d.tenant_id,
      dispositivo_id: d.id,
      device_uuid: d.device_uuid,
      evento,
      motivo,
    })
    .select("id")
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

// ───────────────────────────────────────────────── Liberar (R$ 39,00/mês) ──
export async function liberar(dispositivoId: string): Promise<Resultado> {
  const c = await contexto();
  if ("erro" in c) return { ok: false, msg: c.erro };
  const { sb, user, tenantId } = c;

  const d = await carregar(sb, dispositivoId);
  if (!d) return { ok: false, msg: "Dispositivo não encontrado." };

  const [{ data: ass }, { data: tenant }] = await Promise.all([
    sb.from("assinaturas").select("valor_dispositivo_extra").maybeSingle(),
    sb.from("tenants").select("nome").maybeSingle(),
  ]);
  const valor = Number((ass as { valor_dispositivo_extra?: number } | null)?.valor_dispositivo_extra ?? 39);

  const { error } = await sb
    .from("dispositivos")
    .update({ licenca: "licenciado", status: "ativo", bloqueado_em: null })
    .eq("id", d.id);
  if (error) return { ok: false, msg: "Não foi possível liberar o dispositivo." };

  await sb.from("dispositivo_licencas").insert({
    dispositivo_id: d.id,
    patio_id: d.patio_id,
    tenant_id: tenantId,
    valor_mensal: valor,
    origem: "gestor",
    concedida_por: user.email ?? "gestor",
  });

  const acessoId = await registrarEvento(sb, d, "licenciado", "gestor:liberar");

  // Fire-and-forget: falha de e-mail nunca derruba a ação.
  void enviarEmailExtraAtivado(sb, {
    tenant: { id: tenantId, nome: (tenant as { nome?: string } | null)?.nome ?? "sua rede" },
    patio: { nome: d.patios?.nome ?? "—" },
    dispositivo: { codigo_pareamento: d.codigo_pareamento, apelido: d.apelido },
    valor,
    competencia: competenciaSeguinte(),
    acessoId,
    emailGestor: user.email ?? null, // override: o gestor é o próprio destinatário
  });

  revalidatePath(ROTA);
  revalidatePath("/painel");
  return { ok: true, msg: "Dispositivo liberado. Cobrança a partir da próxima competência." };
}

// ─────────────────────────────────────────── Promover para incluso (grátis) ──
export async function promoverIncluso(dispositivoId: string): Promise<Resultado> {
  const c = await contexto();
  if ("erro" in c) return { ok: false, msg: c.erro };
  const { sb } = c;

  const d = await carregar(sb, dispositivoId);
  if (!d) return { ok: false, msg: "Dispositivo não encontrado." };

  const { count } = await sb
    .from("dispositivos")
    .select("id", { count: "exact", head: true })
    .eq("patio_id", d.patio_id)
    .eq("licenca", "incluso")
    .neq("status", "revogado");
  if ((count ?? 0) > 0) {
    return { ok: false, msg: "Este pátio já tem um dispositivo incluso." };
  }

  const { error } = await sb
    .from("dispositivos")
    .update({ licenca: "incluso", status: "ativo", bloqueado_em: null, vinculado_em: new Date().toISOString() })
    .eq("id", d.id);
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: false, msg: "Este pátio já tem um dispositivo incluso." };
    }
    return { ok: false, msg: "Não foi possível promover o dispositivo." };
  }

  // Vira gratuito → encerra a vigência de qualquer licença cobrável ativa.
  await sb
    .from("dispositivo_licencas")
    .update({ vigencia_fim: new Date().toISOString() })
    .eq("dispositivo_id", d.id)
    .is("vigencia_fim", null);

  await registrarEvento(sb, d, "vinculado", "gestor:promover_incluso");
  revalidatePath(ROTA);
  revalidatePath("/painel");
  return { ok: true, msg: "Dispositivo promovido ao slot incluso (gratuito)." };
}

// ──────────────────────────────────────────────────────────────── Revogar ──
export async function revogar(dispositivoId: string): Promise<Resultado> {
  const c = await contexto();
  if ("erro" in c) return { ok: false, msg: c.erro };
  const { sb } = c;

  const d = await carregar(sb, dispositivoId);
  if (!d) return { ok: false, msg: "Dispositivo não encontrado." };

  const agora = new Date().toISOString();
  const { error } = await sb
    .from("dispositivos")
    .update({ status: "revogado", licenca: "nenhuma", revogado_em: agora })
    .eq("id", d.id);
  if (error) return { ok: false, msg: "Não foi possível revogar." };

  await sb
    .from("dispositivo_licencas")
    .update({ vigencia_fim: agora })
    .eq("dispositivo_id", d.id)
    .is("vigencia_fim", null);

  await registrarEvento(sb, d, "revogado", "gestor:revogar");
  revalidatePath(ROTA);
  revalidatePath("/painel");
  return { ok: true, msg: "Dispositivo revogado. Slot liberado." };
}

// ─────────────────────────────────────────────────────────────── Bloquear ──
export async function bloquear(dispositivoId: string): Promise<Resultado> {
  const c = await contexto();
  if ("erro" in c) return { ok: false, msg: c.erro };
  const { sb } = c;

  const d = await carregar(sb, dispositivoId);
  if (!d) return { ok: false, msg: "Dispositivo não encontrado." };

  const { error } = await sb
    .from("dispositivos")
    .update({ status: "bloqueado", bloqueado_em: new Date().toISOString() })
    .eq("id", d.id);
  if (error) return { ok: false, msg: "Não foi possível bloquear." };

  await registrarEvento(sb, d, "bloqueado", "gestor:bloquear");
  revalidatePath(ROTA);
  return { ok: true, msg: "Dispositivo bloqueado." };
}

// ────────────────────────────────────────────────────────────── Desbloquear ──
export async function desbloquear(dispositivoId: string): Promise<Resultado> {
  const c = await contexto();
  if ("erro" in c) return { ok: false, msg: c.erro };
  const { sb } = c;

  const d = await carregar(sb, dispositivoId);
  if (!d) return { ok: false, msg: "Dispositivo não encontrado." };

  const { error } = await sb
    .from("dispositivos")
    .update({ status: "ativo", bloqueado_em: null })
    .eq("id", d.id);
  if (error) return { ok: false, msg: "Não foi possível desbloquear." };

  await registrarEvento(sb, d, "desbloqueado", "gestor:desbloquear");
  revalidatePath(ROTA);
  return { ok: true, msg: "Dispositivo desbloqueado." };
}

// ──────────────────────────────────────────────────────── Editar apelido ──
export async function editarApelido(dispositivoId: string, apelido: string): Promise<Resultado> {
  const c = await contexto();
  if ("erro" in c) return { ok: false, msg: c.erro };
  const { sb } = c;

  const limpo = apelido.trim().slice(0, 60);
  const { error } = await sb
    .from("dispositivos")
    .update({ apelido: limpo || null })
    .eq("id", dispositivoId);
  if (error) return { ok: false, msg: "Não foi possível salvar o apelido." };

  revalidatePath(ROTA);
  return { ok: true, msg: limpo ? "Apelido salvo." : "Apelido removido." };
}
