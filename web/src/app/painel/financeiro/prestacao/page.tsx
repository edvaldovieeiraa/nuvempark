import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { Revelar } from "@/components/ui/revelar";
import { SemPatio } from "@/components/sem-patio";
import { FileCheck2 } from "lucide-react";

export const dynamic = "force-dynamic";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Prestação de contas: cada fechamento de caixa com o valor esperado
 * (fundo + entradas − sangrias), o valor contado pelo operador e a
 * divergência — a ferramenta de auditoria do gestor.
 */
export default async function PrestacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const [{ data: sessoes }, { data: movimentos }] = await Promise.all([
    supabase
      .from("caixa_sessoes")
      .select(
        "id, operador_nome, fundo_caixa, total_fechamento, abertura, fechamento, observacao_fechamento",
      )
      .eq("patio_id", patioId)
      .eq("status", "fechada")
      .order("fechamento", { ascending: false })
      .limit(60),
    supabase
      .from("caixa_movimentos")
      .select("caixa_sessao_id, tipo, valor")
      .eq("patio_id", patioId)
      .limit(10000),
  ]);

  // Esperado por sessão = fundo + entradas − sangrias
  const somas: Record<string, { entradas: number; sangrias: number }> = {};
  for (const m of movimentos ?? []) {
    const s = (somas[m.caixa_sessao_id] ??= { entradas: 0, sangrias: 0 });
    if (m.tipo === "entrada") s.entradas += Number(m.valor) || 0;
    if (m.tipo === "sangria") s.sangrias += Number(m.valor) || 0;
  }

  const linhas = (sessoes ?? []).map((s) => {
    const mov = somas[s.id] ?? { entradas: 0, sangrias: 0 };
    const esperado = (Number(s.fundo_caixa) || 0) + mov.entradas - mov.sangrias;
    const contado = Number(s.total_fechamento ?? esperado);
    return {
      ...s,
      entradas: mov.entradas,
      sangrias: mov.sangrias,
      esperado,
      contado,
      divergencia: contado - esperado,
    };
  });

  const totalDivergencia = linhas.reduce((t, l) => t + l.divergencia, 0);
  const comDivergencia = linhas.filter((l) => Math.abs(l.divergencia) > 0.01).length;

  return (
    <div className="space-y-5 max-w-6xl">
      <Revelar>
        <h1 className="text-[26px] font-black tracking-tight">
          Prestação de contas
        </h1>
        <p className="text-sm text-texto-2">
          <b className="text-texto">{patioNome}</b> · cada fechamento de caixa,
          o valor esperado e o que foi contado ·{" "}
          {comDivergencia > 0 ? (
            <b className={totalDivergencia < 0 ? "text-perigo" : "text-aviso"}>
              {comDivergencia}{" "}
              {comDivergencia === 1 ? "fechamento" : "fechamentos"} com
              divergência ({moeda.format(totalDivergencia)})
            </b>
          ) : (
            <b className="text-brand-700">nenhuma divergência</b>
          )}
        </p>
      </Revelar>

      <Revelar atraso={0.08}>
        <section className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
          {linhas.length === 0 ? (
            <div className="px-5 py-14 flex flex-col items-center gap-3 text-center">
              <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
                <FileCheck2 className="w-6 h-6 text-brand-600" />
              </span>
              <p className="text-sm text-texto-3 max-w-[320px]">
                Nenhum caixa fechado ainda. Assim que um operador fechar o
                caixa no app, a prestação de contas aparece aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                    <th className="px-5 py-3 font-bold">Fechamento</th>
                    <th className="px-5 py-3 font-bold">Operador</th>
                    <th className="px-5 py-3 font-bold text-right">Fundo</th>
                    <th className="px-5 py-3 font-bold text-right">Entradas</th>
                    <th className="px-5 py-3 font-bold text-right">Sangrias</th>
                    <th className="px-5 py-3 font-bold text-right">Esperado</th>
                    <th className="px-5 py-3 font-bold text-right">Contado</th>
                    <th className="px-5 py-3 font-bold text-right">Divergência</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => {
                    const ok = Math.abs(l.divergencia) <= 0.01;
                    return (
                      <tr
                        key={l.id}
                        className={`border-t border-borda hover:bg-brand-50/40 transition-colors ${
                          ok ? "" : "bg-aviso-bg/30"
                        }`}
                      >
                        <td className="px-5 py-3 text-texto-2 tabular-nums whitespace-nowrap">
                          {l.fechamento
                            ? new Date(l.fechamento).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-5 py-3 font-bold">
                          {l.operador_nome ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-texto-2">
                          {moeda.format(Number(l.fundo_caixa) || 0)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-brand-700 font-semibold">
                          {moeda.format(l.entradas)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-perigo">
                          {l.sangrias > 0 ? `−${moeda.format(l.sangrias)}` : "—"}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-bold">
                          {moeda.format(l.esperado)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-bold">
                          {moeda.format(l.contado)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className={`inline-block text-xs font-black px-2.5 py-1 rounded-full border tabular-nums ${
                              ok
                                ? "bg-brand-50 text-brand-700 border-brand-200"
                                : l.divergencia < 0
                                  ? "bg-perigo-bg text-perigo border-perigo/20"
                                  : "bg-aviso-bg text-aviso border-aviso/25"
                            }`}
                            title={l.observacao_fechamento ?? undefined}
                          >
                            {ok
                              ? "OK"
                              : `${l.divergencia > 0 ? "+" : ""}${moeda.format(l.divergencia)}`}
                          </span>
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

      {linhas.some((l) => l.observacao_fechamento) && (
        <Revelar atraso={0.12}>
          <p className="text-xs text-texto-3">
            Passe o mouse sobre a divergência para ver a observação do operador.
          </p>
        </Revelar>
      )}
    </div>
  );
}
