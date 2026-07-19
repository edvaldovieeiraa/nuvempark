import { QrCode } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { SemPatio } from "@/components/sem-patio";
import { Revelar } from "@/components/ui/revelar";
import { ResponsiveTable } from "@/components/ui/responsive-table";
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

type Chip = { txt: string; bg: string; cor: string; borda: string };

const ROTULO: Record<string, Chip> = {
  pago: { txt: "Pago", bg: "#DCFCE7", cor: "#16A34A", borda: "#BBF7D0" },
  pendente: { txt: "Pendente", bg: "#FEF7E6", cor: "#B45309", borda: "#FCE3A6" },
  expirado: { txt: "Expirado", bg: "#F1F4F6", cor: "#8695A0", borda: "#E4E8EC" },
  cancelado: { txt: "Cancelado", bg: "#F1F4F6", cor: "#8695A0", borda: "#E4E8EC" },
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E4E8EC",
  borderRadius: 16,
  boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
};

const kpiLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "#8695A0",
};

const thStyle: React.CSSProperties = {
  ...kpiLabel,
  padding: "11px 12px",
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
  //
  // origem != 'app': o Pix DINÂMICO (operador gerou na saída) foi contabilizado
  // no caixa dele — mostrá-lo aqui também contaria o mesmo pagamento duas vezes.
  // Esta lista é só o Pix que o CLIENTE pagou sozinho pelo QR do cupom.
  const { data } = await supabase
    .from("pagamentos_online")
    .select("id, valor, status, pago_em, criado_em, ticket_id")
    .eq("patio_id", patioId)
    .neq("origem", "app")
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Revelar>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 23,
              fontWeight: 700,
              letterSpacing: "-.02em",
              color: "#1F2937",
            }}
          >
            Pix Online
          </h2>
          <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
            <b style={{ color: "#1F2937" }}>{patioNome}</b> · pagamentos da
            estadia feitos pelo cliente no QR do cupom
          </div>
        </div>
      </Revelar>

      {/* Resumo */}
      <Revelar atraso={0.06}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
          }}
        >
          <Cartao
            rotulo="Recebido (pago)"
            valor={moeda.format(totalRecebido)}
            cor="#16A34A"
          />
          <Cartao rotulo="Pagamentos pagos" valor={`${pagos.length}`} />
          <Cartao rotulo="No período" valor={`${pagamentos.length}`} />
        </div>
      </Revelar>

      {/* Lista */}
      <Revelar atraso={0.1}>
        <section style={{ ...cardStyle, overflow: "hidden" }}>
          {pagamentos.length === 0 ? (
            <div
              style={{
                padding: "56px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                textAlign: "center",
              }}
            >
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "#F1F4F6",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <QrCode style={{ width: 24, height: 24, color: "#8695A0" }} />
              </span>
              <p style={{ margin: 0, fontSize: 13, color: "#8695A0" }}>
                Nenhum pagamento Pix online neste pátio ainda.
              </p>
            </div>
          ) : (
            <ResponsiveTable>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ textAlign: "left", background: "#FAFBFC" }}>
                    <th style={{ ...thStyle, padding: "11px 18px" }}>Placa</th>
                    <th style={thStyle}>Gerado</th>
                    <th style={thStyle}>Pago em</th>
                    <th style={thStyle}>Status</th>
                    <th
                      style={{
                        ...thStyle,
                        padding: "11px 18px",
                        textAlign: "right",
                      }}
                    >
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((p, i) => {
                    const st = ROTULO[p.status] ?? ROTULO.pendente;
                    const pagoEm = formatarDataHora(p.pago_em);
                    const semPago = pagoEm === "—";
                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderTop: "1px solid #EEF1F3",
                          background: i % 2 === 1 ? "#FAFBFC" : undefined,
                        }}
                      >
                        <td style={{ padding: "12px 18px" }}>
                          <span
                            className="mono"
                            style={{
                              fontWeight: 700,
                              letterSpacing: ".1em",
                              background: "#F1F4F6",
                              border: "1px solid #E4E8EC",
                              borderRadius: 6,
                              padding: "3px 8px",
                            }}
                          >
                            {placas[p.ticket_id] ?? "—"}
                          </span>
                        </td>
                        <td
                          className="mono"
                          style={{ padding: "12px 12px", color: "#6B7280" }}
                        >
                          {formatarDataHora(p.criado_em)}
                        </td>
                        <td
                          className="mono"
                          style={{
                            padding: "12px 12px",
                            color: semPago ? "#8695A0" : "#6B7280",
                          }}
                        >
                          {pagoEm}
                        </td>
                        <td style={{ padding: "12px 12px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "3px 10px",
                              borderRadius: 999,
                              background: st.bg,
                              color: st.cor,
                              border: `1px solid ${st.borda}`,
                            }}
                          >
                            {st.txt}
                          </span>
                        </td>
                        <td
                          className="mono"
                          style={{
                            padding: "12px 18px",
                            textAlign: "right",
                            fontWeight: 800,
                          }}
                        >
                          {moeda.format(Number(p.valor))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ResponsiveTable>
          )}
        </section>
      </Revelar>

      {pagamentos.length >= 200 && (
        <Revelar atraso={0.14}>
          <p style={{ margin: 0, fontSize: 12, color: "#8695A0" }}>
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
  cor,
}: {
  rotulo: string;
  valor: string;
  cor?: string;
}) {
  return (
    <div style={{ ...cardStyle, borderRadius: 14, padding: "15px 16px" }}>
      <div style={kpiLabel}>{rotulo}</div>
      <div
        style={{
          marginTop: 7,
          fontSize: 22,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: cor ?? "#1F2937",
        }}
      >
        {valor}
      </div>
    </div>
  );
}
