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
  const { data: tarifas } = await supabase
    .from("tarifas")
    .select("*")
    .eq("patio_id", patioId)
    .eq("ativo", true)
    .order("ordem")
    .order("nome");

  return (
    <TarifasClient
      tarifas={tarifas ?? []}
      patioId={patioId}
      patioNome={patioNome ?? ""}
    />
  );
}
