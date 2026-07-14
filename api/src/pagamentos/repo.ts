import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '../env.js';

/**
 * ⚠️ EXCEÇÃO CONSCIENTE À REGRA DE OURO (ver src/supabase.ts).
 *
 * Todo o resto da API usa cliente TENANT-SCOPED, para a RLS isolar as linhas no
 * próprio banco. Aqui não dá: os dois caminhos deste módulo NÃO TÊM IDENTIDADE
 * DE TENANT na requisição.
 *
 *  - O webhook do PSP chega do Asaas, não de um operador logado. A única coisa
 *    que ele traz é o `externalReference` (o id da nossa cobrança) e um token de
 *    webhook. Não há JWT, não há tenant.
 *  - A página pública de pagamento é acessada por quem escaneou o QR: um cliente
 *    anônimo, sem conta.
 *
 * As proteções que substituem a RLS aqui:
 *  1. Este cliente vive SÓ neste arquivo. Nenhuma outra rota o importa.
 *  2. As funções abaixo são de ESCOPO ESTREITO: tocam apenas `pagamentos_online`,
 *     `tenant_gateways` (leitura) e TRÊS campos do ticket. Não existe um
 *     `query(sql)` genérico exposto.
 *  3. Cada função busca pelo id da PRÓPRIA cobrança e usa o `tenant_id` que já
 *     está gravado nela — nunca um tenant vindo da requisição.
 *  4. O webhook valida o token do Asaas antes de chegar aqui.
 *
 * Se um dia alguém precisar de outra tabela neste fluxo, a função nova entra
 * AQUI, revisada — não um novo cliente service_role espalhado pela base.
 */
const servico: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export interface LinhaGatewayTenant {
  gateway: string;
  api_key_encrypted: string;
  subconta_id: string | null;
  customer_padrao_id: string | null;
  split_percentual: number;
  split_valor_fixo: number;
}

/** Gateway ATIVO do tenant. `null` se não configurado. */
export async function lerGatewayDoTenant(
  tenantId: string,
): Promise<LinhaGatewayTenant | null> {
  const { data, error } = await servico
    .from('tenant_gateways')
    .select(
      'gateway, api_key_encrypted, subconta_id, customer_padrao_id, split_percentual, split_valor_fixo',
    )
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .maybeSingle();

  if (error) throw error;
  if (!data?.api_key_encrypted) return null;
  return data as LinhaGatewayTenant;
}

export interface LinhaPagamentoOnline {
  id: string;
  ticket_id: string;
  tenant_id: string;
  patio_id: string;
  valor: number;
  status: string;
}

/**
 * Cobrança pela referência que o PSP devolve. Aceita tanto o nosso id
 * (externalReference) quanto o id do PSP — o Asaas manda os dois no webhook, e
 * cobranças antigas podem ter só um deles.
 */
export async function acharPagamento(params: {
  externalReference?: string | null;
  gatewayCobrancaId?: string | null;
}): Promise<LinhaPagamentoOnline | null> {
  const campos = 'id, ticket_id, tenant_id, patio_id, valor, status';

  if (params.externalReference) {
    const { data, error } = await servico
      .from('pagamentos_online')
      .select(campos)
      .eq('id', params.externalReference)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as LinhaPagamentoOnline;
  }

  if (params.gatewayCobrancaId) {
    const { data, error } = await servico
      .from('pagamentos_online')
      .select(campos)
      .eq('gateway_cobranca_id', params.gatewayCobrancaId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as LinhaPagamentoOnline;
  }

  return null;
}

/**
 * Marca a cobrança como paga e estampa os três campos-espelho no ticket.
 *
 * IDEMPOTENTE por construção: o update da cobrança exige `status = 'pendente'`,
 * então um webhook repetido (o Asaas re-tenta) não reescreve nada e devolve
 * `false`. O ticket só é carimbado quando a cobrança REALMENTE virou paga
 * nesta chamada — sem isso, um retry poderia sobrescrever o pagamento vigente.
 */
export async function marcarPago(params: {
  pagamentoId: string;
  ticketId: string;
  valor: number;
  pagoEm: Date;
}): Promise<boolean> {
  const pagoEmIso = params.pagoEm.toISOString();

  const { data, error } = await servico
    .from('pagamentos_online')
    .update({ status: 'pago', pago_em: pagoEmIso })
    .eq('id', params.pagamentoId)
    .eq('status', 'pendente') // ← a trava de idempotência
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) return false; // já estava pago: no-op

  const { error: erroTicket } = await servico
    .from('tickets')
    .update({
      pago_online_em: pagoEmIso,
      pagamento_online_id: params.pagamentoId,
      valor_pago_online: params.valor,
    })
    .eq('id', params.ticketId);

  if (erroTicket) throw erroTicket;
  return true;
}
