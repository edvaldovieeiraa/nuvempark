import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { PlanosClient } from "@/components/mensalistas/planos-client";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const [{ data: planos }, { data: clientes }] = await Promise.all([
    supabase
      .from("planos")
      .select("id, nome, tipo, valor, ativo")
      .eq("patio_id", patioId)
      .order("ordem")
      .order("nome"),
    supabase
      .from("clientes")
      .select("plano_id")
      .eq("patio_id", patioId)
      .eq("ativo", true),
  ]);

  const qtdClientesPorPlano: Record<string, number> = {};
  for (const c of clientes ?? []) {
    if (c.plano_id)
      qtdClientesPorPlano[c.plano_id] =
        (qtdClientesPorPlano[c.plano_id] ?? 0) + 1;
  }

  return (
    <PlanosClient
      patioId={patioId}
      patioNome={patioNome ?? ""}
      voltarHref={`/painel/mensalistas?patio=${patioId}`}
      planos={planos ?? []}
      qtdClientesPorPlano={qtdClientesPorPlano}
    />
  );
}
