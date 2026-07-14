import { AsaasAdapter } from './asaas.js';
import { decrypt } from './crypto.js';
import type { GatewayTenant, PagamentoAdapter } from './adapter.js';
import { lerGatewayDoTenant } from './repo.js';

export type {
  CobrancaPix,
  GatewayTenant,
  PagamentoAdapter,
  StatusPagamento,
} from './adapter.js';

/**
 * Resolve o adapter do tenant a partir de `tenant_gateways`. É o ÚNICO ponto do
 * sistema que sabe quais PSPs existem — trocar de gateway é acrescentar um case.
 *
 * Lança se o tenant não tem gateway ativo: melhor falhar claro do que gerar uma
 * cobrança que ninguém sabe para onde vai.
 */
export async function adapterDoTenant(
  tenantId: string,
): Promise<PagamentoAdapter> {
  const linha = await lerGatewayDoTenant(tenantId);
  if (!linha) {
    throw new Error(`Tenant ${tenantId} não tem gateway de pagamento ativo.`);
  }

  const cfg: GatewayTenant = {
    gateway: linha.gateway,
    // Decifra só aqui, no último momento, e nunca sai deste objeto.
    apiKey: decrypt(linha.api_key_encrypted),
    subcontaId: linha.subconta_id,
    customerPadraoId: linha.customer_padrao_id,
    splitPercentual: Number(linha.split_percentual),
    splitValorFixo: Number(linha.split_valor_fixo),
  };

  switch (cfg.gateway) {
    case 'asaas':
      return new AsaasAdapter(cfg);
    default:
      throw new Error(`Gateway não suportado: ${cfg.gateway}`);
  }
}
