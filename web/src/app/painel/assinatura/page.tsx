import { createClient } from "@/lib/supabase/server";
import { AssinaturaClient } from "@/components/assinatura/assinatura-client";

export const dynamic = "force-dynamic";

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

  return (
    <AssinaturaClient
      assinatura={assinatura ?? null}
      qtdPatiosAtivos={qtdPatiosAtivos ?? 0}
      trialDias={trialDias}
      proximos={proximos}
      historico={historico}
    />
  );
}
