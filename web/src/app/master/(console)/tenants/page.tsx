import { createAdminClient } from "@/lib/supabase/admin";
import { TenantsClient, type TenantRow } from "@/components/master/tenants-client";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const sb = createAdminClient();

  const [{ data: tenants }, { data: patios }, { data: assinaturas }] =
    await Promise.all([
      sb
        .from("tenants")
        .select("id, nome, codigo, ativo, criado_em")
        .order("criado_em", { ascending: false }),
      sb.from("patios").select("tenant_id, ativo"),
      sb
        .from("assinaturas")
        .select(
          "tenant_id, valor_por_patio, estado, vencimento, trial_expira_em, origem",
        ),
    ]);

  const patiosPorTenant: Record<string, { total: number; ativos: number }> = {};
  for (const p of patios ?? []) {
    const e = (patiosPorTenant[p.tenant_id] ??= { total: 0, ativos: 0 });
    e.total++;
    if (p.ativo) e.ativos++;
  }

  const assinaturaPorTenant: Record<
    string,
    {
      valor_por_patio: number;
      estado: string;
      vencimento: string | null;
      trial_expira_em: string | null;
      origem: string;
    }
  > = {};
  for (const a of assinaturas ?? []) {
    assinaturaPorTenant[a.tenant_id] = {
      valor_por_patio: Number(a.valor_por_patio) || 0,
      estado: a.estado,
      vencimento: a.vencimento,
      trial_expira_em: a.trial_expira_em ?? null,
      origem: a.origem ?? "master",
    };
  }

  const linhas: TenantRow[] = (tenants ?? []).map((t) => {
    const p = patiosPorTenant[t.id] ?? { total: 0, ativos: 0 };
    const a = assinaturaPorTenant[t.id];
    return {
      id: t.id,
      nome: t.nome,
      codigo: t.codigo,
      ativo: t.ativo,
      criadoEm: t.criado_em,
      patiosAtivos: p.ativos,
      patiosTotal: p.total,
      valorPorPatio: a?.valor_por_patio ?? 0,
      estadoAssinatura: a?.estado ?? "ativa",
      mensalidade: (a?.valor_por_patio ?? 0) * p.ativos,
      trialExpiraEm: a?.trial_expira_em ?? null,
      origem: a?.origem ?? "master",
    };
  });

  return <TenantsClient tenants={linhas} />;
}
