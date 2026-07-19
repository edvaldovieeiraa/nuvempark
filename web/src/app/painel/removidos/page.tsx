import { createClient } from "@/lib/supabase/server";
import { formatarDataHora } from "@/lib/format-data";
import { labelTicketStatus } from "@/lib/status-labels";
import { resolverPatio } from "@/lib/patio-scope";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { SemPatio } from "@/components/sem-patio";
import { RemovidosFiltros } from "@/components/removidos/removidos-filtros";
import { Ban } from "lucide-react";

export const dynamic = "force-dynamic";

const TH_BASE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "#8695A0",
};

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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Cabeçalho ── */}
      <div>
        <h2 style={{ margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: "-.02em" }}>
          Tickets removidos
        </h2>
        <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
          <b style={{ color: "#1F2937" }}>{patioNome}</b> · cancelados pelo
          operador ou removidos em massa (Limpeza de Pátio) · {count ?? 0}
          {filtrando ? " no filtro" : " no total"}
          {(count ?? 0) > 100 && " · mostrando os 100 mais recentes"}
        </div>
      </div>

      <RemovidosFiltros
        patioId={patioId}
        q={q ?? ""}
        di={di ?? ""}
        df={df ?? ""}
      />

      {/* ── Tabela ── */}
      <div
        style={{
          borderRadius: 16,
          background: "#fff",
          border: "1px solid #E4E8EC",
          boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
          overflow: "hidden",
        }}
      >
        {lista.length === 0 ? (
          <div
            className="flex flex-col items-center text-center"
            style={{ gap: 12, padding: "56px 24px" }}
          >
            <span
              className="grid place-items-center"
              style={{ width: 48, height: 48, borderRadius: 16, background: "#F1F4F6" }}
            >
              <Ban className="w-6 h-6" style={{ color: "#9AA6B0" }} />
            </span>
            <p style={{ fontSize: 13, color: "#8695A0", maxWidth: 340 }}>
              {filtrando
                ? "Nenhum ticket removido com esses filtros."
                : "Nenhum ticket cancelado ou removido — bom sinal: cancelamentos frequentes merecem atenção."}
            </p>
          </div>
        ) : (
          <ResponsiveTable>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", background: "#FAFBFC" }}>
                  <th style={{ ...TH_BASE, padding: "11px 18px" }}>Placa</th>
                  <th style={{ ...TH_BASE, padding: "11px 12px" }}>Entrada</th>
                  <th style={{ ...TH_BASE, padding: "11px 12px" }}>Removido em</th>
                  <th style={{ ...TH_BASE, padding: "11px 12px" }}>Por</th>
                  <th style={{ ...TH_BASE, padding: "11px 12px" }}>Motivo</th>
                  <th style={{ ...TH_BASE, padding: "11px 18px" }}>Origem</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((t, i) => {
                  const viaLimpeza = Boolean(t.remocao_motivo);
                  const zebra = i % 2 === 1 ? "#FAFBFC" : undefined;
                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderTop: "1px solid #EEF1F3",
                        verticalAlign: "top",
                        background: zebra,
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
                          {t.placa}
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontSize: 11,
                            color: "#8695A0",
                            marginTop: 4,
                            textTransform: "capitalize",
                          }}
                        >
                          {t.tipo_veiculo}
                        </span>
                      </td>
                      <td
                        className="mono"
                        style={{ padding: "12px 12px", color: "#6B7280", whiteSpace: "nowrap" }}
                      >
                        {formatarDataHora(t.entrada)}
                      </td>
                      <td
                        className="mono"
                        style={{ padding: "12px 12px", color: "#6B7280", whiteSpace: "nowrap" }}
                      >
                        {formatarDataHora(t.removido_em)}
                      </td>
                      <td style={{ padding: "12px 12px", color: "#6B7280" }}>
                        <span style={{ display: "block" }}>
                          {t.removido_por_nome ?? t.removido_por_email ?? "—"}
                        </span>
                        {t.removido_por_email && t.removido_por_nome && (
                          <span
                            style={{ display: "block", fontSize: 11, color: "#8695A0", marginTop: 2 }}
                          >
                            {t.removido_por_email}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 12px", color: "#6B7280", maxWidth: 240 }}>
                        {t.remocao_motivo ?? "—"}
                      </td>
                      <td style={{ padding: "12px 18px", whiteSpace: "nowrap" }}>
                        {viaLimpeza ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "3px 10px",
                              borderRadius: 999,
                              background: "#FEF1F1",
                              color: "#E11D48",
                              border: "1px solid #FBD0D0",
                            }}
                          >
                            limpeza
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "3px 10px",
                              borderRadius: 999,
                              background: "#F1F4F6",
                              color: "#6B7280",
                              border: "1px solid #E4E8EC",
                              textTransform: "lowercase",
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 999,
                                background: "#8695A0",
                              }}
                            />
                            {labelTicketStatus(t.status)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ResponsiveTable>
        )}
      </div>
    </div>
  );
}
