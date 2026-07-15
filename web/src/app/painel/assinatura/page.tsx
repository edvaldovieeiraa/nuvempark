import { createClient } from "@/lib/supabase/server";
import { AssinaturaClient } from "@/components/assinatura/assinatura-client";
import { asaasConfigurado } from "@/lib/asaas";
import { competenciaEVencimento } from "@/lib/faturas-trial";

export const dynamic = "force-dynamic";

export type ProjecaoTrial = {
  competencia: string;
  vencimento: string;
  valor: number;
};

export type FaturaRow = {
  id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  estado: string;
  pago_em: string | null;
  forma_pagamento: string | null;
  gateway_link: string | null;
  gateway_pix_copia: string | null;
  gateway_boleto_url: string | null;
};

export default async function AssinaturaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = (user?.app_metadata as { tenant_id?: string })?.tenant_id;

  const [
    { data: assinatura },
    { count: qtdPatiosAtivos },
    { data: faturas },
  ] = await Promise.all([
    supabase
      .from("assinaturas")
      .select("estado, valor_por_patio, dia_vencimento, trial_expira_em")
      .maybeSingle(),
    supabase
      .from("patios")
      .select("*", { count: "exact", head: true })
      .eq("ativo", true),
    supabase
      .from("faturas")
      .select(
        "id, competencia, vencimento, valor, estado, pago_em, forma_pagamento, gateway_link, gateway_pix_copia, gateway_boleto_url",
      )
      .order("competencia", { ascending: false }),
  ]);

  // Dias de trial via função do banco (null se não estiver em trial).
  let trialDias: number | null = null;
  if (tenantId && assinatura?.estado === "trial") {
    const { data } = await supabase.rpc("fn_trial_dias_restantes", {
      p_tenant: tenantId,
    });
    trialDias = typeof data === "number" ? data : null;
  }

  const todas = (faturas ?? []) as FaturaRow[];
  const proximos = todas
    .filter((f) => f.estado === "aberta" || f.estado === "vencida")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const historico = todas.filter((f) => f.estado === "paga");

  // Trial: se ainda não existe fatura em aberto (a linha real pode não ter sido
  // gerada), projeta a "próxima fatura" para o cliente ver e poder pagar já.
  const patios = qtdPatiosAtivos ?? 0;
  const valorPorPatio = Number(assinatura?.valor_por_patio) || 0;
  let projecaoTrial: ProjecaoTrial | null = null;
  if (
    assinatura?.estado === "trial" &&
    assinatura.trial_expira_em &&
    proximos.length === 0 &&
    valorPorPatio > 0 &&
    patios > 0
  ) {
    const { competencia, vencimento } = competenciaEVencimento(
      assinatura.trial_expira_em,
      assinatura.dia_vencimento ?? 10,
    );
    projecaoTrial = { competencia, vencimento, valor: valorPorPatio * patios };
  }

  return (
    <AssinaturaClient
      assinatura={assinatura ?? null}
      qtdPatiosAtivos={patios}
      trialDias={trialDias}
      proximos={proximos}
      historico={historico}
      projecaoTrial={projecaoTrial}
      gatewayAtivo={asaasConfigurado()}
    />
  );
}
