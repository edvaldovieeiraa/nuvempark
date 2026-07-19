import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DashboardLive } from "@/components/dashboard-live";
import { OnboardingGate } from "@/components/onboarding/onboarding-wizard";

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
  // Rede nova sem pátios → onboarding guiado (pátio, tarifa, ticket, operador).
  if (lista.length === 0) return <OnboardingGate />;

  // Pátio em escopo: cookie do seletor (np_patio) > ?patio > primeiro.
  const cookiePatio = (await cookies()).get("np_patio")?.value;
  const alvo = cookiePatio ?? patio;
  const selecionado = lista.find((p) => p.id === alvo) ?? lista[0];

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicioAno = new Date(hoje.getFullYear(), 0, 1);

  const [
    abertosTodos,
    { data: fechadosAno },
    { data: recentes },
    { data: ultimoSync },
    { count: mensalistas },
  ] = await Promise.all([
      // Abertos de TODOS os pátios (alimenta o widget "Ocupação por pátio").
      supabase.from("tickets").select("id, patio_id").eq("status", "aberto"),
      // Fechados do ANO (pátio selecionado): alimenta faturamento hoje/mês/ano,
      // séries do gráfico e comparativos — uma query só.
      supabase
        .from("tickets")
        .select("valor_cobrado, saida")
        .eq("patio_id", selecionado.id)
        .eq("status", "fechado")
        .gte("saida", inicioAno.toISOString()),
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
      // Mensalistas do pátio (contagem para o card do dashboard).
      supabase
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("patio_id", selecionado.id),
    ]);

  const abertosPorPatio: Record<string, number> = {};
  for (const t of abertosTodos.data ?? []) {
    abertosPorPatio[t.patio_id] = (abertosPorPatio[t.patio_id] ?? 0) + 1;
  }

  // ── Buckets de faturamento a partir dos fechados do ano ──
  const mesAtual = hoje.getMonth();
  const mensal = Array<number>(12).fill(0); // jan..dez
  const diario = new Map<string, number>(); // yyyy-mm-dd → total
  const chaveDia = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  for (const t of fechadosAno ?? []) {
    if (!t.saida) continue;
    const d = new Date(t.saida);
    const v = Number(t.valor_cobrado) || 0;
    mensal[d.getMonth()] += v;
    diario.set(chaveDia(d), (diario.get(chaveDia(d)) ?? 0) + v);
  }

  const faturamentoAno = mensal.reduce((s, v) => s + v, 0);
  const faturamentoMes = mensal[mesAtual];
  const mesAnterior = mesAtual > 0 ? mensal[mesAtual - 1] : 0;
  const deltaMes =
    mesAnterior > 0
      ? Math.round(((faturamentoMes - mesAnterior) / mesAnterior) * 100)
      : null;

  const faturamentoHoje = diario.get(chaveDia(hoje)) ?? 0;
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  const faturamentoOntem = diario.get(chaveDia(ontem)) ?? 0;
  const deltaHoje =
    faturamentoOntem > 0
      ? Math.round(((faturamentoHoje - faturamentoOntem) / faturamentoOntem) * 100)
      : null;
  const saidasHoje = (fechadosAno ?? []).filter(
    (t) => t.saida && new Date(t.saida) >= hoje,
  ).length;

  // Série mensal (jan..mês atual) para as barrinhas do card do ano.
  const serieMensal = mensal.slice(0, mesAtual + 1);
  // Sparkline do hero: total diário dos últimos 14 dias.
  const sparkline: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    sparkline.push(diario.get(chaveDia(d)) ?? 0);
  }

  return (
    <DashboardLive
      inicial={{
        patioNome: selecionado.nome,
        patioCodigo: selecionado.codigo_acesso ?? null,
        noPatio: abertosPorPatio[selecionado.id] ?? 0,
        totalVagas: selecionado.qtd_vagas || 0,
        faturamentoHoje,
        deltaHoje,
        saidasHoje,
        mensalistas: mensalistas ?? 0,
        faturamentoMes,
        deltaMes,
        faturamentoAno,
        serieMensal,
        sparkline,
        recentes: recentes ?? [],
        sincronizadoEm: ultimoSync?.sincronizado_em ?? null,
      }}
    />
  );
}
