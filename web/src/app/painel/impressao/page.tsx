import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { ImpressaoClient } from "@/components/impressao/impressao-client";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

export default async function ImpressaoPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const { data: config } = await supabase
    .from("patio_config")
    .select("ticket_cabecalho, ticket_rodape")
    .eq("patio_id", patioId)
    .maybeSingle();

  const linhas = (v: unknown): string[] =>
    Array.isArray(v) ? (v as string[]) : [];

  return (
    <ImpressaoClient
      patioId={patioId}
      patioNome={patioNome ?? ""}
      cabecalhoInicial={linhas(config?.ticket_cabecalho)}
      rodapeInicial={linhas(config?.ticket_rodape)}
    />
  );
}
