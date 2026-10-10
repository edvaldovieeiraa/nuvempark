import { SolucaoRota, metadataDaSolucao } from "@/components/solucoes/rota";
import { HOTEL } from "@/lib/solucoes-hotel";

/**
 * Silo: "sistema de estacionamento para hotel" — hotel e pousada com
 * estacionamento próprio (estadia de hóspede). O convênio com estacionamento
 * parceiro é outra página: `/validacao-de-estacionamento`.
 */
export const metadata = metadataDaSolucao(HOTEL);

export default function SistemaDeEstacionamentoParaHotelPage() {
  return <SolucaoRota pagina={HOTEL} />;
}
