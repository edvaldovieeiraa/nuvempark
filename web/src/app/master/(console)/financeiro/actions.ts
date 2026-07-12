"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessaoMasterAtiva } from "@/lib/master-auth";
import { enviarEmail, emailConfigurado } from "@/lib/email";
import { emailCobranca } from "@/lib/email-templates";
import {
  asaasConfigurado,
  garantirCliente,
  criarCobranca,
  obterPixCopiaECola,
} from "@/lib/asaas";

export type Resultado =
  | { ok: true; msg: string }
  | { ok: false; msg: string }
  | null;

function revalida() {
  revalidatePath("/master/financeiro");
  revalidatePath("/master/financeiro/faturas");
  revalidatePath("/master/financeiro/inadimplencia");
  revalidatePath("/master");
}

/** Gera as faturas do mês corrente (idempotente) e marca vencidas. */
export async function gerarFaturasDoMes(): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();
  const { data: criadas, error } = await sb.rpc("fn_gerar_faturas_mes");
  if (error) return { ok: false, msg: "Falha ao gerar faturas: " + error.message };

  await sb.rpc("fn_marcar_faturas_vencidas");
  revalida();

  const n = Number(criadas ?? 0);
  return {
    ok: true,
    msg:
      n === 0
        ? "Nenhuma fatura nova — o mês já estava gerado."
        : `${n} ${n === 1 ? "fatura gerada" : "faturas geradas"} para este mês.`,
  };
}

/** Marca uma fatura como paga (baixa manual). */
export async function marcarPaga(
  faturaId: string,
  forma: string = "manual",
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();
  const { error } = await sb
    .from("faturas")
    .update({
      estado: "paga",
      pago_em: new Date().toISOString(),
      forma_pagamento: forma,
    })
    .eq("id", faturaId);
  if (error) return { ok: false, msg: "Não foi possível baixar a fatura." };

  revalida();
  return { ok: true, msg: "Fatura marcada como paga." };
}

/** Reabre uma fatura paga (estorno de baixa). */
export async function reabrirFatura(faturaId: string): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();
  const { error } = await sb
    .from("faturas")
    .update({ estado: "aberta", pago_em: null, forma_pagamento: null })
    .eq("id", faturaId);
  if (error) return { ok: false, msg: "Não foi possível reabrir a fatura." };

  revalida();
  return { ok: true, msg: "Fatura reaberta." };
}

/** Cancela uma fatura (não conta em nada). */
export async function cancelarFatura(faturaId: string): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();
  const { error } = await sb
    .from("faturas")
    .update({ estado: "cancelada" })
    .eq("id", faturaId);
  if (error) return { ok: false, msg: "Não foi possível cancelar." };

  revalida();
  return { ok: true, msg: "Fatura cancelada." };
}

type FaturaJoin = {
  id: string;
  tenant_id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  gateway_cobranca_id: string | null;
  gateway_link: string | null;
  gateway_pix_copia: string | null;
  tenants: { nome: string } | null;
  assinaturas?: unknown;
};

async function carregarFatura(
  sb: ReturnType<typeof createAdminClient>,
  faturaId: string,
): Promise<FaturaJoin | null> {
  const { data } = await sb
    .from("faturas")
    .select(
      "id, tenant_id, competencia, vencimento, valor, gateway_cobranca_id, gateway_link, gateway_pix_copia, tenants(nome)",
    )
    .eq("id", faturaId)
    .single();
  return (data as unknown as FaturaJoin) ?? null;
}

/**
 * Emite a cobrança no gateway (Asaas) para a fatura — cria cliente se preciso,
 * gera PIX/boleto e grava o link/pix na fatura. Só roda se ASAAS_API_KEY existir.
 */
export async function emitirCobrancaGateway(faturaId: string): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };
  if (!asaasConfigurado())
    return {
      ok: false,
      msg: "Gateway não configurado. Defina ASAAS_API_KEY no servidor para emitir cobranças automáticas.",
    };

  const sb = createAdminClient();
  const fatura = await carregarFatura(sb, faturaId);
  if (!fatura) return { ok: false, msg: "Fatura não encontrada." };
  if (fatura.gateway_cobranca_id)
    return { ok: false, msg: "Esta fatura já tem cobrança emitida." };

  const { data: assinatura } = await sb
    .from("assinaturas")
    .select("email_cobranca, cpf_cnpj, gateway_cliente_id")
    .eq("tenant_id", fatura.tenant_id)
    .single();

  try {
    const clienteId = await garantirCliente({
      clienteIdExistente: assinatura?.gateway_cliente_id,
      nome: fatura.tenants?.nome ?? "Cliente NuvemPark",
      email: assinatura?.email_cobranca,
      cpfCnpj: assinatura?.cpf_cnpj,
    });

    if (clienteId !== assinatura?.gateway_cliente_id) {
      await sb
        .from("assinaturas")
        .update({ gateway_cliente_id: clienteId })
        .eq("tenant_id", fatura.tenant_id);
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

    revalida();
    return { ok: true, msg: "Cobrança emitida no gateway (PIX/boleto)." };
  } catch (e) {
    return { ok: false, msg: "Falha no gateway: " + String(e).slice(0, 160) };
  }
}

/**
 * Dispara e-mail de cobrança da fatura. Se o gateway já emitiu, inclui o link
 * de pagamento e o PIX. Registra o envio na fatura.
 */
export async function cobrarPorEmail(faturaId: string): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };
  if (!emailConfigurado())
    return {
      ok: false,
      msg: "E-mail não configurado. Defina RESEND_API_KEY no servidor.",
    };

  const sb = createAdminClient();
  const fatura = await carregarFatura(sb, faturaId);
  if (!fatura) return { ok: false, msg: "Fatura não encontrada." };

  const { data: assinatura } = await sb
    .from("assinaturas")
    .select("email_cobranca")
    .eq("tenant_id", fatura.tenant_id)
    .single();

  const destino = assinatura?.email_cobranca;
  if (!destino)
    return {
      ok: false,
      msg: "Esta rede não tem e-mail de cobrança. Defina em Redes › editar.",
    };

  const { assunto, html } = emailCobranca({
    nomeRede: fatura.tenants?.nome ?? "Cliente",
    competencia: fatura.competencia,
    valor: Number(fatura.valor),
    vencimento: fatura.vencimento,
    linkPagamento: fatura.gateway_link,
    pixCopiaECola: fatura.gateway_pix_copia,
  });

  const r = await enviarEmail({ para: destino, assunto, html });
  if (!r.ok)
    return {
      ok: false,
      msg:
        r.motivo === "desligado"
          ? "Envio desligado (sem RESEND_API_KEY)."
          : "Falha ao enviar: " + (r.detalhe ?? ""),
    };

  await sb
    .from("faturas")
    .update({
      email_enviado_em: new Date().toISOString(),
      email_enviado_para: destino,
    })
    .eq("id", fatura.id);

  revalida();
  return { ok: true, msg: `Cobrança enviada para ${destino}.` };
}

/** Suspende (ou reativa) a assinatura de uma rede — usado na inadimplência. */
export async function alternarSuspensao(
  tenantId: string,
  suspender: boolean,
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();
  const { error } = await sb
    .from("assinaturas")
    .update({ estado: suspender ? "suspensa" : "ativa" })
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, msg: "Não foi possível alterar a assinatura." };

  revalida();
  revalidatePath("/master/tenants");
  return {
    ok: true,
    msg: suspender
      ? "Acesso suspenso. O operador não consegue mais entrar no app."
      : "Acesso reativado.",
  };
}

/** Salva os dados de cobrança da rede (e-mail, CPF/CNPJ, dia de vencimento). */
export async function salvarDadosCobranca(
  tenantId: string,
  dados: { email: string; cpfCnpj: string; diaVencimento: number },
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva()))
    return { ok: false, msg: "Sessão master expirada." };

  const sb = createAdminClient();
  const { error } = await sb
    .from("assinaturas")
    .update({
      email_cobranca: dados.email || null,
      cpf_cnpj: dados.cpfCnpj || null,
      dia_vencimento: Math.min(28, Math.max(1, dados.diaVencimento || 10)),
    })
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, msg: "Não foi possível salvar." };

  revalida();
  return { ok: true, msg: "Dados de cobrança atualizados." };
}
