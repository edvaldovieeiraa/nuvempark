import { createAdminClient } from "@/lib/supabase/admin";
import {
  InadimplenciaClient,
  type RedeVencida,
} from "@/components/master/inadimplencia-client";
import { emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";

type RawFatura = {
  id: string;
  tenant_id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  tenants: { nome: string; codigo: string } | null;
};

export default async function InadimplenciaPage() {
  const sb = createAdminClient();
  await sb.rpc("fn_marcar_faturas_vencidas");

  const [{ data: vencidas }, { data: assinaturas }] = await Promise.all([
    sb
      .from("faturas")
      .select("id, tenant_id, competencia, vencimento, valor, tenants(nome, codigo)")
      .eq("estado", "vencida")
      .order("vencimento", { ascending: true })
      .limit(5000),
    sb.from("assinaturas").select("tenant_id, estado, email_cobranca"),
  ]);

  const estadoPorTenant: Record<string, { estado: string; email: string | null }> = {};
  for (const a of assinaturas ?? [])
    estadoPorTenant[a.tenant_id] = {
      estado: a.estado,
      email: a.email_cobranca ?? null,
    };

  // agrupa faturas vencidas por rede
  const mapa = new Map<string, RedeVencida>();
  for (const f of (vencidas as unknown as RawFatura[]) ?? []) {
    const chave = f.tenant_id;
    const atual =
      mapa.get(chave) ??
      ({
        tenantId: f.tenant_id,
        rede: f.tenants?.nome ?? "—",
        codigo: f.tenants?.codigo ?? "",
        total: 0,
        qtdFaturas: 0,
        maisAntiga: f.vencimento,
        suspensa: estadoPorTenant[f.tenant_id]?.estado === "suspensa",
        temEmail: !!estadoPorTenant[f.tenant_id]?.email,
        faturas: [],
      } as RedeVencida);
    atual.total += Number(f.valor);
    atual.qtdFaturas += 1;
    if (f.vencimento < atual.maisAntiga) atual.maisAntiga = f.vencimento;
    atual.faturas.push({
      id: f.id,
      competencia: f.competencia,
      vencimento: f.vencimento,
      valor: Number(f.valor),
    });
    mapa.set(chave, atual);
  }

  const redes = [...mapa.values()].sort((a, b) => b.total - a.total);

  return <InadimplenciaClient redes={redes} emailAtivo={emailConfigurado()} />;
}
