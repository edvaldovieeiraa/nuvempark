import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { SemPatio } from "@/components/sem-patio";
import { RegrasClient } from "@/components/vouchers/regras-client";

export const dynamic = "force-dynamic";

export default async function RegrasVoucherPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  // Inclui as inativas: elas continuam aparecendo no extrato dos parceiros e o
  // gestor precisa conseguir reativar sem recriar.
  const { data: regras, error } = await supabase
    .from("voucher_regras")
    .select("*")
    .eq("patio_id", patioId)
    .order("ativo", { ascending: false })
    .order("nome");
  // Lista vazia e erro parecem iguais na tela; no log não.
  if (error) console.error("[painel/vouchers] listar regras:", error);

  return (
    <RegrasClient
      regras={regras ?? []}
      patioId={patioId}
      patioNome={patioNome ?? ""}
    />
  );
}
