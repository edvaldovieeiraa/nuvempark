import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function HistoricoParceiroPage() {
  const supabase = await createClient();

  // RLS de db/33: só as liberações do próprio parceiro. Sem filtro aqui.
  const { data: liberacoes } = await supabase
    .from("liberacoes")
    .select("id, ticket_id, liberado_em, cancelada_em, regra_id")
    .order("liberado_em", { ascending: false })
    .limit(100);

  // As regras vêm à parte porque a RLS já restringe o que ele pode ver, e um
  // join embutido no PostgREST exigiria relação declarada — mais acoplamento
  // do que a tela precisa.
  const { data: regras } = await supabase
    .from("voucher_regras")
    .select("id, nome");
  const nomeDaRegra = new Map((regras ?? []).map((r) => [r.id, r.nome]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-texto">Histórico</h1>
        <p className="text-sm text-texto-2 mt-0.5">
          As últimas liberações feitas pelo seu acesso.
        </p>
      </div>

      {(liberacoes ?? []).length === 0 ? (
        <p className="text-sm text-texto-2 text-center py-10">
          Nenhuma liberação ainda.
        </p>
      ) : (
        <ul className="divide-y divide-borda rounded-2xl border border-borda bg-superficie">
          {(liberacoes ?? []).map((l) => (
            <li key={l.id} className="flex items-center gap-3 p-3.5">
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-texto">
                  {nomeDaRegra.get(l.regra_id) ?? "Voucher"}
                </span>
                <span className="block text-xs text-texto-2 truncate">
                  {dataHora.format(new Date(l.liberado_em))} · ticket{" "}
                  {l.ticket_id}
                </span>
              </span>
              {l.cancelada_em && (
                <span className="text-xs font-bold text-texto-2">cancelada</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Cancelada não consome cota — e o balconista precisa saber disso, senão
          acha que perdeu uma liberação. */}
      <p className="text-xs text-texto-2">
        Liberações canceladas pelo estacionamento não contam na sua cota.
      </p>
    </div>
  );
}
