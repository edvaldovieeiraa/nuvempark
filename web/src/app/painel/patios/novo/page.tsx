import { CabecalhoCadastro } from "@/components/painel/cabecalho-cadastro";
import { NovoPatioForm } from "@/components/patios/novo-patio-form";

export const dynamic = "force-dynamic";

export default function NovoPatioPage() {
  return (
    <div className="space-y-6">
      <CabecalhoCadastro
        voltarHref="/painel/patios"
        voltarLabel="Pátios"
        titulo="Novo pátio"
        descricao="Uma nova unidade da sua rede, com tarifas, operadores e caixa próprios."
      />
      <NovoPatioForm />
    </div>
  );
}
