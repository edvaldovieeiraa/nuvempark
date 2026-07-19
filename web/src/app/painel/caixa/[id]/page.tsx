import type { ReactNode } from "react";
import Link from "next/link";
import {
  labelCaixaStatus,
  labelCaixaTipo,
  capitalizar,
} from "@/lib/status-labels";
import { formatarDataHora } from "@/lib/format-data";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Receipt, Wallet, Car, LogOut, HandCoins } from "lucide-react";

export const dynamic = "force-dynamic";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const _hora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
function hora(valor: string | number | Date | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? "—" : _hora.format(d);
}

/** Tolerância de quebra de caixa aceita sem exigir conferência. */
const TOLERANCIA = 5;

function formaVisual(forma: string): { label: string; grad: string } {
  const f = forma.toLowerCase();
  if (f.includes("dinheiro"))
    return { label: "Dinheiro", grad: "linear-gradient(90deg,#F59E0B,#F97316)" };
  if (f.includes("pix"))
    return { label: "Pix", grad: "linear-gradient(90deg,#16A34A,#22C55E)" };
  if (
    f.includes("cart") ||
    f.includes("credito") ||
    f.includes("crédito") ||
    f.includes("debito") ||
    f.includes("débito")
  )
    return { label: "Cartão", grad: "linear-gradient(90deg,#0EA5E9,#38BDF8)" };
  return {
    label: capitalizar(forma),
    grad: "linear-gradient(90deg,#94A3B8,#CBD5E1)",
  };
}

const CARD_SHADOW = "0 4px 16px -4px rgba(16,27,20,.06)";

export default async function CaixaDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ patio?: string }>;
}) {
  const { id } = await params;
  const { patio } = await searchParams;
  const voltarHref = patio ? `/painel/caixa?patio=${patio}` : "/painel/caixa";
  const supabase = await createClient();

  const [{ data: sessao }, { data: movimentos }] = await Promise.all([
    supabase.from("caixa_sessoes").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("caixa_movimentos")
      .select(
        "id, tipo, valor, descricao, forma_pagamento, ticket_id, criado_em",
      )
      .eq("caixa_sessao_id", id)
      .order("criado_em", { ascending: true }),
  ]);

  if (!sessao) notFound();

  const patioNome = patio
    ? (
        await supabase
          .from("patios")
          .select("nome")
          .eq("id", patio)
          .maybeSingle()
      ).data?.nome ?? null
    : null;

  const movs = movimentos ?? [];
  const soma = (tipo: string) =>
    movs
      .filter((m) => m.tipo === tipo)
      .reduce((s, m) => s + (Number(m.valor) || 0), 0);
  const fundo = Number(sessao.fundo_caixa) || 0;
  const entradas = soma("entrada");
  const sangrias = soma("sangria");
  const esperado = fundo + entradas - sangrias;

  const aberta = sessao.status === "aberta";
  const contado =
    sessao.total_fechamento != null ? Number(sessao.total_fechamento) : null;
  const diferenca = contado != null ? contado - esperado : null;
  const dentroTolerancia =
    diferenca != null && Math.abs(diferenca) <= TOLERANCIA;

  // Recebido por forma de pagamento (só entradas)
  const porForma = new Map<string, number>();
  for (const m of movs) {
    if (m.tipo !== "entrada") continue;
    const f = (m.forma_pagamento as string | null) ?? "—";
    porForma.set(f, (porForma.get(f) ?? 0) + (Number(m.valor) || 0));
  }
  const formas = [...porForma.entries()]
    .map(([forma, total]) => ({ forma, total, ...formaVisual(forma) }))
    .sort((a, b) => b.total - a.total);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Cabeçalho */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Link
            href={voltarHref}
            style={{
              fontSize: 12,
              color: "#6B7280",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Caixa
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 23,
                fontFamily: "'Poppins',sans-serif",
                fontWeight: 700,
                letterSpacing: "-.02em",
              }}
            >
              Sessão #{id.slice(0, 8)}
            </h2>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 11px",
                borderRadius: 999,
                background: aberta ? "#DCFCE7" : "#F1F4F6",
                color: aberta ? "#16A34A" : "#6B7280",
                border: `1px solid ${aberta ? "#BBF7D0" : "#E4E8EC"}`,
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
              {labelCaixaStatus(sessao.status)}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "#6B7280" }}>
            <b style={{ color: "#1F2937" }}>
              {sessao.operador_nome ?? "Operador"}
            </b>
            {patioNome ? ` · ${patioNome}` : ""} ·{" "}
            {formatarDataHora(sessao.abertura)}
            {sessao.fechamento ? ` → ${formatarDataHora(sessao.fechamento)}` : ""}
          </div>
        </div>
        <button
          type="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            height: 38,
            padding: "0 15px",
            borderRadius: 11,
            border: "1px solid #E4E8EC",
            background: "#fff",
            fontSize: 13,
            fontWeight: 700,
            color: "#6B7280",
            cursor: "pointer",
          }}
        >
          <Receipt style={{ width: 15, height: 15 }} />
          Imprimir
        </button>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
        }}
      >
        <Kpi rotulo="Fundo de troco" valor={moeda.format(fundo)} />
        <Kpi
          rotulo="Recebido"
          valor={moeda.format(entradas)}
          cor="#16A34A"
        />
        <Kpi rotulo="Sangrias" valor={moeda.format(sangrias)} cor="#EF4444" />
        <Kpi rotulo="Movimentos" valor={String(movs.length)} />
      </div>

      {/* Conferência + Formas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* Conferência de fechamento (navy) */}
        <div
          style={{
            borderRadius: 16,
            padding: 20,
            background: "linear-gradient(125deg,#0B1220,#14203A 55%,#1C2C48)",
            color: "#fff",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 20px 50px -20px rgba(20,29,40,.5)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -40,
              right: 40,
              width: 180,
              height: 180,
              borderRadius: 999,
              background: "rgba(34,197,94,.16)",
              filter: "blur(46px)",
            }}
          />
          <div
            style={{
              position: "relative",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,.55)",
              marginBottom: 14,
            }}
          >
            Conferência de fechamento
          </div>
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <LinhaConf rotulo="Esperado em caixa" valor={moeda.format(esperado)} />
            <LinhaConf
              rotulo="Contado no fechamento"
              valor={contado != null ? moeda.format(contado) : "—"}
            />
            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,.14)",
                margin: "4px 0",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>Diferença</span>
              {diferenca != null ? (
                <span
                  className="mono"
                  style={{
                    fontSize: 22,
                    fontFamily: "'Poppins',sans-serif",
                    fontWeight: 700,
                    color: dentroTolerancia ? "#FBBF24" : "#F87171",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {diferenca < 0 ? "− " : diferenca > 0 ? "+ " : ""}
                  {moeda.format(Math.abs(diferenca))}
                </span>
              ) : (
                <span
                  className="mono"
                  style={{
                    fontSize: 22,
                    fontFamily: "'Poppins',sans-serif",
                    fontWeight: 700,
                    color: "rgba(255,255,255,.55)",
                  }}
                >
                  —
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              position: "relative",
              marginTop: 14,
              fontSize: 12,
              color: "rgba(255,255,255,.55)",
            }}
          >
            {diferenca == null
              ? "Sessão ainda aberta — conferência pendente."
              : dentroTolerancia
                ? `Quebra dentro da tolerância (${moeda.format(TOLERANCIA)}). Nenhuma ação necessária.`
                : `Divergência acima da tolerância (${moeda.format(TOLERANCIA)}). Requer conferência.`}
          </div>
        </div>

        {/* Recebido por forma de pagamento */}
        <div
          style={{
            borderRadius: 16,
            background: "#fff",
            border: "1px solid #E4E8EC",
            boxShadow: CARD_SHADOW,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
            Recebido por forma de pagamento
          </div>
          {formas.length === 0 ? (
            <div style={{ fontSize: 13, color: "#8695A0" }}>
              Nenhum recebimento nesta sessão.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {formas.map((f) => {
                const pct = entradas > 0 ? (f.total / entradas) * 100 : 0;
                return (
                  <div key={f.forma}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 7,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {f.label}
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#6B7280",
                        }}
                      >
                        {moeda.format(f.total)}
                      </span>
                    </div>
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
                          width: `${pct}%`,
                          height: "100%",
                          borderRadius: 999,
                          background: f.grad,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lançamentos da sessão */}
      <div
        style={{
          borderRadius: 16,
          background: "#fff",
          border: "1px solid #E4E8EC",
          boxShadow: CARD_SHADOW,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "13px 18px",
            borderBottom: "1px solid #E4E8EC",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Lançamentos da sessão
        </div>
        <div style={{ padding: "4px 8px" }}>
          <Lancamento
            zebra={false}
            icone={<Wallet style={{ width: 15, height: 15 }} />}
            iconeBg="#FEF7E6"
            iconeCor="#F59E0B"
            titulo="Abertura de caixa · fundo"
            hora={hora(sessao.abertura)}
            valor={moeda.format(fundo)}
          />
          {movs.map((m, i) => {
            const negativa = m.tipo === "sangria";
            const isencao = m.tipo === "isencao";
            const detalhe =
              m.descricao ||
              (m.ticket_id ? `ticket ${m.ticket_id.slice(0, 8)}` : null);
            return (
              <Lancamento
                key={m.id}
                zebra={i % 2 === 0}
                icone={
                  negativa ? (
                    <LogOut style={{ width: 15, height: 15 }} />
                  ) : isencao ? (
                    <HandCoins style={{ width: 15, height: 15 }} />
                  ) : (
                    <Car style={{ width: 15, height: 15 }} />
                  )
                }
                iconeBg={negativa ? "#FEF1F1" : isencao ? "#F1F4F6" : "#DCFCE7"}
                iconeCor={negativa ? "#EF4444" : isencao ? "#8695A0" : "#16A34A"}
                titulo={`${labelCaixaTipo(m.tipo)}${detalhe ? ` · ${detalhe}` : ""}`}
                hora={hora(m.criado_em)}
                valor={`${negativa ? "− " : isencao ? "" : "+ "}${moeda.format(Number(m.valor) || 0)}`}
                valorCor={
                  negativa ? "#EF4444" : isencao ? "#8695A0" : "#16A34A"
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  rotulo,
  valor,
  cor,
}: {
  rotulo: string;
  valor: string;
  cor?: string;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: "15px 16px",
        background: "#fff",
        border: "1px solid #E4E8EC",
        boxShadow: CARD_SHADOW,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          color: "#8695A0",
        }}
      >
        {rotulo}
      </div>
      <div
        style={{
          marginTop: 7,
          fontSize: 20,
          fontFamily: "'Poppins',sans-serif",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: cor,
        }}
      >
        {valor}
      </div>
    </div>
  );
}

function LinhaConf({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>
        {rotulo}
      </span>
      <span
        className="mono"
        style={{
          fontSize: 15,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {valor}
      </span>
    </div>
  );
}

function Lancamento({
  zebra,
  icone,
  iconeBg,
  iconeCor,
  titulo,
  hora,
  valor,
  valorCor,
}: {
  zebra: boolean;
  icone: ReactNode;
  iconeBg: string;
  iconeCor: string;
  titulo: string;
  hora: string;
  valor: string;
  valorCor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 10,
        borderRadius: 11,
        background: zebra ? "#FAFBFC" : undefined,
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: iconeBg,
          color: iconeCor,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icone}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{titulo}</span>
      <span
        className="mono"
        style={{ marginLeft: "auto", fontSize: 11, color: "#8695A0" }}
      >
        {hora}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          color: valorCor,
        }}
      >
        {valor}
      </span>
    </div>
  );
}
