import { QrCode, Inbox } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { SemPatio } from "@/components/sem-patio";
import { Revelar } from "@/components/ui/revelar";
import { formatarDataHora } from "@/lib/format-data";

export const dynamic = "force-dynamic";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type Pagamento = {
  id: string;
  valor: number;
  status: string;
  pago_em: string | null;
  criado_em: string;
  ticket_id: string;
};

const ROTULO: Record<string, { txt: string; cls: string }> = {
  pago: { txt: "Pago", cls: "bg-brand-50 text-brand-700 border-brand-200" },
  pendente: { txt: "Pendente", cls: "bg-aviso-bg text-aviso border-aviso/25" },
  expirado: { txt: "Expirado", cls: "bg-fundo text-texto-3 border-borda" },
  cancelado: { txt: "Cancelado", cls: "bg-perigo-bg text-perigo border-perigo/20" },
};

export default async function PixOnlinePage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();

  // RLS de pagamentos_online já limita ao tenant do gestor (só SELECT). Filtro
  // por pátio aqui; os 200 mais recentes bastam para a consulta financeira.
  const { data } = await supabase
    .from("pagamentos_online")
    .select("id, valor, status, pago_em, criado_em, ticket_id")
    .eq("patio_id", patioId)
    .order("criado_em", { ascending: false })
    .limit(200);

  const pagamentos = (data ?? []) as Pagamento[];

  // Placas dos tickets, em uma consulta (join manual — sem FK).
  const ticketIds = [...new Set(pagamentos.map((p) => p.ticket_id))];
  const placas: Record<string, string> = {};
  if (ticketIds.length > 0) {
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, placa")
      .in("id", ticketIds);
    for (const t of tickets ?? []) {
      if (typeof t.id === "string" && typeof t.placa === "string") {
        placas[t.id] = t.placa;
      }
    }
  }

  const pagos = pagamentos.filter((p) => p.status === "pago");
  const totalRecebido = pagos.reduce((s, p) => s + Number(p.valor), 0);

  return (
    <div className="space-y-5 max-w-5xl">
      <Revelar>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[26px] font-black tracking-tight">Pix Online</h1>
            <p className="text-sm text-texto-2">
              <b className="text-texto">{patioNome}</b> · pagamentos da estadia
              feitos pelo cliente no QR do cupom
            </p>
          </div>
        </div>
      </Revelar>

      {/* Resumo */}
      <Revelar atraso={0.06}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Cartao rotulo="Recebido (pago)" valor={moeda.format(totalRecebido)} destaque />
          <Cartao rotulo="Pagamentos pagos" valor={`${pagos.length}`} />
          <Cartao rotulo="No período" valor={`${pagamentos.length}`} />
        </div>
      </Revelar>

      {/* Lista */}
      <Revelar atraso={0.1}>
        <section className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
          {pagamentos.length === 0 ? (
            <div className="px-5 py-14 flex flex-col items-center gap-3 text-center">
              <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
                <QrCode className="w-6 h-6 text-brand-600" />
              </span>
              <p className="text-sm text-texto-3">
                Nenhum pagamento Pix online neste pátio ainda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                    <th className="px-5 py-3 font-bold">Placa</th>
                    <th className="px-5 py-3 font-bold">Gerado</th>
                    <th className="px-5 py-3 font-bold">Pago em</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((p) => {
                    const st = ROTULO[p.status] ?? ROTULO.pendente;
                    return (
                      <tr key={p.id} className="border-t border-borda">
                        <td className="px-5 py-3">
                          <span className="font-black tracking-widest text-[13px] bg-fundo border border-borda rounded-md px-2 py-1">
                            {placas[p.ticket_id] ?? "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-texto-2 tabular-nums whitespace-nowrap">
                          {formatarDataHora(p.criado_em)}
                        </td>
                        <td className="px-5 py-3 text-texto-2 tabular-nums whitespace-nowrap">
                          {formatarDataHora(p.pago_em)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${st.cls}`}
                          >
                            {st.txt}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-bold tabular-nums">
                          {moeda.format(Number(p.valor))}
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

      {pagamentos.length >= 200 && (
        <Revelar atraso={0.14}>
          <p className="flex items-center gap-2 text-xs text-texto-3">
            <Inbox className="w-4 h-4" />
            Mostrando os 200 mais recentes.
          </p>
        </Revelar>
      )}
    </div>
  );
}

function Cartao({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-4">
      <p className="text-[11px] font-black uppercase tracking-wider text-texto-3">
        {rotulo}
      </p>
      <p
        className={`mt-1 text-2xl font-black tabular-nums ${destaque ? "text-brand-700" : ""}`}
      >
        {valor}
      </p>
    </div>
  );
}
