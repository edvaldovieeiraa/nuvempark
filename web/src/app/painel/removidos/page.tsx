import { createClient } from "@/lib/supabase/server";
import { formatarDataHora } from "@/lib/format-data";
import { labelTicketStatus } from "@/lib/status-labels";
import { resolverPatio } from "@/lib/patio-scope";
import { Revelar } from "@/components/ui/revelar";
import { SemPatio } from "@/components/sem-patio";
import { RemovidosFiltros } from "@/components/removidos/removidos-filtros";
import { Ban, BrushCleaning } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RemovidosPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string; q?: string; di?: string; df?: string }>;
}) {
  const { patio, q, di, df } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  let query = supabase
    .from("tickets")
    .select(
      "id, placa, tipo_veiculo, status, entrada, removido_em, removido_por_nome, removido_por_email, remocao_motivo",
      { count: "exact" },
    )
    .eq("patio_id", patioId)
    .in("status", ["cancelado", "removido"]);

  if (q) query = query.ilike("placa", `%${q}%`);
  if (di) query = query.gte("removido_em", di);
  if (df) query = query.lte("removido_em", df);

  const { data: tickets, count } = await query
    .order("removido_em", { ascending: false, nullsFirst: false })
    .order("entrada", { ascending: false })
    .limit(100);

  const lista = tickets ?? [];
  const filtrando = Boolean(q || di || df);

  return (
    <div className="space-y-5 max-w-6xl">
      <Revelar>
        <h1 className="text-[26px] font-black tracking-tight">
          Tickets removidos
        </h1>
        <p className="text-sm text-texto-2">
          <b className="text-texto">{patioNome}</b> · cancelados pelo operador ou
          removidos em massa (Limpeza de Pátio) · {count ?? 0}
          {filtrando ? " no filtro" : " no total"}
          {(count ?? 0) > 100 && " · mostrando os 100 mais recentes"}
        </p>
      </Revelar>

      <RemovidosFiltros
        patioId={patioId}
        q={q ?? ""}
        di={di ?? ""}
        df={df ?? ""}
      />

      <Revelar atraso={0.08}>
        <section className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
          {lista.length === 0 ? (
            <div className="px-5 py-14 flex flex-col items-center gap-3 text-center">
              <span className="w-12 h-12 rounded-2xl bg-fundo grid place-items-center">
                <Ban className="w-6 h-6 text-texto-3" />
              </span>
              <p className="text-sm text-texto-3 max-w-[340px]">
                {filtrando
                  ? "Nenhum ticket removido com esses filtros."
                  : "Nenhum ticket cancelado ou removido — bom sinal: cancelamentos frequentes merecem atenção."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                    <th className="px-5 py-3 font-bold">Placa</th>
                    <th className="px-5 py-3 font-bold">Entrada</th>
                    <th className="px-5 py-3 font-bold">Removido em</th>
                    <th className="px-5 py-3 font-bold">Por</th>
                    <th className="px-5 py-3 font-bold">Motivo</th>
                    <th className="px-5 py-3 font-bold">Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((t) => {
                    const viaLimpeza = Boolean(t.remocao_motivo);
                    return (
                      <tr
                        key={t.id}
                        className="border-t border-borda hover:bg-brand-50/40 transition-colors align-top"
                      >
                        <td className="px-5 py-3">
                          <span className="font-black tracking-widest text-[13px] bg-fundo border border-borda rounded-md px-2 py-1">
                            {t.placa}
                          </span>
                          <span className="block text-[11px] text-texto-3 mt-1 capitalize">
                            {t.tipo_veiculo}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-texto-2 tabular-nums whitespace-nowrap">
                          {formatarDataHora(t.entrada)}
                        </td>
                        <td className="px-5 py-3 text-texto-2 tabular-nums whitespace-nowrap">
                          {formatarDataHora(t.removido_em)}
                        </td>
                        <td className="px-5 py-3 text-texto-2">
                          <span className="block">
                            {t.removido_por_nome ?? t.removido_por_email ?? "—"}
                          </span>
                          {t.removido_por_email && t.removido_por_nome && (
                            <span className="block text-[11px] text-texto-3 mt-0.5">
                              {t.removido_por_email}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-texto-2 max-w-[260px]">
                          {t.remocao_motivo ? (
                            <span className="line-clamp-2">{t.remocao_motivo}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {viaLimpeza ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border bg-perigo-bg text-perigo border-perigo/20">
                              <BrushCleaning className="w-3.5 h-3.5" />
                              limpeza
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border bg-fundo text-texto-2 border-borda">
                              <span className="w-1.5 h-1.5 rounded-full bg-texto-3" />
                              {labelTicketStatus(t.status)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </Revelar>
    </div>
  );
}
