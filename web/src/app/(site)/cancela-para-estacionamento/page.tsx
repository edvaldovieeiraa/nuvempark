import { SolucaoRota, metadataDaSolucao } from "@/components/solucoes/rota";
import { CANCELA } from "@/lib/solucoes-cancela";

/**
 * Silo: "cancela para estacionamento".
 *
 * Consulta de hardware respondida por quem vende software — ver o cabeçalho de
 * `lib/solucoes-cancela.ts` antes de mudar qualquer afirmação sobre integração.
 */
export const metadata = metadataDaSolucao(CANCELA);

export default function CancelaParaEstacionamentoPage() {
  return <SolucaoRota pagina={CANCELA} />;
}
