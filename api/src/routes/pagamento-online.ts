import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { lerTarifaDoTicket, lerTicketPublico } from '../pagamentos/repo.js';
import { derivarEstado } from '../pagamentos/ticket-publico.js';

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

export async function pagamentoOnlineRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/ticket/:id/pagamento-online',
    { preHandler: requireAuth },
    async (req, reply) => {
      const operador = req.operador!;

      const parsed = ID.safeParse(req.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'id inválido' });
      }

      const ticket = await lerTicketPublico(parsed.data.id);
      if (!ticket) {
        return reply.code(404).send({ error: 'Ticket não encontrado' });
      }

      // Autorização: o operador precisa ser do MESMO tenant e ter acesso ao
      // pátio do ticket. Sem isto, um operador de outro cliente consultaria
      // pagamentos alheios só sabendo o UUID.
      if (
        ticket.tenant_id !== operador.tenant_id ||
        !operador.patio_ids.includes(ticket.patio_id)
      ) {
        return reply.code(403).send({ error: 'Sem acesso a este ticket' });
      }

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
}
