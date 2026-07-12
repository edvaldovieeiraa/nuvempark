import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { CabecalhoCadastro } from "@/components/painel/cabecalho-cadastro";
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
      .select("id, nome, tipo, ativo")
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
    <div className="space-y-6">
      <CabecalhoCadastro
        voltarHref={`/painel/mensalistas?patio=${patioId}`}
        voltarLabel="Mensalistas"
        titulo="Planos"
        descricao={`${patioNome} · as categorias de livre passagem que aparecem no app.`}
      />
      <PlanosClient
        patioId={patioId}
        patioNome={patioNome ?? ""}
        planos={planos ?? []}
        qtdClientesPorPlano={qtdClientesPorPlano}
      />
    </div>
  );
}
