import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { TarifasClient } from "@/components/tarifas/tarifas-client";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

export default async function TarifasPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const [{ data: tarifas }, { data: config }] = await Promise.all([
    supabase
      .from("tarifas")
      .select("*")
      .eq("patio_id", patioId)
      .eq("ativo", true)
      .order("ordem")
      .order("nome"),
    supabase
      .from("patio_config")
      .select("tipos_veiculo")
      .eq("patio_id", patioId)
      .maybeSingle(),
  ]);

  const tipos = Array.isArray(config?.tipos_veiculo)
    ? (config.tipos_veiculo as string[])
    : ["carro", "moto", "caminhonete", "van"];

  // Contratos (motor v2, só simulação) vão para a seção própria: ficam fora da
  // ordem, da tarifa padrão do app, dos KPIs e do formulário de edição das
  // tarifas, que os regravaria como avulsos.
  const todas = tarifas ?? [];
  const contratos = todas
    .filter((t) => t.modalidade === "contrato")
    .map((t) => ({
      id: String(t.id),
      nome: String(t.nome),
      tipo_veiculo: String(t.tipo_veiculo),
      contrato: t.contrato as unknown,
    }));

  return (
    <TarifasClient
      tarifas={todas.filter((t) => t.modalidade !== "contrato")}
      contratos={contratos}
      patioId={patioId}
      patioNome={patioNome ?? ""}
      tipos={tipos}
    />
  );
}
