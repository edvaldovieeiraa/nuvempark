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
 *     `tenant_gateways` (leitura), TRÊS campos do ticket e — para a baixa de
 *     assinatura vinda do mesmo webhook — `faturas` e o `estado` de
 *     `assinaturas`. Não existe um `query(sql)` genérico exposto.
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

// ── Leituras da página pública ──────────────────────────────────────────────

export interface TicketPublico {
  id: string;
  placa: string;
  tipo_veiculo: string;
  entrada: string;
  status: string;
  patio_id: string;
  tenant_id: string;
  tabela_preco_id: string | null;
  pago_online_em: string | null;
  valor_pago_online: number | null;
  patio_nome: string;
  patio_ativo: boolean;
}

export interface TarifaLinha {
  fracao_inicial_minutos: number;
  fracao_inicial_valor: number;
  fracao_adicional_minutos: number;
  fracao_adicional_valor: number;
  teto_diaria: number;
  tolerancia_minutos: number;
  pernoite_valor: number;
  pernoite_hora_inicio: number;
  pernoite_hora_fim: number;
}

/**
 * Ticket para a página pública (quem escaneou o QR). Sem tenant na requisição —
 * o vínculo vem do próprio ticket, achado pelo UUID que já estava no QR.
 */
export async function lerTicketPublico(
  ticketId: string,
): Promise<TicketPublico | null> {
  const { data, error } = await servico
    .from('tickets')
    .select(
      'id, placa, tipo_veiculo, entrada, status, patio_id, tenant_id, tabela_preco_id, pago_online_em, valor_pago_online, patios!inner(nome, ativo)',
    )
    .eq('id', ticketId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const patio = data.patios as unknown as { nome: string; ativo: boolean };
  return {
    id: data.id as string,
    placa: data.placa as string,
    tipo_veiculo: data.tipo_veiculo as string,
    entrada: data.entrada as string,
    status: data.status as string,
    patio_id: data.patio_id as string,
    tenant_id: data.tenant_id as string,
    tabela_preco_id: (data.tabela_preco_id as string | null) ?? null,
    pago_online_em: (data.pago_online_em as string | null) ?? null,
    valor_pago_online:
      data.valor_pago_online === null ? null : Number(data.valor_pago_online),
    patio_nome: patio.nome,
    patio_ativo: patio.ativo,
  };
}

/** Gate de assinatura — tenant suspenso não cobra online. */
export async function assinaturaLibera(tenantId: string): Promise<boolean> {
  const { data, error } = await servico.rpc('fn_assinatura_libera', {
    p_tenant: tenantId,
  });
  if (error) throw error;
  return data === true;
}

/**
 * A tarifa a aplicar. Prefere a que o OPERADOR escolheu no registro
 * (`tickets.tabela_preco_id`): se o cliente pagasse por outra, o valor da página
 * não bateria com o da catraca. Só cai na seleção por menor `ordem` quando o
 * ticket não guardou tabela (entrada antiga ou tarifa apagada).
 */
export async function lerTarifaDoTicket(
  t: TicketPublico,
): Promise<TarifaLinha | null> {
  const campos =
    'fracao_inicial_minutos, fracao_inicial_valor, fracao_adicional_minutos, fracao_adicional_valor, teto_diaria, tolerancia_minutos, pernoite_valor, pernoite_hora_inicio, pernoite_hora_fim';

  if (t.tabela_preco_id) {
    const { data, error } = await servico
      .from('tarifas')
      .select(campos)
      .eq('id', t.tabela_preco_id)
      .maybeSingle();
    if (error) throw error;
    if (data) return numerica(data);
  }

  const agora = new Date().toISOString();
  const { data, error } = await servico
    .from('tarifas')
    .select(campos)
    .eq('patio_id', t.patio_id)
    .in('tipo_veiculo', [t.tipo_veiculo, 'ambos'])
    .eq('ativo', true)
    .lte('vigencia_inicio', agora)
    .or(`vigencia_fim.is.null,vigencia_fim.gte.${agora}`)
    .order('ordem', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? numerica(data) : null;
}

/** numeric do Postgres chega como string no supabase-js. */
function numerica(row: Record<string, unknown>): TarifaLinha {
  return {
    fracao_inicial_minutos: Number(row.fracao_inicial_minutos),
    fracao_inicial_valor: Number(row.fracao_inicial_valor),
    fracao_adicional_minutos: Number(row.fracao_adicional_minutos),
    fracao_adicional_valor: Number(row.fracao_adicional_valor),
    teto_diaria: Number(row.teto_diaria),
    tolerancia_minutos: Number(row.tolerancia_minutos),
    pernoite_valor: Number(row.pernoite_valor),
    pernoite_hora_inicio: Number(row.pernoite_hora_inicio),
    pernoite_hora_fim: Number(row.pernoite_hora_fim),
  };
}

export interface CobrancaPendente {
  id: string;
  valor: number;
  pix_copia_cola: string | null;
  pix_qrcode_base64: string | null;
  expira_em: string | null;
  gateway_cobranca_id: string | null;
  criado_em: string;
}

/**
 * Cobrança pendente e ainda válida deste ticket. Existe para NÃO criar cobrança
 * duplicada no PSP quando o cliente recarrega a página ou toca duas vezes.
 */
export async function lerCobrancaPendente(
  ticketId: string,
): Promise<CobrancaPendente | null> {
  const { data, error } = await servico
    .from('pagamentos_online')
    .select('id, valor, pix_copia_cola, pix_qrcode_base64, expira_em, gateway_cobranca_id, criado_em')
    .eq('ticket_id', ticketId)
    .eq('status', 'pendente')
    .gt('expira_em', new Date().toISOString())
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { ...data, valor: Number(data.valor) } as CobrancaPendente;
}

/** Cria a cobrança local ANTES de falar com o PSP — o id dela é o externalReference. */
export async function criarPagamento(params: {
  ticketId: string;
  patioId: string;
  tenantId: string;
  valor: number;
  expiraEm: Date;
}): Promise<string> {
  const { data, error } = await servico
    .from('pagamentos_online')
    .insert({
      ticket_id: params.ticketId,
      patio_id: params.patioId,
      tenant_id: params.tenantId,
      valor: params.valor,
      status: 'pendente',
      gateway: 'asaas',
      expira_em: params.expiraEm.toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

/** Guarda o que o PSP devolveu (copia-e-cola, QR, id da cobrança). */
export async function salvarDadosCobranca(params: {
  pagamentoId: string;
  gatewayCobrancaId: string;
  pixCopiaCola: string;
  pixQrcodeBase64: string;
  expiraEm: Date;
}): Promise<void> {
  const { error } = await servico
    .from('pagamentos_online')
    .update({
      gateway_cobranca_id: params.gatewayCobrancaId,
      pix_copia_cola: params.pixCopiaCola,
      pix_qrcode_base64: params.pixQrcodeBase64,
      expira_em: params.expiraEm.toISOString(),
    })
    .eq('id', params.pagamentoId);

  if (error) throw error;
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

// ── Faturas de assinatura (mesmo webhook, cobrança da conta plataforma) ──────

export interface LinhaFaturaAssinatura {
  id: string;
  tenant_id: string;
  estado: string;
}

/**
 * Fatura de ASSINATURA pela referência que o PSP devolve (o `externalReference`
 * da cobrança é o id da fatura no nosso banco). Usado quando a cobrança não é de
 * ticket — é a mensalidade do tenant, criada na conta plataforma.
 */
export async function acharFatura(
  externalReference: string | null,
): Promise<LinhaFaturaAssinatura | null> {
  if (!externalReference) return null;
  const { data, error } = await servico
    .from('faturas')
    .select('id, tenant_id, estado')
    .eq('id', externalReference)
    .maybeSingle();
  if (error) throw error;
  return (data as LinhaFaturaAssinatura) ?? null;
}

/**
 * Baixa a fatura de assinatura e, se estava em teste/atraso/suspensão, ATIVA a
 * assinatura (converte o trial em assinatura paga).
 *
 * IDEMPOTENTE: o update exige estado != 'paga' (e != 'cancelada'), então um
 * webhook repetido do Asaas vira no-op e devolve `false`.
 */
export async function marcarFaturaPaga(params: {
  faturaId: string;
  tenantId: string;
  forma: string;
  pagoEm: Date;
}): Promise<boolean> {
  const { data, error } = await servico
    .from('faturas')
    .update({
      estado: 'paga',
      pago_em: params.pagoEm.toISOString(),
      forma_pagamento: params.forma,
    })
    .eq('id', params.faturaId)
    .neq('estado', 'paga')
    .neq('estado', 'cancelada')
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) return false; // já paga/cancelada: no-op

  const { error: erroAssin } = await servico
    .from('assinaturas')
    .update({ estado: 'ativa', trial_expira_em: null })
    .eq('tenant_id', params.tenantId)
    .in('estado', ['trial', 'atrasada', 'suspensa']);
  if (erroAssin) throw erroAssin;

  return true;
}
