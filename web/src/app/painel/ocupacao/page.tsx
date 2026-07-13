import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { SemPatio } from "@/components/sem-patio";
import { OcupacaoClient, type TicketRaw } from "@/components/ocupacao/ocupacao-client";

export const dynamic = "force-dynamic";

export default async function OcupacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string; di?: string; df?: string }>;
}) {
  const { patio, di, df } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const agora = new Date();
  const dfUse = df ?? agora.toISOString();
  const diUse = di ?? new Date(agora.getTime() - 7 * 86_400_000).toISOString();
  // Inclui carros que entraram até 3 dias antes da janela (pernoite/multidia).
  const entradaMin = new Date(Date.parse(diUse) - 3 * 86_400_000).toISOString();

  const supabase = await createClient();
  const [{ data: tickets }, { data: patioInfo }, { data: ops }] =
    await Promise.all([
      supabase
        .from("tickets")
        .select(
          "entrada, saida, status, tipo_veiculo, operador_id, valor_cobrado, motivo_isencao",
        )
        .eq("patio_id", patioId)
        .gte("entrada", entradaMin)
        .lte("entrada", dfUse)
        .limit(20000),
      supabase.from("patios").select("qtd_vagas").eq("id", patioId).maybeSingle(),
      supabase.from("operadores").select("id, nome"),
    ]);

  const operadores: Record<string, string> = {};
  (ops ?? []).forEach((o) => {
    operadores[o.id as string] = o.nome as string;
  });

  return (
    <OcupacaoClient
      patioNome={patioNome ?? ""}
      qtdVagas={patioInfo?.qtd_vagas ?? 0}
      di={diUse}
      df={dfUse}
      tickets={(tickets ?? []) as TicketRaw[]}
      operadores={operadores}
    />
  );
}
