import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { env } from '../env.js';
import {
  acharPagamento,
  marcarPago,
  acharFatura,
  marcarFaturaPaga,
} from '../pagamentos/repo.js';

/**
 * Webhook do Asaas — confirma o pagamento online do ticket.
 *
 * Mora FORA do prefixo mobile e do middleware de auth do operador: quem chama é
 * o PSP, não um operador. A identidade vem do token de webhook (header
 * `asaas-access-token`), e o vínculo com o tenant vem da própria cobrança
 * (buscada pelo `externalReference`), nunca da requisição.
 *
 * REGRA DE RETRY: o Asaas re-tenta em qualquer resposta que não seja 2xx. Então
 * evento que não tratamos devolve 200 (e não 4xx) — do contrário ele fica
 * batendo para sempre num evento que nunca vamos processar.
 */

const EventoAsaas = z.object({
  event: z.string(),
  payment: z
    .object({
      id: z.string().optional(),
      externalReference: z.string().nullish(),
      value: z.number().optional(),
      billingType: z.string().nullish(),
    })
    .optional(),
});

/** billingType do Asaas → forma_pagamento das nossas faturas. */
function mapearForma(billingType?: string | null): string {
  switch (billingType) {
    case 'BOLETO':
      return 'boleto';
    case 'CREDIT_CARD':
      return 'cartao';
    case 'PIX':
    default:
      return 'pix';
  }
}

/** Eventos que significam "o dinheiro entrou". */
const EVENTOS_PAGO = new Set(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED']);

export async function webhookAsaasRoutes(app: FastifyInstance): Promise<void> {
  app.post('/webhooks/asaas', async (req, reply) => {
    // ── 1. Autenticação do webhook ──────────────────────────────────────────
    if (!env.ASAAS_WEBHOOK_TOKEN) {
      req.log.error('ASAAS_WEBHOOK_TOKEN não configurado — webhook recusado.');
      return reply.code(503).send({ error: 'Webhook não configurado' });
    }
    const token = req.headers['asaas-access-token'];
    if (token !== env.ASAAS_WEBHOOK_TOKEN) {
      // Sem detalhe no corpo: não ajudamos quem está sondando.
      return reply.code(401).send({ error: 'Não autorizado' });
    }

    // ── 2. Corpo ────────────────────────────────────────────────────────────
    const parsed = EventoAsaas.safeParse(req.body);
    if (!parsed.success) {
      // Corpo que não entendemos: 200 para o Asaas parar de re-tentar, mas
      // logado como aviso — se aparecer muito, o contrato mudou.
      req.log.warn({ erro: parsed.error.flatten() }, 'webhook asaas: corpo inesperado');
      return reply.send({ ok: true, ignorado: true, motivo: 'corpo-invalido' });
    }
    const { event, payment } = parsed.data;

    // ── 3. Eventos que não tratamos → 200 no-op ─────────────────────────────
    if (!EVENTOS_PAGO.has(event)) {
      return reply.send({ ok: true, ignorado: true, motivo: 'evento-nao-tratado' });
    }

    // ── 4. Localizar a cobrança ─────────────────────────────────────────────
    const pagamento = await acharPagamento({
      externalReference: payment?.externalReference ?? null,
      gatewayCobrancaId: payment?.id ?? null,
    });

    if (!pagamento) {
      // Não é ticket. Pode ser a MENSALIDADE do tenant (fatura de assinatura,
      // cobrança criada na conta plataforma): o mesmo webhook baixa a fatura e
      // ativa a assinatura. Idempotente — retry vira no-op.
      const fatura = await acharFatura(payment?.externalReference ?? null);
      if (fatura) {
        const mudou = await marcarFaturaPaga({
          faturaId: fatura.id,
          tenantId: fatura.tenant_id,
          forma: mapearForma(payment?.billingType),
          pagoEm: new Date(),
        });
        if (mudou) {
          req.log.info(
            { faturaId: fatura.id, tenantId: fatura.tenant_id },
            'fatura de assinatura confirmada (trial/atraso → ativa)',
          );
        }
        return reply.send({ ok: true, pago: true, tipo: 'fatura', jaProcessado: !mudou });
      }

      // Cobrança de outro sistema na mesma conta Asaas, ou já apagada. 200: não
      // é erro do Asaas, e re-tentar não vai fazer a linha aparecer.
      req.log.warn(
        { event, externalReference: payment?.externalReference },
        'webhook asaas: cobrança não encontrada',
      );
      return reply.send({ ok: true, ignorado: true, motivo: 'nao-encontrado' });
    }

    // ── 5. Marcar pago (idempotente) ────────────────────────────────────────
    // `marcarPago` só escreve se a cobrança ainda estava 'pendente'. Evento
    // repetido (o Asaas manda o mesmo mais de uma vez) vira no-op.
    const mudou = await marcarPago({
      pagamentoId: pagamento.id,
      ticketId: pagamento.ticket_id,
      valor: payment?.value ?? Number(pagamento.valor),
      pagoEm: new Date(),
    });

    if (mudou) {
      req.log.info(
        { pagamentoId: pagamento.id, ticketId: pagamento.ticket_id },
        'pagamento online confirmado',
      );
    }

    return reply.send({ ok: true, pago: true, jaProcessado: !mudou });
  });
}
