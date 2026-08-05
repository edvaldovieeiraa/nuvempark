import { SolucaoRota, metadataDaSolucao } from "@/components/solucoes/rota";
import { CONTROLE } from "@/lib/solucoes";

/** Silo: "controle de estacionamento" / "entrada e saída de veículos". */
export const metadata = metadataDaSolucao(CONTROLE);

export default function ControleDeEstacionamentoPage() {
  return <SolucaoRota pagina={CONTROLE} />;
}
