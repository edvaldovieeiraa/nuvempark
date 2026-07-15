"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { garantirFaturaTrial } from "@/lib/faturas-trial";
import {
  asaasConfigurado,
  garantirCliente,
  criarCobranca,
  obterPixCopiaECola,
} from "@/lib/asaas";

export type ResultadoPagamento =
  | { ok: true; msg: string }
  | { ok: false; msg: string }
  | null;

type FaturaCobranca = {
  id: string;
  tenant_id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  gateway_cobranca_id: string | null;
};

/**
 * Prepara as formas de pagamento (PIX/boleto/cartão) da fatura do gestor logado.
 *
 * Fluxo do CLIENTE (não é o master): valida que a fatura é do próprio tenant da
 * sessão, garante a "próxima fatura" se a rede está em teste (quando `faturaId`
 * vem nulo), e emite a cobrança no Asaas gravando os links na fatura. A tela
 * então mostra os botões de pagamento. Idempotente: se já há cobrança, apenas
 * confirma. Usa service_role, mas sempre escopado ao tenant da sessão.
 */
export async function prepararPagamento(
  faturaId: string | null,
): Promise<ResultadoPagamento> {
  const supa = await createClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  const tenantId = (user?.app_metadata as { tenant_id?: string })?.tenant_id;
  if (!tenantId) return { ok: false, msg: "Sessão inválida. Entre novamente." };

  if (!asaasConfigurado())
    return {
      ok: false,
      msg: "Pagamento online indisponível no momento. Fale com o suporte.",
    };

  const sb = createAdminClient();

  // Sem faturaId → rede em teste: garante a próxima fatura e pega a mais próxima.
  if (!faturaId) await garantirFaturaTrial(sb, tenantId);

  let fatura: FaturaCobranca | null = null;
  if (faturaId) {
    const { data } = await sb
      .from("faturas")
      .select("id, tenant_id, competencia, vencimento, valor, gateway_cobranca_id")
      .eq("id", faturaId)
      .maybeSingle();
    fatura = (data as FaturaCobranca | null) ?? null;
    // authz: a fatura tem que ser do tenant da sessão
    if (!fatura || fatura.tenant_id !== tenantId)
      return { ok: false, msg: "Fatura não encontrada." };
  } else {
    const { data } = await sb
      .from("faturas")
      .select("id, tenant_id, competencia, vencimento, valor, gateway_cobranca_id")
      .eq("tenant_id", tenantId)
      .in("estado", ["aberta", "vencida"])
      .order("vencimento", { ascending: true })
      .limit(1)
      .maybeSingle();
    fatura = (data as FaturaCobranca | null) ?? null;
    if (!fatura)
      return {
        ok: false,
        msg: "Nenhuma fatura em aberto para pagar no momento.",
      };
  }

  if (fatura.gateway_cobranca_id) {
    revalidatePath("/painel/assinatura");
    return { ok: true, msg: "Formas de pagamento prontas." };
  }

  const { data: assinatura } = await sb
    .from("assinaturas")
    .select("email_cobranca, cpf_cnpj, gateway_cliente_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const { data: tenant } = await sb
    .from("tenants")
    .select("nome")
    .eq("id", tenantId)
    .maybeSingle();

  try {
    const clienteId = await garantirCliente({
      clienteIdExistente: assinatura?.gateway_cliente_id,
      nome: (tenant as { nome?: string } | null)?.nome ?? "Cliente NuvemPark",
      email: assinatura?.email_cobranca,
      cpfCnpj: assinatura?.cpf_cnpj,
    });

    if (clienteId !== assinatura?.gateway_cliente_id) {
      await sb
        .from("assinaturas")
        .update({ gateway_cliente_id: clienteId })
        .eq("tenant_id", tenantId);
    }

    const cobranca = await criarCobranca({
      clienteId,
      valor: Number(fatura.valor),
      vencimento: fatura.vencimento,
      descricao: `NuvemPark · assinatura ${fatura.competencia.slice(0, 7)}`,
      referenciaExterna: fatura.id,
    });

    const pix = await obterPixCopiaECola(cobranca.id);

    await sb
      .from("faturas")
      .update({
        gateway_cobranca_id: cobranca.id,
        gateway_link: cobranca.invoiceUrl,
        gateway_boleto_url: cobranca.bankSlipUrl ?? null,
        gateway_pix_copia: pix,
      })
      .eq("id", fatura.id);

    revalidatePath("/painel/assinatura");
    return { ok: true, msg: "Pronto! Escolha como pagar: PIX, boleto ou cartão." };
  } catch (e) {
    return {
      ok: false,
      msg: "Não foi possível gerar o pagamento agora. Tente de novo em instantes.",
    };
  }
}
