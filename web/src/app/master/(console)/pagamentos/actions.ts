"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessaoMasterAtiva } from "@/lib/master-auth";
import { cifrarChaveGateway } from "@/lib/crypto-gateway";

export type Resultado =
  | { ok: true; msg: string }
  | { ok: false; msg: string }
  | null;

const GATEWAY = "asaas";

/** Base do Asaas que a API usa — mesma env, para o teste bater com a produção. */
function asaasBase(): string {
  return process.env.ASAAS_BASE_URL || "https://api-sandbox.asaas.com/v3";
}

/**
 * Confere a chave no próprio Asaas ANTES de gravar. É a defesa contra o que
 * causou o incidente: uma chave inválida ou de ambiente trocado só apareceria
 * como "sem conexão" na saída do carro. Aqui ela falha na cara do gestor.
 *
 * - 200/2xx → chave boa.
 * - 401     → chave inválida ou de outro ambiente (sandbox × produção).
 * - outros  → provável instabilidade do PSP: não bloqueia (retorna aviso).
 */
async function testarChave(
  apiKey: string,
): Promise<{ ok: true } | { ok: false; bloqueia: boolean; motivo: string }> {
  try {
    const resp = await fetch(`${asaasBase()}/customers?limit=1`, {
      headers: {
        access_token: apiKey,
        "Content-Type": "application/json",
        "User-Agent": "NuvemPark-Console/1.0",
      },
    });
    if (resp.ok) return { ok: true };
    if (resp.status === 401) {
      return {
        ok: false,
        bloqueia: true,
        motivo:
          "O Asaas recusou a chave (401). Verifique se ela é do ambiente certo " +
          `(${asaasBase().includes("sandbox") ? "sandbox" : "produção"}).`,
      };
    }
    return {
      ok: false,
      bloqueia: false,
      motivo: `O Asaas respondeu ${resp.status} ao validar a chave.`,
    };
  } catch {
    return {
      ok: false,
      bloqueia: false,
      motivo: "Não consegui falar com o Asaas para validar a chave agora.",
    };
  }
}

function numero(fd: FormData, campo: string): number {
  const v = String(fd.get(campo) ?? "0").replace(",", ".").trim();
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Cria/atualiza o gateway de um tenant. A chave é CIFRADA aqui (nunca vai em
 * claro ao banco). Trocar a chave zera `customer_padrao_id`: o cliente genérico
 * antigo pertence à subconta antiga e não vale na nova.
 */
export async function configurarGateway(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const tenantId = String(formData.get("tenant_id") || "").trim();
  const apiKey = String(formData.get("api_key") || "").trim();
  const subcontaId = String(formData.get("subconta_id") || "").trim() || null;
  const splitPercentual = numero(formData, "split_percentual");
  const splitValorFixo = numero(formData, "split_valor_fixo");
  const ativo = formData.get("ativo") !== "false";

  if (!tenantId) return { ok: false, msg: "Tenant não informado." };
  if (apiKey.length < 10)
    return { ok: false, msg: "Cole a chave de API da subconta do Asaas." };
  if (splitPercentual > 100)
    return { ok: false, msg: "O split percentual não pode passar de 100%." };

  // Fail-fast: valida a chave no PSP antes de qualquer escrita.
  const teste = await testarChave(apiKey);
  if (teste.ok === false && teste.bloqueia)
    return { ok: false, msg: teste.motivo };

  const sb = createAdminClient();

  const linha = {
    tenant_id: tenantId,
    gateway: GATEWAY,
    subconta_id: subcontaId,
    api_key_encrypted: cifrarChaveGateway(apiKey),
    // Chave nova ⇒ subconta possivelmente nova: o cliente genérico é recriado.
    customer_padrao_id: null,
    split_percentual: splitPercentual,
    split_valor_fixo: splitValorFixo,
    ativo,
  };

  const { error } = await sb
    .from("tenant_gateways")
    .upsert(linha, { onConflict: "tenant_id,gateway" });

  if (error) return { ok: false, msg: "Não foi possível salvar o gateway." };

  revalidatePath("/master/pagamentos");
  const aviso =
    teste.ok === false ? ` (aviso: ${teste.motivo})` : "";
  return {
    ok: true,
    msg: `Gateway ${ativo ? "ativado" : "salvo"} para o tenant.${aviso}`,
  };
}

/** Liga/desliga o gateway sem tocar na chave. */
export async function alternarGatewayAtivo(
  tenantId: string,
  ativoAtual: boolean,
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();
  const { error } = await sb
    .from("tenant_gateways")
    .update({ ativo: !ativoAtual })
    .eq("tenant_id", tenantId)
    .eq("gateway", GATEWAY);

  if (error) return { ok: false, msg: "Não foi possível alterar o gateway." };

  revalidatePath("/master/pagamentos");
  return { ok: true, msg: ativoAtual ? "Gateway desativado." : "Gateway ativado." };
}

/** Remove a configuração (para reconfigurar do zero). */
export async function removerGateway(tenantId: string): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();
  const { error } = await sb
    .from("tenant_gateways")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("gateway", GATEWAY);

  if (error) return { ok: false, msg: "Não foi possível remover o gateway." };

  revalidatePath("/master/pagamentos");
  return { ok: true, msg: "Gateway removido." };
}
