import { SolucaoRota, metadataDaSolucao } from "@/components/solucoes/rota";
import { VALIDACAO } from "@/lib/solucoes";

/** Silo: "validação de estacionamento" — a intenção é do convênio com lojista. */
export const metadata = metadataDaSolucao(VALIDACAO);

export default function ValidacaoDeEstacionamentoPage() {
  return <SolucaoRota pagina={VALIDACAO} />;
}
