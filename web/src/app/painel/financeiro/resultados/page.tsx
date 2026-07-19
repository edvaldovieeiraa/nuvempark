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

  const th: React.CSSProperties = {
    padding: "11px 12px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    color: "#8695A0",
  };

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
            }}
          >
            Resultados
          </h2>
          <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
            <b style={{ color: "#1F2937" }}>{patioNome}</b> · faturamento mês a
            mês · <b style={{ color: "#16A34A" }}>{moeda.format(total12)}</b> nos
            últimos 12 meses
            {melhorMes.total > 0 && (
              <>
                {" · melhor mês: "}
                <b style={{ color: "#1F2937" }}>{melhorMes.rotulo}</b>
              </>
            )}
          </div>
        </div>
      </Revelar>

      <Revelar atraso={0.08}>
        <div
          style={{
            borderRadius: 16,
            background: "#fff",
            border: "1px solid #E4E8EC",
            boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
            overflow: "hidden",
          }}
        >
          {total12 === 0 ? (
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
                  borderRadius: 16,
                  background: "#F1F4F6",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <CalendarRange style={{ width: 24, height: 24, color: "#16A34A" }} />
              </span>
              <p style={{ margin: 0, fontSize: 13, color: "#6B7280", maxWidth: 320 }}>
                Ainda não há faturamento registrado. Os resultados aparecem aqui
                conforme as saídas são cobradas no app.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ textAlign: "left", background: "#FAFBFC" }}>
                    <th style={{ ...th, padding: "11px 18px" }}>Mês</th>
                    <th style={{ ...th, width: "36%" }}>Faturamento</th>
                    <th style={{ ...th, textAlign: "right" }}>Total</th>
                    <th style={{ ...th, textAlign: "right" }}>Saídas</th>
                    <th style={{ ...th, padding: "11px 18px", textAlign: "right" }}>
                      Ticket médio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {meses.map((m) => (
                    <tr key={m.chave} style={{ borderTop: "1px solid #EEF1F3" }}>
                      <td
                        style={{
                          padding: "11px 18px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.rotulo}
                      </td>
                      <td style={{ padding: "11px 12px" }}>
                        <div
                          style={{
                            height: 8,
                            borderRadius: 999,
                            background: "#F1F4F6",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${(m.total / maxMes) * 100}%`,
                              height: "100%",
                              borderRadius: 999,
                              background: "linear-gradient(90deg,#16A34A,#22C55E)",
                            }}
                          />
                        </div>
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: "11px 12px",
                          textAlign: "right",
                          fontWeight: 800,
                        }}
                      >
                        {moeda.format(m.total)}
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: "11px 12px",
                          textAlign: "right",
                          color: "#6B7280",
                        }}
                      >
                        {m.saidas}
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: "11px 18px",
                          textAlign: "right",
                          color: "#6B7280",
                        }}
                      >
                        {m.saidas > 0 ? moeda.format(m.total / m.saidas) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Revelar>
    </div>
  );
}
