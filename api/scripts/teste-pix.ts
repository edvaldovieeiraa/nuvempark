/**
 * Gera uma cobrança Pix de teste no Asaas para um ticket real, criando a linha
 * em `pagamentos_online`. Serve para validar a ponta a ponta ANTES da Entrega C
 * (página pública), sem precisar de UI.
 *
 *   npx tsx scripts/teste-pix.ts <ticket_id> [valor]
 *
 * Depois: pague no simulador do sandbox e confira o webhook chegando
 * (pagamentos_online.status = 'pago' + os 3 campos no ticket).
 *
 * Exige db/19 e db/20 aplicadas e um `tenant_gateways` ativo para o tenant do
 * ticket (ver scripts/cifrar-api-key.ts).
 */
import { createClient } from '@supabase/supabase-js';

import { env } from '../src/env.js';
import { adapterDoTenant } from '../src/pagamentos/index.js';

const ticketId = process.argv[2];
const valorArg = Number(process.argv[3] ?? '12.34');

if (!ticketId) {
  console.error('Uso: npx tsx scripts/teste-pix.ts <ticket_id> [valor]');
  process.exit(1);
}

// Script administrativo, rodado à mão: service_role é legítimo aqui.
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: ticket, error } = await db
  .from('tickets')
  .select('id, placa, patio_id, tenant_id')
  .eq('id', ticketId)
  .maybeSingle();

if (error) throw error;
if (!ticket) {
  console.error(`Ticket ${ticketId} não encontrado.`);
  process.exit(1);
}

// 1) Cria a cobrança local — o id dela é o externalReference no PSP.
const { data: pagamento, error: erroPag } = await db
  .from('pagamentos_online')
  .insert({
    ticket_id: ticket.id,
    patio_id: ticket.patio_id,
    tenant_id: ticket.tenant_id,
    valor: valorArg,
    status: 'pendente',
    gateway: 'asaas',
  })
  .select('id')
  .single();

if (erroPag) throw erroPag;

// 2) Gera o Pix no PSP.
const adapter = await adapterDoTenant(ticket.tenant_id as string);
const cobranca = await adapter.gerarCobrancaPix({
  valor: valorArg,
  descricao: `Estadia ${ticket.placa} (NuvemPark)`,
  referenciaExterna: pagamento.id as string,
  expiracaoMinutos: 30,
});

// 3) Guarda o que o PSP devolveu.
const { error: erroUp } = await db
  .from('pagamentos_online')
  .update({
    gateway_cobranca_id: cobranca.gatewayCobrancaId,
    pix_copia_cola: cobranca.pixCopiaCola,
    pix_qrcode_base64: cobranca.pixQrcodeBase64,
    expira_em: cobranca.expiraEm.toISOString(),
  })
  .eq('id', pagamento.id);

if (erroUp) throw erroUp;

console.log(`
✅ Cobrança criada.

  pagamentos_online.id : ${pagamento.id}
  cobrança no Asaas    : ${cobranca.gatewayCobrancaId}
  valor                : R$ ${valorArg.toFixed(2)}
  expira (nosso)       : ${cobranca.expiraEm.toISOString()}

Pix copia-e-cola:

${cobranca.pixCopiaCola}

Agora pague no simulador do sandbox Asaas e confira:

  select status, pago_em from public.pagamentos_online where id = '${pagamento.id}';
  select pago_online_em, pagamento_online_id, valor_pago_online
    from public.tickets where id = '${ticket.id}';
`);
