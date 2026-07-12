import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { Revelar } from "@/components/ui/revelar";
import { SemPatio } from "@/components/sem-patio";
import { SyncBadge } from "@/components/sync-badge";
import { ultimaSincronizacao } from "@/lib/patio-scope";
import { ParkingSquare, Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PatioAgoraPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const [{ data: abertos }, { data: patioInfo }, sincronizadoEm] =
    await Promise.all([
      supabase
        .from("tickets")
        .select("id, placa, tipo_veiculo, entrada, origem")
        .eq("patio_id", patioId)
        .eq("status", "aberto")
        .order("entrada", { ascending: false }),
      supabase
        .from("patios")
        .select("qtd_vagas")
        .eq("id", patioId)
        .maybeSingle(),
      ultimaSincronizacao(patioId),
    ]);

  const veiculos = abertos ?? [];
  const vagas = patioInfo?.qtd_vagas ?? 0;
  const pct = vagas > 0 ? Math.min(100, (veiculos.length / vagas) * 100) : 0;

  return (
    <div className="space-y-5 max-w-5xl">
      <Revelar>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[26px] font-black tracking-tight">Pátio</h1>
            <p className="text-sm text-texto-2">
              <b className="text-texto">{patioNome}</b> · veículos dentro do
              pátio agora
            </p>
          </div>
          <SyncBadge iso={sincronizadoEm} />
        </div>
      </Revelar>

      {/* Ocupação */}
      <Revelar atraso={0.06}>
        <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm font-bold">Ocupação</span>
            <span className="text-2xl font-black tabular-nums">
              {veiculos.length}
              {vagas > 0 && (
                <span className="text-base text-texto-3 font-bold"> / {vagas}</span>
              )}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-fundo overflow-hidden">
            <div
              className={`h-full rounded-full ${
                pct >= 90
                  ? "bg-gradient-to-r from-saida to-perigo"
                  : "bg-gradient-to-r from-brand-500 to-acento-teal"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Revelar>

      {/* Lista */}
      <Revelar atraso={0.1}>
        <section className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
          {veiculos.length === 0 ? (
            <div className="px-5 py-14 flex flex-col items-center gap-3 text-center">
              <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
                <ParkingSquare className="w-6 h-6 text-brand-600" />
              </span>
              <p className="text-sm text-texto-3">
                Nenhum veículo no pátio agora.
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
                    <th className="px-5 py-3 font-bold">Permanência</th>
                  </tr>
                </thead>
                <tbody>
                  {veiculos.map((t) => (
                    <tr
                      key={t.id}
                      className="border-t border-borda hover:bg-brand-50/40 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className="font-black tracking-widest text-[13px] bg-fundo border border-borda rounded-md px-2 py-1">
                          {t.placa}
                        </span>
                        {t.origem === "plano" && (
                          <span className="ml-2 text-[10px] font-bold text-info bg-info-bg rounded-full px-2 py-0.5">
                            mensalista
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-texto-2 capitalize">
                        {t.tipo_veiculo}
                      </td>
                      <td className="px-5 py-3 text-texto-2 tabular-nums">
                        {new Date(t.entrada).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3 font-bold tabular-nums">
                        {permanencia(t.entrada)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </Revelar>

      {veiculos.length > 0 && (
        <Revelar atraso={0.15}>
          <div className="flex items-center gap-2 text-xs text-texto-3">
            <Inbox className="w-4 h-4" />
            Atualize a página para recalcular as permanências.
          </div>
        </Revelar>
      )}
    </div>
  );
}

function permanencia(entrada: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(entrada).getTime()) / 60000));
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h${String(min % 60).padStart(2, "0")}`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
