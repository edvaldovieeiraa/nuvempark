import Link from "next/link";
import { labelCaixaStatus } from "@/lib/status-labels";
import { formatarDataHora } from "@/lib/format-data";
import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { Revelar } from "@/components/ui/revelar";
import { SemPatio } from "@/components/sem-patio";
import { Banknote, ChevronRight, Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function CaixaPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const { data: sessoes } = await supabase
    .from("caixa_sessoes")
    .select(
      "id, patio_id, operador_nome, fundo_caixa, total_fechamento, status, abertura, fechamento",
    )
    .eq("patio_id", patioId)
    .order("abertura", { ascending: false })
    .limit(50);

  const abertas = (sessoes ?? []).filter((s) => s.status === "aberta").length;

  return (
    <div className="space-y-5 max-w-5xl">
      <Revelar>
        <h1 className="text-[26px] font-black tracking-tight">Caixa</h1>
        <p className="text-sm text-texto-2">
          <b className="text-texto">{patioNome}</b> ·{" "}
          {abertas > 0 ? (
            <b className="text-brand-700">
              {abertas} {abertas === 1 ? "aberta agora" : "abertas agora"}
            </b>
          ) : (
            "nenhuma aberta agora"
          )}
        </p>
      </Revelar>

      <Revelar atraso={0.08}>
        <section className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
          {(sessoes ?? []).length === 0 ? (
            <div className="px-5 py-14 flex flex-col items-center gap-3 text-center">
              <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
                <Banknote className="w-6 h-6 text-brand-600" />
              </span>
              <p className="text-sm text-texto-3 max-w-[300px]">
                Nenhuma sessão de caixa ainda. Quando um operador abrir o caixa
                no app, ela aparece aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                    <th className="px-5 py-3 font-bold">Operador</th>
                    <th className="px-5 py-3 font-bold">Abertura</th>
                    <th className="px-5 py-3 font-bold">Fechamento</th>
                    <th className="px-5 py-3 font-bold text-right">Fundo</th>
                    <th className="px-5 py-3 font-bold text-right">Total</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {(sessoes ?? []).map((s) => (
                    <tr
                      key={s.id}
                      className="border-t border-borda hover:bg-brand-50/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-bold">
                        {s.operador_nome ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-texto-2 tabular-nums whitespace-nowrap">
                        {formatarDataHora(s.abertura)}
                      </td>
                      <td className="px-5 py-3.5 text-texto-2 tabular-nums whitespace-nowrap">
                        {formatarDataHora(s.fechamento)}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        {moeda.format(Number(s.fundo_caixa) || 0)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold tabular-nums">
                        {s.total_fechamento != null
                          ? moeda.format(Number(s.total_fechamento))
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
                            s.status === "aberta"
                              ? "bg-brand-50 text-brand-700 border-brand-200"
                              : "bg-fundo text-texto-2 border-borda"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.status === "aberta"
                                ? "bg-brand-500 animate-pulse"
                                : "bg-texto-3"
                            }`}
                          />
                          {labelCaixaStatus(s.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/painel/caixa/${s.id}?patio=${patioId}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline"
                        >
                          detalhes
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </Revelar>

      {(sessoes ?? []).length === 0 && (
        <Revelar atraso={0.15}>
          <div className="flex items-center gap-2 text-xs text-texto-3">
            <Inbox className="w-4 h-4" />
            Mostrando as 50 sessões mais recentes.
          </div>
        </Revelar>
      )}
    </div>
  );
}
