/**
 * Contrato do PSP. Trocar de gateway = escrever outra implementação desta
 * interface e mudar a factory (index.ts) — nada mais no sistema sabe que existe
 * Asaas. Decisão #10 do PLANO-EXECUCAO: PSP trocável.
 */

export type StatusPagamento = 'pendente' | 'pago' | 'expirado' | 'cancelado';

export interface CobrancaPix {
  gatewayCobrancaId: string;
  /** Código Pix copia-e-cola. */
  pixCopiaCola: string;
  /** Imagem do QR em base64 (sem o prefixo data:). */
  pixQrcodeBase64: string;
  /**
   * Quando esta cobrança deixa de valer PARA NÓS.
   *
   * Não confundir com a expiração do QR no PSP: o Asaas trabalha com `dueDate`
   * em granularidade de DIA, e o QR dele vale meses. A janela curta (o cliente
   * paga o valor calculado agora, não o de 3 horas atrás) é regra NOSSA, e é
   * este campo que a carrega.
   */
  expiraEm: Date;
}

export interface PagamentoAdapter {
  gerarCobrancaPix(params: {
    valor: number;
    descricao: string;
    /** `pagamentos_online.id` — volta no webhook como externalReference. */
    referenciaExterna: string;
    expiracaoMinutos: number;
  }): Promise<CobrancaPix>;

  consultarStatus(gatewayCobrancaId: string): Promise<StatusPagamento>;
}

/** Configuração do gateway de um tenant (linha de `tenant_gateways`, decifrada). */
export interface GatewayTenant {
  gateway: string;
  /** Chave da subconta do tenant, já DECIFRADA. Nunca logar. */
  apiKey: string;
  /** Wallet da subconta do tenant no PSP. */
  subcontaId: string | null;
  /** Cliente genérico reutilizado nas cobranças avulsas (ver asaas.ts). */
  customerPadraoId: string | null;
  splitPercentual: number;
  splitValorFixo: number;
}
