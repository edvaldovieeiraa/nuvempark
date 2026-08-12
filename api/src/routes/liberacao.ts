import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { tenantClient } from '../supabase.js';

/**
 * GET /tickets/:id/liberacao — o ticket tem voucher de parceiro?
 *
 * Consultado pelo app no momento em que o operador abre a saída. É uma
 * consulta pontual de propósito: a liberação pode ter sido feita segundos
 * antes, pelo lojista do outro lado da rua, e nenhum cache de 30 segundos
 * pegaria esse caso — que é justamente o mais comum (o cliente valida na loja
 * e caminha até o carro).
 *
 * Quando NÃO responde — celular offline, rede ruim, timeout — o app cobra a
 * tarifa cheia e avisa na tela que não conseguiu verificar. O operador não
 * recebe opção de conceder desconto: desconto só existe se veio do parceiro,
 * pelo sistema, e essa regra é o que torna o módulo auditável.
 */
export async function liberacaoRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>(
    '/tickets/:id/liberacao',
    { preHandler: requireAuth },
    async (req, reply) => {
      const operador = req.operador!;
      const ticketId = req.params.id;
      if (!ticketId) return reply.code(400).send({ error: 'ticket obrigatório' });

      const db = await tenantClient(operador.tenant_id);

      // RLS escopa por tenant; `patio_ids` do token não entra aqui porque o
      // ticket já carrega o pátio e a consulta é por id exato — um ticket de
      // outro pátio do MESMO tenant é um caso que não acontece no fluxo (o
      // operador escaneia o cupom que está na mão dele).
      const { data, error } = await db
        .from('liberacoes')
        .select(
          'id, liberado_em, parceiros(nome), voucher_regras(id, nome, abater_minutos, desconto_percentual, desconto_valor)',
        )
        .eq('ticket_id', ticketId)
        .is('cancelada_em', null)
        .maybeSingle();

      if (error) {
        // 502 e não 200-com-null: o app precisa distinguir "não tem voucher" de
        // "não deu para saber". Devolver null aqui faria o operador cobrar
        // cheio um cliente que TINHA desconto, sem ninguém perceber.
        return reply.code(502).send({ error: 'consulta indisponível' });
      }

      if (!data) return reply.send({ liberacao: null });

      // O PostgREST devolve o relacionamento como objeto ou array conforme a
      // cardinalidade que ele infere; normalizar aqui evita que o app precise
      // saber disso.
      const um = <T>(v: T | T[] | null): T | null =>
        Array.isArray(v) ? (v[0] ?? null) : v;

      const regra = um(
        data.voucher_regras as unknown as {
          id: string;
          nome: string;
          abater_minutos: number;
          desconto_percentual: number;
          desconto_valor: number;
        } | null,
      );
      const parceiro = um(
        data.parceiros as unknown as { nome: string } | null,
      );

      if (!regra) return reply.send({ liberacao: null });

      return reply.send({
        liberacao: {
          id: data.id,
          liberado_em: data.liberado_em,
          parceiro_nome: parceiro?.nome ?? 'Parceiro',
          regra: {
            id: regra.id,
            nome: regra.nome,
            abater_minutos: regra.abater_minutos,
            desconto_percentual: regra.desconto_percentual,
            desconto_valor: regra.desconto_valor,
          },
        },
      });
    },
  );
}
