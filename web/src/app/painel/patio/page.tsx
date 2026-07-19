import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { assinarFotosEntrada } from "@/lib/fotos";
import { mapaOperadores } from "@/lib/operadores";
import { Revelar } from "@/components/ui/revelar";
import { SemPatio } from "@/components/sem-patio";
import { SyncBadge } from "@/components/sync-badge";
import { ultimaSincronizacao } from "@/lib/patio-scope";
import { LimpezaPatio } from "@/components/patio/limpeza-patio";
import { PatioLista } from "@/components/patio/patio-lista";
import { History } from "lucide-react";

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E4E8EC",
  borderRadius: 16,
  boxShadow: "0 4px 16px -4px rgba(16,27,20,.06)",
};

export const dynamic = "force-dynamic";

export default async function PatioAgoraPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const [{ data: abertos }, { data: patioInfo }, sincronizadoEm] =
    await Promise.all([
      supabase
        .from("tickets")
        .select("id, placa, tipo_veiculo, entrada, origem, foto_entrada_path, operador_id")
        .eq("patio_id", patioId)
        .eq("status", "aberto")
        .order("entrada", { ascending: false }),
      supabase
        .from("patios")
        .select("qtd_vagas")
        .eq("id", patioId)
        .maybeSingle(),
      ultimaSincronizacao(patioId),
    ]);

  const veiculos = abertos ?? [];
  const vagas = patioInfo?.qtd_vagas ?? 0;
  const pct = vagas > 0 ? Math.min(100, (veiculos.length / vagas) * 100) : 0;

  // Uma única chamada ao Storage para as miniaturas desta página.
  const [fotos, operadores] = await Promise.all([
    assinarFotosEntrada(veiculos),
    mapaOperadores(),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Revelar>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: "-.02em" }}>
              Pátio
            </h1>
            <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
              <b style={{ color: "#1F2937" }}>{patioNome}</b> · veículos dentro do
              pátio agora
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <LimpezaPatio patioId={patioId} patioNome={patioNome ?? "este pátio"} />
            <SyncBadge iso={sincronizadoEm} />
          </div>
        </div>
      </Revelar>

      {/* Ocupação */}
      <Revelar atraso={0.06}>
        <div style={{ ...CARD, padding: "18px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700 }}>Ocupação</span>
            <span
              className="tabular-nums"
              style={{ fontSize: 24, fontWeight: 700 }}
            >
              {veiculos.length}
              {vagas > 0 && (
                <span style={{ fontSize: 16, color: "#8695A0" }}> / {vagas}</span>
              )}
            </span>
          </div>
          <div
            style={{
              height: 10,
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
                background:
                  pct >= 90
                    ? "linear-gradient(90deg,#F59E0B,#EF4444)"
                    : "linear-gradient(90deg,#16A34A,#22C55E)",
              }}
            />
          </div>
        </div>
      </Revelar>

      {/* Lista — clicar no veículo (ou na miniatura) abre a foto de entrada. */}
      <Revelar atraso={0.1}>
        <PatioLista
          veiculos={veiculos}
          fotos={fotos}
          operadores={operadores}
        />
      </Revelar>

      {veiculos.length > 0 && (
        <Revelar atraso={0.15}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12,
              color: "#8695A0",
            }}
          >
            <History className="w-[15px] h-[15px]" />
            Atualize a página para recalcular as permanências.
          </div>
        </Revelar>
      )}
    </div>
  );
}

