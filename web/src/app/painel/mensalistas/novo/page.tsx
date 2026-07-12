import { createClient } from "@/lib/supabase/server";
import { resolverPatio } from "@/lib/patio-scope";
import { CabecalhoCadastro } from "@/components/painel/cabecalho-cadastro";
import { NovoClienteForm } from "@/components/mensalistas/novo-cliente-form";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

export default async function NovoClientePage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  const supabase = await createClient();
  const { data: planos } = await supabase
    .from("planos")
    .select("id, nome")
    .eq("patio_id", patioId)
    .eq("ativo", true)
    .order("nome");

  return (
    <div className="space-y-6">
      <CabecalhoCadastro
        voltarHref={`/painel/mensalistas?patio=${patioId}`}
        voltarLabel="Mensalistas"
        titulo="Novo cliente"
        descricao={`${patioNome} · mensalista ou credenciado com livre passagem.`}
      />
      <NovoClienteForm patioId={patioId} planos={planos ?? []} />
    </div>
  );
}
