import { SolucaoRota, metadataDaSolucao } from "@/components/solucoes/rota";
import { LEITURA_PLACA } from "@/lib/solucoes-leitura-placa";

/** Silo: "leitura de placa para estacionamento" / "LPR para estacionamento". */
export const metadata = metadataDaSolucao(LEITURA_PLACA);

export default function LeituraDePlacaParaEstacionamentoPage() {
  return <SolucaoRota pagina={LEITURA_PLACA} />;
}
