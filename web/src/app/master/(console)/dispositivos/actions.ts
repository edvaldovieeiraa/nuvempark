"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessaoMasterAtiva } from "@/lib/master-auth";
import { enviarEmailExtraAtivado } from "@/lib/emails/dispositivos";

export type Resultado =
  | { ok: true; msg: string }
  | { ok: false; msg: string }
  | null;

const ROTA = "/master/dispositivos";
const UNIQUE_VIOLATION = "23505";
const CONCEDIDO_POR = "master";

type DispositivoCtx = {
  id: string;
  tenant_id: string;
  patio_id: string;
  device_uuid: string;
  status: string;
  licenca: string;
  apelido: string | null;
  codigo_pareamento: string | null;
  patios: { nome: string } | null;
  tenants: { nome: string } | null;
};

async function carregar(
  sb: SupabaseClient,
  dispositivoId: string,
): Promise<DispositivoCtx | null> {
  const { data } = await sb
    .from("dispositivos")
    .select(
      "id, tenant_id, patio_id, device_uuid, status, licenca, apelido, codigo_pareamento, patios(nome), tenants(nome)",
    )
    .eq("id", dispositivoId)
    .maybeSingle();
  return (data as unknown as DispositivoCtx | null) ?? null;
}

/** Insere um evento em dispositivo_acessos e devolve o id (p/ anti-dup de e-mail). */
async function registrarEvento(
  sb: SupabaseClient,
  d: DispositivoCtx,
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

/** Rótulo da competência a partir da qual o extra vale (mês seguinte). */
function competenciaSeguinte(): string {
  const agora = new Date();
  const prox = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(prox);
}

async function guardaMaster(): Promise<SupabaseClient | { ok: false; msg: string }> {
  if (!(await sessaoMasterAtiva())) return { ok: false, msg: "Sessão master expirada." };
  return createAdminClient();
}

// ─────────────────────────────────────────────────────── Conceder cortesia ──
export async function concederCortesia(dispositivoId: string): Promise<Resultado> {
  const g = await guardaMaster();
  if ("ok" in g) return g;
  const sb = g;

  const d = await carregar(sb, dispositivoId);
  if (!d) return { ok: false, msg: "Dispositivo não encontrado." };

  const { error } = await sb
    .from("dispositivos")
    .update({ licenca: "cortesia", status: "ativo", bloqueado_em: null })
    .eq("id", d.id);
  if (error) return { ok: false, msg: "Não foi possível conceder a cortesia." };

  await sb.from("dispositivo_licencas").insert({
    dispositivo_id: d.id,
    patio_id: d.patio_id,
    tenant_id: d.tenant_id,
    valor_mensal: 0,
    origem: "cortesia",
    concedida_por: CONCEDIDO_POR,
  });

  const acessoId = await registrarEvento(sb, d, "licenciado", "master:cortesia");

  // Cortesia (valor 0) → só o aviso ao gestor, sem menção a cobrança (Passo 7).
  void enviarEmailExtraAtivado(sb, {
    tenant: { id: d.tenant_id, nome: d.tenants?.nome ?? "—" },
    patio: { nome: d.patios?.nome ?? "—" },
    dispositivo: { codigo_pareamento: d.codigo_pareamento, apelido: d.apelido },
    valor: 0,
    competencia: competenciaSeguinte(),
    acessoId,
  });

  revalidatePath(ROTA);
  return { ok: true, msg: "Cortesia concedida — dispositivo ativo sem cobrança." };
}

// ────────────────────────────────────────────────────── Licenciar (cobrar) ──
export async function licenciar(dispositivoId: string): Promise<Resultado> {
  const g = await guardaMaster();
  if ("ok" in g) return g;
  const sb = g;

  const d = await carregar(sb, dispositivoId);
  if (!d) return { ok: false, msg: "Dispositivo não encontrado." };

  const { data: ass } = await sb
    .from("assinaturas")
    .select("valor_dispositivo_extra")
    .eq("tenant_id", d.tenant_id)
    .maybeSingle();
  const valor = Number((ass as { valor_dispositivo_extra?: number } | null)?.valor_dispositivo_extra ?? 39);

  const { error } = await sb
    .from("dispositivos")
    .update({ licenca: "licenciado", status: "ativo", bloqueado_em: null })
    .eq("id", d.id);
  if (error) return { ok: false, msg: "Não foi possível licenciar o dispositivo." };

  await sb.from("dispositivo_licencas").insert({
    dispositivo_id: d.id,
    patio_id: d.patio_id,
    tenant_id: d.tenant_id,
    valor_mensal: valor,
    origem: "master",
    concedida_por: CONCEDIDO_POR,
  });

  const acessoId = await registrarEvento(sb, d, "licenciado", "master:licenciar");

  void enviarEmailExtraAtivado(sb, {
    tenant: { id: d.tenant_id, nome: d.tenants?.nome ?? "—" },
    patio: { nome: d.patios?.nome ?? "—" },
    dispositivo: { codigo_pareamento: d.codigo_pareamento, apelido: d.apelido },
    valor,
    competencia: competenciaSeguinte(),
    acessoId,
  });

  revalidatePath(ROTA);
  return {
    ok: true,
    msg: `Dispositivo licenciado. Cobrança a partir da próxima competência.`,
  };
}

// ───────────────────────────────────────────────── Promover para incluso ──
export async function promoverIncluso(dispositivoId: string): Promise<Resultado> {
  const g = await guardaMaster();
  if ("ok" in g) return g;
  const sb = g;

  const d = await carregar(sb, dispositivoId);
  if (!d) return { ok: false, msg: "Dispositivo não encontrado." };

  // Slot livre? (nenhum incluso não-revogado no pátio)
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
    // Corrida: o índice único parcial barrou um 2º incluso.
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: false, msg: "Este pátio já tem um dispositivo incluso." };
    }
    return { ok: false, msg: "Não foi possível promover o dispositivo." };
  }

  // Vira gratuito → encerra qualquer licença cobrável vigente.
  await sb
    .from("dispositivo_licencas")
    .update({ vigencia_fim: new Date().toISOString() })
    .eq("dispositivo_id", d.id)
    .is("vigencia_fim", null);

  await registrarEvento(sb, d, "vinculado", "master:promover_incluso");

  revalidatePath(ROTA);
  return { ok: true, msg: "Dispositivo promovido ao slot incluso (gratuito)." };
}

// ──────────────────────────────────────────────────────────────── Bloquear ──
export async function bloquear(dispositivoId: string): Promise<Resultado> {
  const g = await guardaMaster();
  if ("ok" in g) return g;
  const sb = g;

  const d = await carregar(sb, dispositivoId);
  if (!d) return { ok: false, msg: "Dispositivo não encontrado." };

  // Mantém a licença (se era 'licenciado', continua cobrando).
  const { error } = await sb
    .from("dispositivos")
    .update({ status: "bloqueado", bloqueado_em: new Date().toISOString() })
    .eq("id", d.id);
  if (error) return { ok: false, msg: "Não foi possível bloquear." };

  await registrarEvento(sb, d, "bloqueado", "master:bloquear");
  revalidatePath(ROTA);
  return { ok: true, msg: "Dispositivo bloqueado." };
}

// ───────────────────────────────────────────────────────────── Desbloquear ──
export async function desbloquear(dispositivoId: string): Promise<Resultado> {
  const g = await guardaMaster();
  if ("ok" in g) return g;
  const sb = g;

  const d = await carregar(sb, dispositivoId);
  if (!d) return { ok: false, msg: "Dispositivo não encontrado." };

  const { error } = await sb
    .from("dispositivos")
    .update({ status: "ativo", bloqueado_em: null })
    .eq("id", d.id);
  if (error) return { ok: false, msg: "Não foi possível desbloquear." };

  await registrarEvento(sb, d, "desbloqueado", "master:desbloquear");
  revalidatePath(ROTA);
  return { ok: true, msg: "Dispositivo desbloqueado." };
}

// ───────────────────────────────────────────────────────────────── Revogar ──
export async function revogar(dispositivoId: string): Promise<Resultado> {
  const g = await guardaMaster();
  if ("ok" in g) return g;
  const sb = g;

  const d = await carregar(sb, dispositivoId);
  if (!d) return { ok: false, msg: "Dispositivo não encontrado." };

  const agora = new Date().toISOString();
  const { error } = await sb
    .from("dispositivos")
    .update({ status: "revogado", licenca: "nenhuma", revogado_em: agora })
    .eq("id", d.id);
  if (error) return { ok: false, msg: "Não foi possível revogar." };

  // Fecha a vigência da licença ativa (para de cobrar) e libera o slot.
  await sb
    .from("dispositivo_licencas")
    .update({ vigencia_fim: agora })
    .eq("dispositivo_id", d.id)
    .is("vigencia_fim", null);

  await registrarEvento(sb, d, "revogado", "master:revogar");
  revalidatePath(ROTA);
  return { ok: true, msg: "Dispositivo revogado. Slot liberado." };
}

// ──────────────────────────────────────── Preço do extra por tenant (Passo 4) ──
export async function definirValorExtra(
  tenantId: string,
  valor: number,
): Promise<Resultado> {
  const g = await guardaMaster();
  if ("ok" in g) return g;
  const sb = g;

  if (!Number.isFinite(valor) || valor < 0) {
    return { ok: false, msg: "Informe um valor válido (0 ou mais)." };
  }

  const { error } = await sb
    .from("assinaturas")
    .update({ valor_dispositivo_extra: valor })
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, msg: "Não foi possível salvar o valor." };

  revalidatePath(ROTA);
  return {
    ok: true,
    msg: "Valor salvo. Vale a partir da próxima competência (faturas emitidas não mudam).",
  };
}
