import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Webhook do Asaas — baixa automática das faturas.
 *
 * Configure no painel do Asaas a URL:
 *   https://nuvempark.com/api/webhooks/asaas
 * e (opcional, recomendado) um token em ASAAS_WEBHOOK_TOKEN — o Asaas envia no
 * header `asaas-access-token`. Se a env existir, exigimos que bata.
 *
 * Eventos tratados:
 *   PAYMENT_RECEIVED / PAYMENT_CONFIRMED  -> fatura vira 'paga'
 *   PAYMENT_OVERDUE                       -> fatura vira 'vencida'
 * A fatura é localizada por payment.externalReference (id da fatura no nosso DB).
 */
export async function POST(req: NextRequest) {
  const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (tokenEsperado) {
    const recebido = req.headers.get("asaas-access-token");
    if (recebido !== tokenEsperado) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let corpo: {
    event?: string;
    payment?: {
      id?: string;
      externalReference?: string;
      billingType?: string;
    };
  };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "json" }, { status: 400 });
  }

  const evento = corpo.event;
  const pagamento = corpo.payment;
  const faturaId = pagamento?.externalReference;

  // Sem referência não temos como casar — respondemos 200 pra não gerar retry.
  if (!faturaId) return NextResponse.json({ ok: true, ignorado: true });

  const sb = createAdminClient();

  if (evento === "PAYMENT_RECEIVED" || evento === "PAYMENT_CONFIRMED") {
    const forma = mapearForma(pagamento?.billingType);
    await sb
      .from("faturas")
      .update({
        estado: "paga",
        pago_em: new Date().toISOString(),
        forma_pagamento: forma,
      })
      .eq("id", faturaId)
      .neq("estado", "cancelada");
  } else if (evento === "PAYMENT_OVERDUE") {
    await sb
      .from("faturas")
      .update({ estado: "vencida" })
      .eq("id", faturaId)
      .eq("estado", "aberta");
  }

  return NextResponse.json({ ok: true });
}

function mapearForma(billingType?: string): string {
  switch (billingType) {
    case "PIX":
      return "pix";
    case "BOLETO":
      return "boleto";
    case "CREDIT_CARD":
      return "cartao";
    default:
      return "pix";
  }
}
