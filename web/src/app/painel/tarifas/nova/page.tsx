import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { CabecalhoCadastro } from "@/components/painel/cabecalho-cadastro";
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

  return (
    <div className="space-y-6">
      <CabecalhoCadastro
        voltarHref={`/painel/tarifas?patio=${patioId}`}
        voltarLabel="Tarifas"
        titulo="Nova tarifa"
        descricao={`${patioNome} · a tabela de preço que o app usa na cobrança.`}
      />
      <NovaTarifaForm patioId={patioId} tipos={tipos} />
    </div>
  );
}
