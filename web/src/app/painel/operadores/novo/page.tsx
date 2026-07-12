import { resolverPatio } from "@/lib/patio-scope";
import { CabecalhoCadastro } from "@/components/painel/cabecalho-cadastro";
import { NovoOperadorForm } from "@/components/operadores/novo-operador-form";
import { SemPatio } from "@/components/sem-patio";

export const dynamic = "force-dynamic";

export default async function NovoOperadorPage({
  searchParams,
}: {
  searchParams: Promise<{ patio?: string }>;
}) {
  const { patio } = await searchParams;
  const { patioId, patioNome } = await resolverPatio(patio);
  if (!patioId) return <SemPatio />;

  return (
    <div className="space-y-6">
      <CabecalhoCadastro
        voltarHref={`/painel/operadores?patio=${patioId}`}
        voltarLabel="Operadores"
        titulo="Novo operador"
        descricao={`${patioNome} · a conta que acessa o app no pátio.`}
      />
      <NovoOperadorForm patioId={patioId} />
    </div>
  );
}
