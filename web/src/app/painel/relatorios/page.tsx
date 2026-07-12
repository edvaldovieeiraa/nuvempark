import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { RelatoriosClient } from "@/components/relatorios/relatorios-client";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();

  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - 29);

  const { data: fechados } = await supabase
    .from("tickets")
    .select("saida, valor_cobrado, forma_pagamento, motivo_isencao, tipo_veiculo")
    .eq("patio_id", patioId)
    .eq("status", "fechado")
    .gte("saida", inicio.toISOString())
    .limit(10000);

  // Agrega por dia (30 posições, do mais antigo ao hoje)
  const porDia: { dia: string; rotulo: string; total: number; saidas: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    porDia.push({
      dia: d.toISOString().slice(0, 10),
      rotulo: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      total: 0,
      saidas: 0,
    });
  }
  const porForma: Record<string, number> = {};
  const porVeiculo: Record<string, number> = {};

  for (const t of fechados ?? []) {
    if (!t.saida) continue;
    const valor = Number(t.valor_cobrado) || 0;
    const dia = new Date(t.saida);
    const chave = new Date(dia.getTime() - dia.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    const slot = porDia.find((p) => p.dia === chave);
    if (slot) {
      slot.total += valor;
      slot.saidas += 1;
    }
    const forma = t.motivo_isencao ? "isenção" : (t.forma_pagamento ?? "não informado");
    porForma[forma] = (porForma[forma] ?? 0) + valor;
    porVeiculo[t.tipo_veiculo] = (porVeiculo[t.tipo_veiculo] ?? 0) + valor;
  }

  return (
    <RelatoriosClient
      patioNome={patioNome ?? ""}
      porDia={porDia}
      porForma={Object.entries(porForma).map(([forma, total]) => ({
        forma,
        total,
      }))}
      porVeiculo={Object.entries(porVeiculo).map(([tipo, total]) => ({
        tipo,
        total,
      }))}
    />
  );
}
