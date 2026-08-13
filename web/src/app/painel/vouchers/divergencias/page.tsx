import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { SemPatio } from "@/components/sem-patio";
import { DivergenciasClient } from "@/components/vouchers/divergencias-client";

export const dynamic = "force-dynamic";

export default async function DivergenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();

  // Liberação ativa cujo ticket JÁ FECHOU sem `valor_abatido`.
  //
  // O `tickets.status = 'fechado'` é o que separa divergência de normalidade:
  // liberação sem valor com o ticket ABERTO é o caso corrente — o carro ainda
  // está no pátio e o desconto só existe na saída. Sem esse filtro, a tela
  // listaria todo voucher recém-criado como problema.
  const { data: divergencias } = await supabase
    .from("liberacoes")
    .select(
      "id, ticket_id, liberado_em, parceiros(nome), voucher_regras(nome), tickets!inner(placa, saida, status, valor_cobrado)",
    )
    .eq("patio_id", patioId)
    .is("cancelada_em", null)
    .is("valor_abatido", null)
    .eq("tickets.status", "fechado")
    .order("liberado_em", { ascending: false })
    .limit(100);

  const um = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const linhas = (divergencias ?? []).map((d) => {
    const t = um(
      d.tickets as unknown as {
        placa: string;
        saida: string | null;
        valor_cobrado: number | null;
      } | null,
    );
    return {
      id: d.id as string,
      ticketId: d.ticket_id as string,
      liberadoEm: d.liberado_em as string,
      parceiro: um(d.parceiros as unknown as { nome: string } | null)?.nome ?? "—",
      regra: um(d.voucher_regras as unknown as { nome: string } | null)?.nome ?? "—",
      placa: t?.placa ?? "—",
      saida: t?.saida ?? null,
      valorCobrado: t?.valor_cobrado ?? null,
    };
  });

  return <DivergenciasClient linhas={linhas} patioNome={patioNome ?? ""} />;
}
