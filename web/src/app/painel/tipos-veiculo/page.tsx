import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { TiposVeiculoClient } from "@/components/tipos-veiculo/tipos-veiculo-client";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

export default async function TiposVeiculoPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const [{ data: config }, { data: tarifas }] = await Promise.all([
    supabase
      .from("patio_config")
      .select("tipos_veiculo")
      .eq("patio_id", patioId)
      .maybeSingle(),
    supabase
      .from("tarifas")
      .select("tipo_veiculo")
      .eq("patio_id", patioId)
      .eq("ativo", true),
  ]);

  const tipos = Array.isArray(config?.tipos_veiculo)
    ? (config.tipos_veiculo as string[])
    : ["carro", "moto", "caminhonete", "van"];

  const tiposEmUso = Array.from(
    new Set((tarifas ?? []).map((t) => t.tipo_veiculo)),
  );

  return (
    <TiposVeiculoClient
      patioId={patioId}
      patioNome={patioNome ?? ""}
      tiposIniciais={tipos}
      tiposEmUso={tiposEmUso}
    />
  );
}
