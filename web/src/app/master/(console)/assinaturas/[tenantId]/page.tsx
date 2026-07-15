import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { garantirFaturaTrial } from "@/lib/faturas-trial";
import { emailConfigurado } from "@/lib/email";
import { asaasConfigurado } from "@/lib/asaas";
import {
  AssinaturaTenantClient,
  type FaturaDetalhe,
} from "@/components/master/assinatura-tenant-client";

export const dynamic = "force-dynamic";

type RawAssinatura = {
  tenant_id: string;
  estado: string;
  valor_por_patio: number;
  dia_vencimento: number;
  trial_expira_em: string | null;
  email_cobranca: string | null;
  cpf_cnpj: string | null;
  gateway_cliente_id: string | null;
  tenants: { nome: string; codigo: string } | null;
};

type RawFatura = {
  id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  valor_por_patio: number;
  qtd_patios: number;
  estado: string;
  pago_em: string | null;
  forma_pagamento: string | null;
  gateway_cobranca_id: string | null;
  gateway_link: string | null;
  gateway_pix_copia: string | null;
  email_enviado_em: string | null;
  email_enviado_para: string | null;
};

export default async function AssinaturaTenantPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const sb = createAdminClient();

  await sb.rpc("fn_marcar_faturas_vencidas");
  // Se a rede está em teste, garante a próxima fatura antes de ler.
  await garantirFaturaTrial(sb, tenantId);

  const [{ data: assinaturaRaw }, { count: patiosAtivos }, { data: faturasRaw }] =
    await Promise.all([
      sb
        .from("assinaturas")
        .select(
          "tenant_id, estado, valor_por_patio, dia_vencimento, trial_expira_em, email_cobranca, cpf_cnpj, gateway_cliente_id, tenants(nome, codigo)",
        )
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      sb
        .from("patios")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("ativo", true),
      sb
        .from("faturas")
        .select(
          "id, competencia, vencimento, valor, valor_por_patio, qtd_patios, estado, pago_em, forma_pagamento, gateway_cobranca_id, gateway_link, gateway_pix_copia, email_enviado_em, email_enviado_para",
        )
        .eq("tenant_id", tenantId)
        .order("competencia", { ascending: false })
        .order("vencimento", { ascending: false })
        .limit(1000),
    ]);

  const assinatura = assinaturaRaw as unknown as RawAssinatura | null;
  if (!assinatura) notFound();

  let trialDias: number | null = null;
  if (assinatura.estado === "trial") {
    const { data } = await sb.rpc("fn_trial_dias_restantes", {
      p_tenant: tenantId,
    });
    trialDias = typeof data === "number" ? data : null;
  }

  const faturas: FaturaDetalhe[] = (
    (faturasRaw as unknown as RawFatura[]) ?? []
  ).map((f) => ({
    id: f.id,
    competencia: f.competencia,
    vencimento: f.vencimento,
    valor: Number(f.valor),
    valorPorPatio: Number(f.valor_por_patio),
    qtdPatios: f.qtd_patios,
    estado: f.estado,
    pagoEm: f.pago_em,
    formaPagamento: f.forma_pagamento,
    temCobranca: !!f.gateway_cobranca_id,
    linkPagamento: f.gateway_link,
    temPix: !!f.gateway_pix_copia,
    emailEnviadoEm: f.email_enviado_em,
    emailEnviadoPara: f.email_enviado_para,
  }));

  const patiosQtd = patiosAtivos ?? 0;
  const valorPorPatio = Number(assinatura.valor_por_patio) || 0;

  return (
    <AssinaturaTenantClient
      tenantId={tenantId}
      rede={assinatura.tenants?.nome ?? "—"}
      codigo={assinatura.tenants?.codigo ?? ""}
      estado={assinatura.estado}
      valorPorPatio={valorPorPatio}
      patiosAtivos={patiosQtd}
      mensalidade={valorPorPatio * patiosQtd}
      diaVencimento={assinatura.dia_vencimento}
      trialDias={trialDias}
      emailCobranca={assinatura.email_cobranca}
      cpfCnpj={assinatura.cpf_cnpj}
      temGatewayCliente={!!assinatura.gateway_cliente_id}
      faturas={faturas}
      emailAtivo={emailConfigurado()}
      gatewayAtivo={asaasConfigurado()}
    />
  );
}
