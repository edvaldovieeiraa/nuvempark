import Link from "next/link";
import { labelCaixaStatus } from "@/lib/status-labels";
import { formatarDataHora } from "@/lib/format-data";
import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { Revelar } from "@/components/ui/revelar";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { SemPatio } from "@/components/sem-patio";
import { Wallet, History, TrendingUp, Banknote } from "lucide-react";

export const dynamic = "force-dynamic";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Dia civil (YYYY-MM-DD) no fuso de Brasília — para agrupar "hoje". */
const _diaSP = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function diaSP(valor: string | null): string | null {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : _diaSP.format(d);
}

/** Turno derivado da hora de abertura (Brasília). */
const _horaSP = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  hour12: false,
});
function turno(valor: string | null): string {
  if (!valor) return "—";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "—";
  const h = Number(_horaSP.format(d));
  if (h < 12) return "turno da manhã";
  if (h < 18) return "turno da tarde";
  return "turno da noite";
}

function KpiCard({
  icone,
  bg,
  cor,
  rotulo,
  valor,
  corValor = "#1F2937",
}: {
  icone: React.ReactNode;
  bg: string;
  cor: string;
  rotulo: string;
  valor: string;
  corValor?: string;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: 16,
        background: "#fff",
        border: "1px solid #E4E8EC",
        boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: bg,
            color: cor,
            display: "grid",
            placeItems: "center",
          }}
        >
          {icone}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            color: "#8695A0",
          }}
        >
          {rotulo}
        </span>
      </div>
      <div
        style={{
          fontSize: 22,
          fontFamily: "'Poppins',sans-serif",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: corValor,
        }}
      >
        {valor}
      </div>
    </div>
  );
}

const TH: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "#8695A0",
};

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

  const lista = sessoes ?? [];
  const hoje = _diaSP.format(new Date());

  const emAndamento = lista.filter((s) => s.status === "aberta").length;
  const fechadasHoje = lista.filter(
    (s) => s.status === "fechada" && diaSP(s.fechamento) === hoje,
  );
  const recebidoHoje = fechadasHoje.reduce(
    (acc, s) => acc + (Number(s.total_fechamento) || 0),
    0,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Revelar>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 23,
                fontFamily: "'Poppins',sans-serif",
                fontWeight: 700,
                letterSpacing: "-.02em",
                color: "#1F2937",
              }}
            >
              Caixa
            </h2>
            <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
              Sessões de <b style={{ color: "#1F2937" }}>{patioNome}</b> ·{" "}
              {emAndamento > 0 ? (
                <b style={{ color: "#16A34A", fontWeight: 700 }}>
                  {emAndamento} em andamento
                </b>
              ) : (
                <span style={{ color: "#8695A0" }}>nenhuma em andamento</span>
              )}
            </div>
          </div>
        </div>
      </Revelar>

      <Revelar atraso={0.06}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
          }}
        >
          <KpiCard
            icone={<Wallet style={{ width: 15, height: 15 }} />}
            bg="#DCFCE7"
            cor="#16A34A"
            rotulo="Em andamento"
            valor={String(emAndamento)}
          />
          <KpiCard
            icone={<History style={{ width: 15, height: 15 }} />}
            bg="#F1F4F6"
            cor="#6B7280"
            rotulo="Fechadas hoje"
            valor={String(fechadasHoje.length)}
          />
          <KpiCard
            icone={<TrendingUp style={{ width: 15, height: 15 }} />}
            bg="#EEF4FF"
            cor="#0EA5E9"
            rotulo="Recebido hoje"
            valor={moeda.format(recebidoHoje)}
            corValor="#16A34A"
          />
        </div>
      </Revelar>

      <Revelar atraso={0.12}>
        <div
          style={{
            borderRadius: 16,
            background: "#fff",
            border: "1px solid #E4E8EC",
            boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "13px 18px",
              borderBottom: "1px solid #E4E8EC",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1F2937" }}>
              Sessões de caixa
            </h3>
            <span style={{ fontSize: 11, color: "#8695A0" }}>
              {lista.length === 0
                ? "nenhuma ainda"
                : `últimas ${lista.length}`}
            </span>
          </div>

          {lista.length === 0 ? (
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
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "#DCFCE7",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Banknote style={{ width: 22, height: 22, color: "#16A34A" }} />
              </span>
              <p style={{ fontSize: 13, color: "#8695A0", maxWidth: 300 }}>
                Nenhuma sessão de caixa ainda. Quando um operador abrir o caixa
                no app, ela aparece aqui.
              </p>
            </div>
          ) : (
            <ResponsiveTable corFade="from-white">
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ textAlign: "left", background: "#FAFBFC" }}>
                    <th style={{ ...TH, padding: "10px 18px" }}>Sessão</th>
                    <th style={{ ...TH, padding: "10px 12px" }}>Operador</th>
                    <th style={{ ...TH, padding: "10px 12px" }}>
                      Abertura → fechamento
                    </th>
                    <th
                      style={{ ...TH, padding: "10px 12px", textAlign: "right" }}
                    >
                      Recebido
                    </th>
                    <th style={{ ...TH, padding: "10px 18px" }}>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((s) => {
                    const aberta = s.status === "aberta";
                    const href = `/painel/caixa/${s.id}?patio=${patioId}`;
                    return (
                      <tr
                        key={s.id}
                        className="transition-colors hover:bg-[#FAFBFC]"
                        style={{
                          borderTop: "1px solid #EEF1F3",
                          cursor: "pointer",
                        }}
                      >
                        <td style={{ padding: 0 }}>
                          <Link
                            href={href}
                            className="mono"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "13px 18px",
                              fontWeight: 700,
                              letterSpacing: ".06em",
                              color: "#1F2937",
                            }}
                          >
                            {s.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td style={{ padding: 0 }}>
                          <Link
                            href={href}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              padding: "13px 12px",
                            }}
                          >
                            <span style={{ fontWeight: 600, color: "#1F2937" }}>
                              {s.operador_nome ?? "—"}
                            </span>
                            <span style={{ fontSize: 11, color: "#8695A0" }}>
                              {turno(s.abertura)}
                            </span>
                          </Link>
                        </td>
                        <td style={{ padding: 0 }}>
                          <Link
                            href={href}
                            className="mono"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "13px 12px",
                              color: "#6B7280",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatarDataHora(s.abertura)} →{" "}
                            {formatarDataHora(s.fechamento)}
                          </Link>
                        </td>
                        <td style={{ padding: 0 }}>
                          <Link
                            href={href}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              padding: "13px 12px",
                              fontWeight: 800,
                              fontVariantNumeric: "tabular-nums",
                              color: "#1F2937",
                            }}
                          >
                            {s.total_fechamento != null
                              ? moeda.format(Number(s.total_fechamento))
                              : "—"}
                          </Link>
                        </td>
                        <td style={{ padding: 0 }}>
                          <Link
                            href={href}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "13px 18px",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "3px 10px",
                                borderRadius: 999,
                                background: aberta ? "#DCFCE7" : "#F1F4F6",
                                border: `1px solid ${aberta ? "#BBF7D0" : "#E4E8EC"}`,
                                color: aberta ? "#16A34A" : "#6B7280",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: 999,
                                  background: aberta ? "#16A34A" : "#8695A0",
                                }}
                              />
                              {labelCaixaStatus(s.status)}
                            </span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ResponsiveTable>
          )}
        </div>
      </Revelar>
    </div>
  );
}
