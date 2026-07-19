import { QrCode, CreditCard, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Normaliza a string livre `forma_pagamento` para as 3 categorias do caixa. */
function classificar(f: string | null): "pix" | "cartao" | "dinheiro" | "outros" {
  const s = (f ?? "").toLowerCase();
  if (s.includes("pix")) return "pix";
  if (s.includes("cart")) return "cartao";
  if (s.includes("dinheiro") || s.includes("especie") || s.includes("espécie")) return "dinheiro";
  return "outros";
}

export default async function PagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();

  const desde = new Date();
  desde.setDate(desde.getDate() - 30);
  const desdeIso = desde.toISOString();

  const [{ data: tickets }, { data: mensalidades }] = await Promise.all([
    supabase
      .from("tickets")
      .select("valor_cobrado, forma_pagamento")
      .eq("patio_id", patioId)
      .eq("status", "fechado")
      .gte("saida", desdeIso),
    supabase
      .from("mensalidade_pagamentos")
      .select("valor, forma_pagamento")
      .eq("patio_id", patioId)
      .is("cancelado_em", null)
      .gte("criado_em", desdeIso),
  ]);

  const total: Record<string, number> = { pix: 0, cartao: 0, dinheiro: 0, outros: 0 };
  for (const t of tickets ?? []) {
    total[classificar(t.forma_pagamento)] += Number(t.valor_cobrado) || 0;
  }
  for (const m of mensalidades ?? []) {
    total[classificar(m.forma_pagamento)] += Number(m.valor) || 0;
  }
  const somaGeral = total.pix + total.cartao + total.dinheiro + total.outros;
  const pct = (v: number) => (somaGeral > 0 ? Math.round((v / somaGeral) * 100) : 0);

  const card = {
    background: "#fff",
    border: "1px solid #E4E8EC",
    borderRadius: 16,
    boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
  } as const;

  const metodos = [
    { key: "pix", nome: "Pix", Icone: QrCode, box: "#DCFCE7", fg: "#16A34A", grad: "linear-gradient(90deg,#16A34A,#22C55E)" },
    { key: "cartao", nome: "Cartão de crédito / débito", Icone: CreditCard, box: "#EEF4FF", fg: "#0EA5E9", grad: "linear-gradient(90deg,#0EA5E9,#38BDF8)" },
    { key: "dinheiro", nome: "Dinheiro", Icone: Wallet, box: "#FFF3E8", fg: "#F97316", grad: "linear-gradient(90deg,#F59E0B,#F97316)" },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, color: "#1F2937" }}>
      {/* Cabeçalho */}
      <div>
        <h2 style={{ margin: 0, fontSize: 23, fontFamily: "'Poppins',sans-serif", fontWeight: 700, letterSpacing: "-.02em" }}>
          Formas de pagamento
        </h2>
        <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
          Meios aceitos no caixa · participação nos últimos 30 dias
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 14, alignItems: "start" }}>
        {/* Lista de meios */}
        <div style={{ ...card, overflow: "hidden" }}>
          {metodos.map((m, i) => (
            <div
              key={m.key}
              className="flex items-center"
              style={{ gap: 13, padding: "15px 18px", borderBottom: i < metodos.length - 1 ? "1px solid #EEF1F3" : "none" }}
            >
              <span className="grid place-items-center shrink-0" style={{ width: 36, height: 36, borderRadius: 10, background: m.box, color: m.fg }}>
                <m.Icone className="w-[18px] h-[18px]" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{m.nome}</div>
                <div style={{ fontSize: 12, color: "#8695A0" }}>
                  {moeda.format(total[m.key])} nos últimos 30 dias
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", background: "#DCFCE7", border: "1px solid #BBF7D0", borderRadius: 999, padding: "3px 10px" }}>
                aceito
              </span>
            </div>
          ))}
        </div>

        {/* Participação no faturamento */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Participação no faturamento</div>
          {somaGeral === 0 ? (
            <div style={{ fontSize: 13, color: "#8695A0", padding: "8px 0" }}>
              Sem recebimentos nos últimos 30 dias.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {metodos.map((m) => (
                <div key={m.key}>
                  <div className="flex justify-between" style={{ marginBottom: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{m.key === "cartao" ? "Cartão" : m.nome}</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>{pct(total[m.key])}%</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 999, background: "#F1F4F6", overflow: "hidden" }}>
                    <div style={{ width: `${pct(total[m.key])}%`, height: "100%", borderRadius: 999, background: m.grad }} />
                  </div>
                </div>
              ))}
              {total.outros > 0 && (
                <div>
                  <div className="flex justify-between" style={{ marginBottom: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Outros</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>{pct(total.outros)}%</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 999, background: "#F1F4F6", overflow: "hidden" }}>
                    <div style={{ width: `${pct(total.outros)}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#94A3B8,#64748B)" }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
