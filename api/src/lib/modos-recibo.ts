/**
 * Impressão automática dos recibos de pagamento, por pátio (db/53).
 * 'automatica' é o padrão da coluna e o comportamento de sempre; qualquer
 * valor fora da lista cai nele, para nunca mandar ao app algo que ele não lê.
 */
const MODOS = ['automatica', 'perguntar', 'desativada'] as const;
export type ModoRecibo = (typeof MODOS)[number];

function modo(v: string | null | undefined): ModoRecibo {
  return MODOS.includes(v as ModoRecibo) ? (v as ModoRecibo) : 'automatica';
}

export function modosRecibo(patio: {
  recibo_saida_modo?: string | null;
  recibo_estadia_modo?: string | null;
  recibo_caixa_modo?: string | null;
}): {
  recibo_saida_modo: ModoRecibo;
  recibo_estadia_modo: ModoRecibo;
  recibo_caixa_modo: ModoRecibo;
} {
  return {
    recibo_saida_modo: modo(patio.recibo_saida_modo),
    recibo_estadia_modo: modo(patio.recibo_estadia_modo),
    recibo_caixa_modo: modo(patio.recibo_caixa_modo),
  };
}
