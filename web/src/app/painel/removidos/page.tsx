import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { Revelar } from "@/components/ui/revelar";
import { SemPatio } from "@/components/sem-patio";
import { Ban } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RemovidosPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const { data: tickets, count } = await supabase
    .from("tickets")
    .select("id, placa, tipo_veiculo, status, entrada, saida, motivo_isencao", {
      count: "exact",
    })
    .eq("patio_id", patioId)
    .in("status", ["cancelado", "removido"])
    .order("entrada", { ascending: false })
    .limit(100);

  const lista = tickets ?? [];

  return (
    <div className="space-y-5 max-w-5xl">
      <Revelar>
        <h1 className="text-[26px] font-black tracking-tight">
          Tickets removidos
        </h1>
        <p className="text-sm text-texto-2">
          <b className="text-texto">{patioNome}</b> · tickets cancelados ou
          removidos pelo operador · {count ?? 0} no total
          {(count ?? 0) > 100 && " · mostrando os 100 mais recentes"}
        </p>
      </Revelar>

      <Revelar atraso={0.08}>
        <section className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
          {lista.length === 0 ? (
            <div className="px-5 py-14 flex flex-col items-center gap-3 text-center">
              <span className="w-12 h-12 rounded-2xl bg-fundo grid place-items-center">
                <Ban className="w-6 h-6 text-texto-3" />
              </span>
              <p className="text-sm text-texto-3 max-w-[320px]">
                Nenhum ticket cancelado ou removido — bom sinal: cancelamentos
                frequentes merecem atenção.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                    <th className="px-5 py-3 font-bold">Placa</th>
                    <th className="px-5 py-3 font-bold">Tipo</th>
                    <th className="px-5 py-3 font-bold">Entrada</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((t) => (
                    <tr
                      key={t.id}
                      className="border-t border-borda hover:bg-brand-50/40 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className="font-black tracking-widest text-[13px] bg-fundo border border-borda rounded-md px-2 py-1">
                          {t.placa}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-texto-2 capitalize">
                        {t.tipo_veiculo}
                      </td>
                      <td className="px-5 py-3 text-texto-2 tabular-nums">
                        {new Date(t.entrada).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border bg-perigo-bg text-perigo border-perigo/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-perigo" />
                          {t.status}
                        </span>
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
