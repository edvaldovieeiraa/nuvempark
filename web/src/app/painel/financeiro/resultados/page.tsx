import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { Revelar } from "@/components/ui/revelar";
import { SemPatio } from "@/components/sem-patio";
import { CalendarRange } from "lucide-react";

export const dynamic = "force-dynamic";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Resultados mês a mês (últimos 12): faturamento, saídas e ticket médio. */
export default async function ResultadosPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const inicio = new Date();
  inicio.setDate(1);
  inicio.setHours(0, 0, 0, 0);
  inicio.setMonth(inicio.getMonth() - 11);

  const supabase = await createClient();
  const { data: fechados } = await supabase
    .from("tickets")
    .select("saida, valor_cobrado")
    .eq("patio_id", patioId)
    .eq("status", "fechado")
    .gte("saida", inicio.toISOString())
    .limit(50000);

  // 12 meses, do mais recente ao mais antigo
  const meses: { chave: string; rotulo: string; total: number; saidas: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    meses.push({
      chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      rotulo: d
        .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
        .replace(/^./, (c) => c.toUpperCase()),
      total: 0,
      saidas: 0,
    });
  }

  for (const t of fechados ?? []) {
    if (!t.saida) continue;
    const d = new Date(t.saida);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const slot = meses.find((m) => m.chave === chave);
    if (slot) {
      slot.total += Number(t.valor_cobrado) || 0;
      slot.saidas += 1;
    }
  }

  const total12 = meses.reduce((s, m) => s + m.total, 0);
  const maxMes = Math.max(1, ...meses.map((m) => m.total));
  const melhorMes = meses.reduce((a, b) => (b.total > a.total ? b : a), meses[0]);

  return (
    <div className="space-y-5 max-w-5xl">
      <Revelar>
        <h1 className="text-[26px] font-black tracking-tight">Resultados</h1>
        <p className="text-sm text-texto-2">
          <b className="text-texto">{patioNome}</b> · faturamento mês a mês ·{" "}
          <b className="text-brand-700">{moeda.format(total12)}</b> nos últimos
          12 meses
          {melhorMes.total > 0 && ` · melhor mês: ${melhorMes.rotulo}`}
        </p>
      </Revelar>

      <Revelar atraso={0.08}>
        <section className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
          {total12 === 0 ? (
            <div className="px-5 py-14 flex flex-col items-center gap-3 text-center">
              <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
                <CalendarRange className="w-6 h-6 text-brand-600" />
              </span>
              <p className="text-sm text-texto-3 max-w-[320px]">
                Ainda não há faturamento registrado. Os resultados aparecem
                aqui conforme as saídas são cobradas no app.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                    <th className="px-5 py-3 font-bold">Mês</th>
                    <th className="px-5 py-3 font-bold w-[36%]">Faturamento</th>
                    <th className="px-5 py-3 font-bold text-right">Total</th>
                    <th className="px-5 py-3 font-bold text-right">Saídas</th>
                    <th className="px-5 py-3 font-bold text-right">Ticket médio</th>
                  </tr>
                </thead>
                <tbody>
                  {meses.map((m) => (
                    <tr
                      key={m.chave}
                      className="border-t border-borda hover:bg-brand-50/40 transition-colors"
                    >
                      <td className="px-5 py-3 font-bold whitespace-nowrap">
                        {m.rotulo}
                      </td>
                      <td className="px-5 py-3">
                        <div className="h-2 rounded-full bg-fundo overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-acento-teal"
                            style={{ width: `${(m.total / maxMes) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-black tabular-nums">
                        {moeda.format(m.total)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-texto-2">
                        {m.saidas}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-texto-2">
                        {m.saidas > 0 ? moeda.format(m.total / m.saidas) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </Revelar>
    </div>
  );
}
