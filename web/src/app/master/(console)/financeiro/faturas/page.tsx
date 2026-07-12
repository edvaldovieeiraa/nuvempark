import { createAdminClient } from "@/lib/supabase/admin";
import { FaturasClient, type FaturaRow } from "@/components/master/faturas-client";
import { emailConfigurado } from "@/lib/email";
import { asaasConfigurado } from "@/lib/asaas";

export const dynamic = "force-dynamic";

export default async function FaturasPage() {
  const sb = createAdminClient();
  await sb.rpc("fn_marcar_faturas_vencidas");

  const { data: faturas } = await sb
    .from("faturas")
    .select(
      "id, tenant_id, competencia, vencimento, valor, valor_por_patio, qtd_patios, estado, pago_em, forma_pagamento, gateway_cobranca_id, gateway_link, email_enviado_em, email_enviado_para, tenants(nome, codigo)",
    )
    .order("competencia", { ascending: false })
    .order("vencimento", { ascending: true })
    .limit(5000);

  const linhas: FaturaRow[] = ((faturas as unknown as RawFatura[]) ?? []).map(
    (f) => ({
      id: f.id,
      tenantId: f.tenant_id,
      rede: f.tenants?.nome ?? "—",
      codigo: f.tenants?.codigo ?? "",
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
      emailEnviadoEm: f.email_enviado_em,
      emailEnviadoPara: f.email_enviado_para,
    }),
  );

  return (
    <FaturasClient
      faturas={linhas}
      emailAtivo={emailConfigurado()}
      gatewayAtivo={asaasConfigurado()}
    />
  );
}

type RawFatura = {
  id: string;
  tenant_id: string;
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
  email_enviado_em: string | null;
  email_enviado_para: string | null;
  tenants: { nome: string; codigo: string } | null;
};
