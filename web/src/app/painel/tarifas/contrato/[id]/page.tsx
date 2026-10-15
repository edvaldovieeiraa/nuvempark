import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { FormContrato } from "@/components/tarifas/campos-contrato";

export const dynamic = "force-dynamic";

/**
 * Editar contrato (Feature 2a): página própria, não modal (design, observação
 * 8). A RLS de `tarifas` decide quem enxerga a linha; outro tenant cai no
 * notFound. JSON malformado não quebra: o formulário mostra "não pôde ser lido".
 */
export default async function EditarContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: linha } = await supabase
    .from("tarifas")
    .select("id, patio_id, nome, tipo_veiculo, modalidade, contrato")
    .eq("id", id)
    .eq("ativo", true)
    .eq("modalidade", "contrato")
    .maybeSingle();
  if (!linha) notFound();

  const patioId = String(linha.patio_id);
  const [{ patioNome }, { data: config }] = await Promise.all([
    resolverPatio(patioId),
    supabase.from("patio_config").select("tipos_veiculo").eq("patio_id", patioId).maybeSingle(),
  ]);
  const tipos = Array.isArray(config?.tipos_veiculo)
    ? (config.tipos_veiculo as string[])
    : ["carro", "moto", "caminhonete", "van"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Link
          href={`/painel/tarifas?patio=${patioId}`}
          style={{ fontSize: 12, color: "#6B7280", display: "inline-flex", alignItems: "center", gap: 5 }}
        >
          ‹ Tarifas
        </Link>
        <h2 style={{ margin: "2px 0 0", fontSize: 23, fontWeight: 700, letterSpacing: "-.02em" }}>
          Editar contrato
        </h2>
        <div style={{ marginTop: 3, fontSize: 13, color: "#6B7280" }}>
          <b style={{ color: "#1F2937" }}>{patioNome}</b> · só simulação: este contrato ainda não
          cobra no app.
        </div>
      </div>
      <FormContrato
        modo="editar"
        patioId={patioId}
        tipos={tipos}
        inicial={{
          id: String(linha.id),
          nome: String(linha.nome),
          tipoVeiculo: String(linha.tipo_veiculo),
          json: linha.contrato,
        }}
      />
    </div>
  );
}
