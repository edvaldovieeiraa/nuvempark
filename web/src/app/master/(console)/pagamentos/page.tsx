import { createAdminClient } from "@/lib/supabase/admin";
import { cryptoGatewayPronto } from "@/lib/crypto-gateway";
import {
  PagamentosClient,
  type GatewayRow,
} from "@/components/master/pagamentos-client";

export const dynamic = "force-dynamic";

export default async function PagamentosPage() {
  const sb = createAdminClient();

  const [{ data: tenants }, { data: gateways }] = await Promise.all([
    sb
      .from("tenants")
      .select("id, nome, codigo, ativo")
      .order("nome", { ascending: true }),
    sb
      .from("tenant_gateways")
      .select("tenant_id, ativo, subconta_id, api_key_encrypted, split_percentual, split_valor_fixo"),
  ]);

  type LinhaGateway = {
    tenant_id: string;
    ativo: boolean;
    subconta_id: string | null;
    api_key_encrypted: string | null;
    split_percentual: number | string;
    split_valor_fixo: number | string;
  };
  const porTenant = new Map<string, LinhaGateway>();
  for (const g of (gateways ?? []) as LinhaGateway[]) porTenant.set(g.tenant_id, g);

  const linhas: GatewayRow[] = (tenants ?? []).map((t) => {
    const g = porTenant.get(t.id);
    return {
      tenantId: t.id,
      nome: t.nome,
      codigo: t.codigo,
      tenantAtivo: t.ativo,
      configurado: !!g?.api_key_encrypted,
      gatewayAtivo: !!g?.ativo,
      subcontaId: g?.subconta_id ?? null,
      splitPercentual: g ? Number(g.split_percentual) || 0 : 0,
      splitValorFixo: g ? Number(g.split_valor_fixo) || 0 : 0,
    };
  });

  const base = process.env.ASAAS_BASE_URL || "https://api-sandbox.asaas.com/v3";
  const ambiente: "sandbox" | "producao" = base.includes("sandbox")
    ? "sandbox"
    : "producao";

  return (
    <PagamentosClient
      linhas={linhas}
      ambiente={ambiente}
      cryptoPronto={cryptoGatewayPronto()}
    />
  );
}
