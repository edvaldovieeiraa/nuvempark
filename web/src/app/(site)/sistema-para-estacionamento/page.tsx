import { SolucaoRota, metadataDaSolucao } from "@/components/solucoes/rota";
import { PILAR } from "@/lib/solucoes";

/**
 * PÁGINA PILAR do silo de busca — o termo de cabeça do mercado
 * ("sistema para estacionamento" e suas variações no plural).
 *
 * Estática: o conteúdo é literal, não toca banco. Sai pronta do build e é
 * servida do cache, que é o comportamento certo para uma página de aterrissagem
 * de busca (a métrica de velocidade dela conta como fator de classificação).
 */
export const metadata = metadataDaSolucao(PILAR);

export default function SistemaParaEstacionamentoPage() {
  return <SolucaoRota pagina={PILAR} />;
}
