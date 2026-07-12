import { createClient } from "@/lib/supabase/server";
import { DashboardLive } from "@/components/dashboard-live";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const supabase = await createClient();

  // Pátios da rede (RLS: só os do tenant do gestor).
  const { data: patios } = await supabase
    .from("patios")
    .select("id, nome, qtd_vagas, codigo_acesso")
    .eq("ativo", true)
    .order("nome");

  const lista = patios ?? [];
  if (lista.length === 0) return <SemPatio />;

  // Pátio em escopo: o do seletor (?patio) ou o primeiro.
  const selecionado = lista.find((p) => p.id === patio) ?? lista[0];

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [abertosTodos, fechadosHoje, { data: recentes }, { data: ultimoSync }] =
    await Promise.all([
      // Abertos de TODOS os pátios (alimenta o widget "Ocupação por pátio").
      supabase.from("tickets").select("id, patio_id").eq("status", "aberto"),
      // KPIs do pátio selecionado.
      supabase
        .from("tickets")
        .select("valor_cobrado, saida")
        .eq("patio_id", selecionado.id)
        .eq("status", "fechado")
        .gte("saida", hoje.toISOString()),
      supabase
        .from("tickets")
        .select(
          "id, placa, tipo_veiculo, status, entrada, saida, valor_cobrado, patio_id",
        )
        .eq("patio_id", selecionado.id)
        .order("atualizado_em", { ascending: false })
        .limit(10),
      supabase
        .from("tickets")
        .select("sincronizado_em")
        .eq("patio_id", selecionado.id)
        .not("sincronizado_em", "is", null)
        .order("sincronizado_em", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const abertosPorPatio: Record<string, number> = {};
  for (const t of abertosTodos.data ?? []) {
    abertosPorPatio[t.patio_id] = (abertosPorPatio[t.patio_id] ?? 0) + 1;
  }

  const faturamentoHoje = (fechadosHoje.data ?? []).reduce(
    (s, t) => s + (Number(t.valor_cobrado) || 0),
    0,
  );

  return (
    <DashboardLive
      inicial={{
        patios: lista,
        patioNome: selecionado.nome,
        patioCodigo: selecionado.codigo_acesso ?? null,
        noPatio: abertosPorPatio[selecionado.id] ?? 0,
        totalVagas: selecionado.qtd_vagas || 0,
        faturamentoHoje,
        saidasHoje: fechadosHoje.data?.length ?? 0,
        recentes: recentes ?? [],
        abertosPorPatio,
        sincronizadoEm: ultimoSync?.sincronizado_em ?? null,
      }}
    />
  );
}
