import Link from "next/link";
import { Plus, BadgeCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

const GRADS = [
  "linear-gradient(135deg,#8B5CF6,#0EA5E9)",
  "linear-gradient(135deg,#0EA5E9,#22C55E)",
  "linear-gradient(135deg,#F59E0B,#F97316)",
  "linear-gradient(135deg,#22C55E,#0EA5E9)",
  "linear-gradient(135deg,#EF4444,#F97316)",
];

export default async function CredenciadosPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();

  // Credenciado = cliente cujo plano é do tipo "credenciado".
  const { data: planosCred } = await supabase
    .from("planos")
    .select("id, nome")
    .eq("patio_id", patioId)
    .eq("tipo", "credenciado");

  const planoNome = new Map((planosCred ?? []).map((p) => [p.id, p.nome]));
  const credIds = (planosCred ?? []).map((p) => p.id);

  const clientes = credIds.length
    ? (
        await supabase
          .from("clientes")
          .select("id, nome, plano_id, bloqueado")
          .eq("patio_id", patioId)
          .eq("ativo", true)
          .in("plano_id", credIds)
          .order("nome")
      ).data ?? []
    : [];

  const clienteIds = clientes.map((c) => c.id);
  const veiculos = clienteIds.length
    ? (
        await supabase
          .from("cliente_veiculos")
          .select("cliente_id")
          .eq("patio_id", patioId)
          .in("cliente_id", clienteIds)
      ).data ?? []
    : [];

  const placasPorCliente = new Map<string, number>();
  for (const v of veiculos) {
    placasPorCliente.set(v.cliente_id, (placasPorCliente.get(v.cliente_id) ?? 0) + 1);
  }

  const ativos = clientes.filter((c) => !c.bloqueado).length;
  const totalPlacas = veiculos.length;

  const card = {
    background: "#fff",
    border: "1px solid #E4E8EC",
    borderRadius: 16,
    boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
  } as const;
  const kpi = { ...card, borderRadius: 14, padding: "15px 16px" } as const;
  const kpiLabel = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".06em",
    textTransform: "uppercase" as const,
    color: "#8695A0",
  };
  const kpiNum = {
    marginTop: 7,
    fontSize: 22,
    fontFamily: "'Poppins',sans-serif",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums" as const,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, color: "#1F2937" }}>
      {/* Cabeçalho */}
      <div className="flex items-end justify-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <Link
            href="/painel/mensalistas"
            className="inline-flex items-center"
            style={{ gap: 5, fontSize: 12, color: "#6B7280" }}
          >
            ‹ Mensalistas
          </Link>
          <h2 style={{ margin: "2px 0 0", fontSize: 23, fontFamily: "'Poppins',sans-serif", fontWeight: 700, letterSpacing: "-.02em" }}>
            Credenciados
          </h2>
          <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
            Lojas conveniadas que validam estacionamento
          </div>
        </div>
        <Link
          href="/painel/mensalistas/novo"
          className="inline-flex items-center"
          style={{ gap: 7, height: 40, padding: "0 16px", borderRadius: 11, border: "none", background: "linear-gradient(90deg,#16A34A,#22C55E)", fontSize: 13, fontWeight: 700, color: "#fff", boxShadow: "0 8px 22px -8px rgba(22,163,74,.5)" }}
        >
          <Plus className="w-[15px] h-[15px]" />
          Novo credenciado
        </Link>
      </div>

      {/* KPIs (métricas reais; validações/faturamento não são rastreados hoje) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <div style={kpi}>
          <div style={kpiLabel}>Convênios ativos</div>
          <div style={kpiNum}>{ativos}</div>
        </div>
        <div style={kpi}>
          <div style={kpiLabel}>Placas com livre passagem</div>
          <div style={{ ...kpiNum, color: "#16A34A" }}>{totalPlacas}</div>
        </div>
        <div style={kpi}>
          <div style={kpiLabel}>Planos credenciados</div>
          <div style={{ ...kpiNum, color: "#8B5CF6" }}>{credIds.length}</div>
        </div>
      </div>

      {/* Lista */}
      <div style={{ ...card, overflow: "hidden" }}>
        {clientes.length === 0 ? (
          <div className="flex flex-col items-center text-center" style={{ gap: 10, padding: "48px 24px" }}>
            <span className="grid place-items-center" style={{ width: 46, height: 46, borderRadius: 14, background: "#F3EEFE", color: "#8B5CF6" }}>
              <BadgeCheck className="w-5 h-5" />
            </span>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Nenhum credenciado ainda</div>
            <p style={{ fontSize: 13, color: "#8695A0", maxWidth: 340 }}>
              Cadastre um cliente com um plano do tipo <b>credenciado</b> para que a loja
              tenha livre passagem no <b style={{ color: "#1F2937" }}>{patioNome}</b>.
            </p>
            <Link
              href="/painel/mensalistas/novo"
              className="inline-flex items-center"
              style={{ marginTop: 4, gap: 7, height: 38, padding: "0 15px", borderRadius: 11, background: "linear-gradient(90deg,#16A34A,#22C55E)", color: "#fff", fontSize: 13, fontWeight: 700 }}
            >
              <Plus className="w-[15px] h-[15px]" />
              Novo credenciado
            </Link>
          </div>
        ) : (
          clientes.map((c, i) => {
            const nPlacas = placasPorCliente.get(c.id) ?? 0;
            const inicial = (c.nome || "?").charAt(0).toUpperCase();
            return (
              <div
                key={c.id}
                className="flex items-center"
                style={{ gap: 14, padding: "14px 18px", borderBottom: i < clientes.length - 1 ? "1px solid #EEF1F3" : "none", background: i % 2 ? "#FAFBFC" : "transparent" }}
              >
                <span
                  className="grid place-items-center shrink-0"
                  style={{ width: 38, height: 38, borderRadius: 11, background: GRADS[i % GRADS.length], color: "#fff", fontWeight: 700, fontSize: 14 }}
                >
                  {inicial}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.nome}
                  </div>
                  <div style={{ fontSize: 12, color: "#8695A0" }}>
                    {planoNome.get(c.plano_id ?? "") ?? "Credenciado"} · livre passagem
                  </div>
                </div>
                <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "#6B7280" }}>
                  {nPlacas} <span style={{ color: "#8695A0", fontWeight: 600 }}>{nPlacas === 1 ? "placa" : "placas"}</span>
                </span>
                {c.bloqueado ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", background: "#F1F4F6", border: "1px solid #E4E8EC", borderRadius: 999, padding: "3px 10px" }}>
                    bloqueado
                  </span>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", background: "#DCFCE7", border: "1px solid #BBF7D0", borderRadius: 999, padding: "3px 10px" }}>
                    ativo
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
