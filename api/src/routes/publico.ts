import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import { adapterDoTenant } from '../pagamentos/index.js';
import {
  assinaturaLibera,
  criarPagamento,
  lerCobrancaPendente,
  lerTarifaDoTicket,
  lerTicketPublico,
  marcarPago,
  salvarDadosCobranca,
  type TicketPublico,
} from '../pagamentos/repo.js';
import {
  CARENCIA_MINUTOS,
  EXPIRACAO_COBRANCA_MINUTOS,
  derivarEstado,
  mascararPlaca,
  ticketVisivel,
  type EstadoTicket,
} from '../pagamentos/ticket-publico.js';

/**
 * Endpoints da página pública do ticket (quem escaneou o QR do cupom).
 *
 * SEM AUTENTICAÇÃO e sem tenant na requisição: a identidade é o próprio UUID do
 * ticket, que já estava impresso no papel de quem o tem. Por isso:
 *
 *  - Todo caminho de recusa devolve o MESMO 404 genérico. Ticket inexistente,
 *    já fechado, pátio inativo e tenant suspenso são indistinguíveis de fora —
 *    senão o 404-vs-403 vira um oráculo de "este ticket existe".
 *  - A placa é exibida INTEIRA (decisão do produto): quem tem o link tem o
 *    cupom físico do próprio carro e precisa confirmar que é o dele. A
 *    descrição da cobrança Pix (extrato do banco) continua mascarada.
 *  - O id é validado como UUID ANTES de tocar o banco.
 *  - Rate limit no grupo (ver server.ts).
 */

const ID = z.object({ id: z.string().uuid() });

/** Um só corpo de erro para tudo o que não pode ser visto. */
function naoEncontrado(reply: FastifyReply) {
  return reply.code(404).send({ error: 'Ticket não encontrado' });
}

interface TicketResolvido {
  ticket: TicketPublico;
  estado: EstadoTicket;
  agora: Date;
}

export async function publicoRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Carrega o ticket e aplica TODOS os gates. Devolve null quando o chamador
   * deve responder 404 — a rota nunca decide "qual" 404.
   */
  async function resolver(id: string): Promise<TicketResolvido | null> {
    const ticket = await lerTicketPublico(id);
    if (!ticket) return null;
    if (!ticketVisivel(ticket)) return null;
    if (!(await assinaturaLibera(ticket.tenant_id))) return null;

    const agora = new Date();
    const tarifa = await lerTarifaDoTicket(ticket);
    return { ticket, estado: derivarEstado({ ticket, tarifa, agora }), agora };
  }

  // ── GET /ticket/:id ───────────────────────────────────────────────────────
  app.get('/ticket/:id', async (req, reply) => {
    const parsed = ID.safeParse(req.params);
    if (!parsed.success) return naoEncontrado(reply); // id malformado = 404, não 400

    const r = await resolver(parsed.data.id);
    if (!r) return naoEncontrado(reply);

    return reply.send({
      placa: r.ticket.placa,
      entrada: r.ticket.entrada,
      agora: r.agora.toISOString(), // relógio do servidor: o do celular pode estar errado
      patio_nome: r.ticket.patio_nome,
      status_pagamento: r.estado.statusPagamento,
      valor_atual: r.estado.valorAtual,
      pago: r.estado.pago,
      diferenca: r.estado.diferenca,
      carencia_minutos: CARENCIA_MINUTOS,
    });
  });

  // ── POST /ticket/:id/pix ──────────────────────────────────────────────────
  app.post('/ticket/:id/pix', async (req, reply) => {
    const parsed = ID.safeParse(req.params);
    if (!parsed.success) return naoEncontrado(reply);

    const r = await resolver(parsed.data.id);
    if (!r) return naoEncontrado(reply);

    // Pago e dentro da carência: não há o que cobrar.
    if (r.estado.statusPagamento === 'pago') {
      return reply.code(409).send({ error: 'Estadia já paga' });
    }

    // Cobrança pendente e ainda válida: devolve ESSA. Recarregar a página ou
    // tocar duas vezes no botão não pode gerar dois Pix no PSP.
    const pendente = await lerCobrancaPendente(r.ticket.id);
    if (pendente?.pix_copia_cola && pendente.expira_em) {
      return reply.send({
        pagamento_id: pendente.id,
        valor: pendente.valor,
        pix_copia_cola: pendente.pix_copia_cola,
        pix_qrcode_base64: pendente.pix_qrcode_base64,
        expira_em: pendente.expira_em,
      });
    }

    // Quanto cobrar: a estadia toda, ou só a diferença de quem já pagou e ficou.
    const valor =
      r.estado.statusPagamento === 'pago_diferenca_pendente'
        ? (r.estado.diferenca ?? 0)
        : (r.estado.valorAtual ?? 0);

    if (valor <= 0) {
      // Tolerância, ou tarifa não encontrada. Não geramos Pix de R$ 0.
      return reply.code(409).send({ error: 'Nada a pagar' });
    }

    const expiraEm = new Date(
      Date.now() + EXPIRACAO_COBRANCA_MINUTOS * 60_000,
    );

    // A linha local nasce ANTES do PSP: o id dela é o externalReference que volta
    // no webhook. Se o PSP falhar depois, sobra uma cobrança pendente sem Pix —
    // que expira sozinha e não confunde ninguém (lerCobrancaPendente exige
    // pix_copia_cola preenchido para reaproveitar).
    const pagamentoId = await criarPagamento({
      ticketId: r.ticket.id,
      patioId: r.ticket.patio_id,
      tenantId: r.ticket.tenant_id,
      valor,
      expiraEm,
    });

    const adapter = await adapterDoTenant(r.ticket.tenant_id);
    const cobranca = await adapter.gerarCobrancaPix({
      valor,
      descricao: `Estadia ${mascararPlaca(r.ticket.placa)} — ${r.ticket.patio_nome}`,
      referenciaExterna: pagamentoId,
      expiracaoMinutos: EXPIRACAO_COBRANCA_MINUTOS,
    });

    await salvarDadosCobranca({
      pagamentoId,
      gatewayCobrancaId: cobranca.gatewayCobrancaId,
      pixCopiaCola: cobranca.pixCopiaCola,
      pixQrcodeBase64: cobranca.pixQrcodeBase64,
      expiraEm: cobranca.expiraEm,
    });

    return reply.send({
      pagamento_id: pagamentoId,
      valor,
      pix_copia_cola: cobranca.pixCopiaCola,
      pix_qrcode_base64: cobranca.pixQrcodeBase64,
      expira_em: cobranca.expiraEm.toISOString(),
    });
  });

  // ── GET /ticket/:id/pagamento (polling) ───────────────────────────────────
  app.get('/ticket/:id/pagamento', async (req, reply) => {
    const parsed = ID.safeParse(req.params);
    if (!parsed.success) return naoEncontrado(reply);

    const r = await resolver(parsed.data.id);
    if (!r) return naoEncontrado(reply);

    // Rede de segurança para WEBHOOK PERDIDO. O caminho normal é o webhook: sem
    // ele, o cliente pagaria e a página ficaria girando para sempre. Só depois
    // de 60s de pendência vale a pena perguntar ao PSP — antes disso o webhook
    // quase sempre já chegou, e cada consulta é uma chamada de rede paga.
    if (r.estado.statusPagamento !== 'pago') {
      const pendente = await lerCobrancaPendente(r.ticket.id);
      const idadeMs = pendente
        ? Date.now() - new Date(pendente.criado_em).getTime()
        : 0;

      if (pendente?.gateway_cobranca_id && idadeMs > 60_000) {
        const adapter = await adapterDoTenant(r.ticket.tenant_id);
        const statusPsp = await adapter.consultarStatus(
          pendente.gateway_cobranca_id,
        );
        if (statusPsp === 'pago') {
          // Mesma função do webhook: idempotente, não duplica carimbo.
          await marcarPago({
            pagamentoId: pendente.id,
            ticketId: r.ticket.id,
            valor: pendente.valor,
            pagoEm: new Date(),
          });
          const atualizado = await resolver(r.ticket.id);
          return reply.send({
            status_pagamento: atualizado?.estado.statusPagamento ?? 'pago',
          });
        }
      }
    }

    return reply.send({ status_pagamento: r.estado.statusPagamento });
  });
}
