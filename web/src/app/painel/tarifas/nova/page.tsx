import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { NovaTarifaForm } from "@/components/tarifas/nova-tarifa-form";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

export default async function NovaTarifaPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const { data: config } = await supabase
    .from("patio_config")
    .select("tipos_veiculo")
    .eq("patio_id", patioId)
    .maybeSingle();

  const tipos = Array.isArray(config?.tipos_veiculo)
    ? (config.tipos_veiculo as string[])
    : ["carro", "moto", "caminhonete", "van"];

  // Candidatas a "tabela do atraso" de uma tarifa de hóspede: as avulsas ativas.
  // Banco sem db/42 não tem `modalidade` — aí todas são avulsas.
  const { data: tarifas, error: erroTarifas } = await supabase
    .from("tarifas")
    .select("id, nome, tipo_veiculo, tolerancia_minutos, modalidade")
    .eq("patio_id", patioId)
    .eq("ativo", true)
    .order("ordem");
  const avulsas = erroTarifas
    ? []
    : (tarifas ?? [])
        .filter((t) => t.modalidade !== "hospede")
        .map((t) => ({
          id: t.id as string,
          nome: t.nome as string,
          tipo_veiculo: t.tipo_veiculo as string,
          tolerancia_minutos: Number(t.tolerancia_minutos),
        }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Link
          href={`/painel/tarifas?patio=${patioId}`}
          style={{
            cursor: "pointer",
            fontSize: 12,
            color: "#6B7280",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          ‹ Tarifas
        </Link>
        <h2
          style={{
            margin: "2px 0 0",
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: "-.02em",
          }}
        >
          Nova tarifa
        </h2>
        <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
          <b style={{ color: "#1F2937" }}>{patioNome}</b> · a tabela de preço
          que o app usa na cobrança.
        </div>
      </div>
      <NovaTarifaForm patioId={patioId} tipos={tipos} avulsas={avulsas} />
    </div>
  );
}
