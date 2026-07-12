import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { MensalistasClient } from "@/components/mensalistas/mensalistas-client";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

export default async function MensalistasPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();

  const [{ data: planos }, { data: clientes }, { data: veiculos }] =
    await Promise.all([
      supabase
        .from("planos")
        .select("id, nome, tipo, patio_id, ativo")
        .eq("patio_id", patioId)
        .order("ordem")
        .order("nome"),
      supabase
        .from("clientes")
        .select(
          "id, nome, documento, telefone, patio_id, plano_id, vencimento, vagas, bloqueado, ativo",
        )
        .eq("patio_id", patioId)
        .eq("ativo", true)
        .order("nome"),
      supabase
        .from("cliente_veiculos")
        .select("id, cliente_id, placa, descricao")
        .eq("patio_id", patioId),
    ]);

  return (
    <MensalistasClient
      patioId={patioId}
      patioNome={patioNome ?? ""}
      planos={planos ?? []}
      clientes={clientes ?? []}
      veiculos={veiculos ?? []}
    />
  );
}
