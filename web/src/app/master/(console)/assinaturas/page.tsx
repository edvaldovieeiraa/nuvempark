import { createAdminClient } from "@/lib/supabase/admin";
import {
  AssinaturasListaClient,
  type LinhaAssinatura,
} from "@/components/master/assinaturas-lista-client";

export const dynamic = "force-dynamic";

type RawAssinatura = {
  tenant_id: string;
  estado: string;
  valor_por_patio: number;
  dia_vencimento: number;
  trial_expira_em: string | null;
  email_cobranca: string | null;
  tenants: { nome: string; codigo: string } | null;
};

type RawFatura = {
  tenant_id: string;
  vencimento: string;
  valor: number;
  estado: string;
};

export default async function AssinaturasPage() {
  const sb = createAdminClient();

  // Manutenção oportunista: mantém estados coerentes ao abrir a gestão.
  await sb.rpc("fn_expirar_trials");
  await sb.rpc("fn_marcar_faturas_vencidas");

  const [{ data: assinaturas }, { data: patios }, { data: faturas }] =
    await Promise.all([
      sb
        .from("assinaturas")
        .select(
          "tenant_id, estado, valor_por_patio, dia_vencimento, trial_expira_em, email_cobranca, tenants(nome, codigo)",
        ),
      sb.from("patios").select("tenant_id, ativo"),
      sb
        .from("faturas")
        .select("tenant_id, vencimento, valor, estado")
        .in("estado", ["aberta", "vencida"]),
    ]);

  // pátios ativos por tenant
  const patiosAtivos: Record<string, number> = {};
  for (const p of patios ?? [])
    if (p.ativo)
      patiosAtivos[p.tenant_id] = (patiosAtivos[p.tenant_id] ?? 0) + 1;

  // faturas em aberto (aberta+vencida) agregadas por tenant
  const abertoPorTenant: Record<
    string,
    { total: number; qtdVencidas: number; totalVencido: number; proximoVenc: string | null }
  > = {};
  for (const f of (faturas as unknown as RawFatura[]) ?? []) {
    const acc =
      abertoPorTenant[f.tenant_id] ??
      (abertoPorTenant[f.tenant_id] = {
        total: 0,
        qtdVencidas: 0,
        totalVencido: 0,
        proximoVenc: null,
      });
    acc.total += Number(f.valor);
    if (f.estado === "vencida") {
      acc.qtdVencidas += 1;
      acc.totalVencido += Number(f.valor);
    }
    if (!acc.proximoVenc || f.vencimento < acc.proximoVenc)
      acc.proximoVenc = f.vencimento;
  }

  const linhas: LinhaAssinatura[] = (
    (assinaturas as unknown as RawAssinatura[]) ?? []
  )
    .map((a) => {
      const patiosQtd = patiosAtivos[a.tenant_id] ?? 0;
      const valorPorPatio = Number(a.valor_por_patio) || 0;
      const aberto = abertoPorTenant[a.tenant_id];
      return {
        tenantId: a.tenant_id,
        rede: a.tenants?.nome ?? "—",
        codigo: a.tenants?.codigo ?? "",
        estado: a.estado,
        valorPorPatio,
        patiosAtivos: patiosQtd,
        mensalidade: valorPorPatio * patiosQtd,
        diaVencimento: a.dia_vencimento,
        temEmailCobranca: !!a.email_cobranca,
        totalEmAberto: aberto?.total ?? 0,
        qtdVencidas: aberto?.qtdVencidas ?? 0,
        totalVencido: aberto?.totalVencido ?? 0,
        proximoVencimento: aberto?.proximoVenc ?? null,
      };
    })
    .sort((a, b) => {
      // ordena: quem tem vencido primeiro, depois maior mensalidade
      if ((b.totalVencido > 0 ? 1 : 0) !== (a.totalVencido > 0 ? 1 : 0))
        return (b.totalVencido > 0 ? 1 : 0) - (a.totalVencido > 0 ? 1 : 0);
      return b.mensalidade - a.mensalidade;
    });

  return <AssinaturasListaClient assinaturas={linhas} />;
}
