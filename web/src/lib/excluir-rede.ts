/**
 * Regras da exclusão definitiva de uma rede pelo master.
 *
 * Lógica pura, sem banco nem rede, para poder ser testada. Quem executa é a
 * action `excluirTenant` (app/master/(console)/tenants/actions.ts), e a função
 * do banco `fn_master_excluir_tenant` (db/54) repete as três guardas: a action
 * pode ser chamada sem passar pela tela, e o banco não confia na action.
 */

export type RedeParaExcluir = {
  ativo: boolean;
  contaRevisao: boolean;
  codigo: string;
};

/**
 * Por que a rede não pode ser excluída agora, ou `null` se pode.
 *
 * - A conta de revisão das lojas (Google Play / App Store) nunca sai: toda
 *   atualização do app passa por ela.
 * - Rede ativa não sai direto. Desativar primeiro é o que separa um clique
 *   errado num cliente pagante de uma perda sem volta.
 * - O código de 4 dígitos digitado confirma qual rede está sendo apagada.
 */
export function motivoBloqueioExclusao(
  rede: RedeParaExcluir,
  codigoDigitado: string,
): string | null {
  if (rede.contaRevisao)
    return "Esta é a conta de revisão das lojas de app e não pode ser excluída.";
  if (rede.ativo) return "Desative a rede antes de excluir.";
  if (codigoDigitado.trim() !== rede.codigo)
    return "O código digitado não confere com o da rede.";
  return null;
}

type FaturaGateway = {
  estado: string;
  gateway_cobranca_id: string | null;
};

/**
 * Cobranças da mensalidade que ainda podem ser pagas no Asaas e precisam sair
 * de lá antes da rede sumir daqui. Paga e cancelada ficam de fora: apagar uma
 * cobrança paga no Asaas não devolve o dinheiro e só bagunça o extrato.
 */
export function cobrancasParaCancelar(faturas: FaturaGateway[]): string[] {
  const ids = faturas
    .filter((f) => (f.estado === "aberta" || f.estado === "vencida") && f.gateway_cobranca_id)
    .map((f) => f.gateway_cobranca_id as string);
  return [...new Set(ids)];
}

export type CobrancaAsaasEstado = { deleted?: boolean; status?: string };

/**
 * O que fazer com uma cobrança, a partir do estado dela NO ASAAS (o nosso banco
 * pode estar atrasado: o webhook de pagamento pode não ter chegado).
 *
 * - `null` (404) ou já removida → nada a fazer. Repetir o DELETE no Asaas pode
 *   dar erro, então não se tenta.
 * - Pendente ou vencida → excluir.
 * - Qualquer outro status (paga, estornada, em análise…) → bloquear a exclusão
 *   da rede. Entrou dinheiro ou há algo em andamento, e isso pede um humano.
 */
export function decisaoCobrancaAsaas(
  cobranca: CobrancaAsaasEstado | null,
): "ignorar" | "excluir" | "bloquear" {
  if (!cobranca || cobranca.deleted) return "ignorar";
  if (cobranca.status === "PENDING" || cobranca.status === "OVERDUE") return "excluir";
  return "bloquear";
}
