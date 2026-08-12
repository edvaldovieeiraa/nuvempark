import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { SemPatio } from "@/components/sem-patio";
import { ParceirosClient } from "@/components/vouchers/parceiros-client";

export const dynamic = "force-dynamic";

export default async function ParceirosPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const [{ data: parceiros }, { data: regras }, { data: vinculos }] =
    await Promise.all([
      supabase
        .from("parceiros")
        .select("*")
        .eq("patio_id", patioId)
        .order("ativo", { ascending: false })
        .order("nome"),
      // Só as ativas entram como opção. As inativas continuam existindo para o
      // histórico, mas conceder uma delas a um parceiro novo não faria sentido:
      // `liberar_ticket` (db/34) recusa regra inativa.
      supabase
        .from("voucher_regras")
        .select("id, nome, abater_minutos, desconto_percentual, desconto_valor")
        .eq("patio_id", patioId)
        .eq("ativo", true)
        .order("nome"),
      supabase.from("parceiro_regras").select("parceiro_id, regra_id"),
    ]);

  return (
    <ParceirosClient
      parceiros={parceiros ?? []}
      regras={regras ?? []}
      vinculos={vinculos ?? []}
      patioId={patioId}
      patioNome={patioNome ?? ""}
    />
  );
}
