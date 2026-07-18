import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { gerarOuReaproveitarPix } from '../pagamentos/cobranca.js';
import {
  lerTarifaDoTicket,
  lerTicketPublico,
  type TicketPublico,
} from '../pagamentos/repo.js';
import { derivarEstado } from '../pagamentos/ticket-publico.js';
import type { OperadorTokenPayload } from '../auth/jwt.js';

/**
 * Consulta de pagamento online para o APP DO OPERADOR (rota mobile, autenticada
 * — não confundir com o grupo público, que atende o cliente do QR).
 *
 * A carência e a diferença saem de `derivarEstado`, a MESMA função dos endpoints
 * públicos. Duplicar essa regra seria pedir para o app e a página divergirem: o
 * cliente veria "pago" e o operador cobraria de novo.
 *
 * A carência é verdade do SERVIDOR. O app não a recalcula — só exibe.
 */

const ID = z.object({ id: z.string().uuid() });

/**
 * Resolve o ticket e checa o acesso do operador (mesmo tenant + pátio). Devolve
 * o ticket, ou `null` DEPOIS de já ter respondido o erro (400/403/404). Sem
 * isto, um operador de outro cliente tocaria tickets alheios só sabendo o UUID.
 */
async function resolverAutorizado(
  id: unknown,
  operador: OperadorTokenPayload,
  reply: FastifyReply,
): Promise<TicketPublico | null> {
  const parsed = ID.safeParse({ id });
  if (!parsed.success) {
    await reply.code(400).send({ error: 'id inválido' });
    return null;
  }
  const ticket = await lerTicketPublico(parsed.data.id);
  if (!ticket) {
    await reply.code(404).send({ error: 'Ticket não encontrado' });
    return null;
  }
  if (
    ticket.tenant_id !== operador.tenant_id ||
    !operador.patio_ids.includes(ticket.patio_id)
  ) {
    await reply.code(403).send({ error: 'Sem acesso a este ticket' });
    return null;
  }
  return ticket;
}

export async function pagamentoOnlineRoutes(app: FastifyInstance): Promise<void> {
  // ── Consulta de pagamento (polling da saída) ────────────────────────────
  app.get(
    '/ticket/:id/pagamento-online',
    { preHandler: requireAuth },
    async (req, reply) => {
      const id = (req.params as { id?: unknown }).id;
      const ticket = await resolverAutorizado(id, req.operador!, reply);
      if (!ticket) return reply; // já respondeu o erro

      const tarifa = await lerTarifaDoTicket(ticket);
      const estado = derivarEstado({ ticket, tarifa, agora: new Date() });

      const pago = estado.statusPagamento !== 'nao_pago';

      return reply.send({
        pago,
        valor_pago: estado.pago?.valor ?? null,
        pago_em: estado.pago?.pagoEm ?? null,
        // Dentro da carência = pode sair sem pagar mais nada.
        dentro_carencia: estado.statusPagamento === 'pago',
        // > 0 só quando a carência estourou e a estadia passou do valor pago.
        diferenca: estado.diferenca,
      });
    },
  );

  // ── Pix dinâmico: o operador gera a cobrança na saída ───────────────────
  // MESMA geração da página pública (pagamentos/cobranca.ts) — as duas TÊM de
  // produzir cobranças idênticas. Aqui só muda quem pede: operador autenticado
  // em vez do cliente anônimo do QR.
  app.post(
    '/ticket/:id/pix',
    { preHandler: requireAuth },
    async (req, reply) => {
      const id = (req.params as { id?: unknown }).id;
      const ticket = await resolverAutorizado(id, req.operador!, reply);
      if (!ticket) return reply; // já respondeu o erro

      const tarifa = await lerTarifaDoTicket(ticket);
      const estado = derivarEstado({ ticket, tarifa, agora: new Date() });

      // origem 'app': Pix dinâmico do operador → entra no caixa dele e fica fora
      // da listagem de Pix online do painel (ver migração 25).
      const res = await gerarOuReaproveitarPix(ticket, estado, 'app');
      if (!res.ok) return reply.code(res.code).send({ error: res.error });
      return reply.send(res.cobranca);
    },
  );
}
