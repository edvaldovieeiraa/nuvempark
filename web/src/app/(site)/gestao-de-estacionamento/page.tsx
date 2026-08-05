import { SolucaoRota, metadataDaSolucao } from "@/components/solucoes/rota";
import { GESTAO } from "@/lib/solucoes";

/** Silo: "gestão de estacionamento(s)" — a intenção é financeira/gerencial. */
export const metadata = metadataDaSolucao(GESTAO);

export default function GestaoDeEstacionamentoPage() {
  return <SolucaoRota pagina={GESTAO} />;
}
