import { SolucaoRota, metadataDaSolucao } from "@/components/solucoes/rota";
import { APLICATIVO } from "@/lib/solucoes";

/** Silo: "aplicativo/app para estacionamento" — a intenção é o app do operador. */
export const metadata = metadataDaSolucao(APLICATIVO);

export default function AplicativoParaEstacionamentoPage() {
  return <SolucaoRota pagina={APLICATIVO} />;
}
