import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { OperadoresClient } from "@/components/operadores/operadores-client";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

export default async function OperadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();

  // Operadores com acesso a ESTE pátio (via junção operador_patios).
  const { data: vinculos } = await supabase
    .from("operador_patios")
    .select("operador_id")
    .eq("patio_id", patioId);

  const ids = (vinculos ?? []).map((v) => v.operador_id);
  const { data: operadores } = ids.length
    ? await supabase
        .from("operadores")
        .select("id, nome, usuario, ativo, criado_em")
        .in("id", ids)
        .order("nome")
    : { data: [] };

  return (
    <OperadoresClient
      operadores={operadores ?? []}
      patioId={patioId}
      patioNome={patioNome ?? ""}
    />
  );
}
