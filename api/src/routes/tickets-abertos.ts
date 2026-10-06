import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { tenantClient } from '../supabase.js';

/**
 * Colunas do ticket aberto que o app precisa para dar a saída de um carro que
 * entrou por OUTRO aparelho. Compartilhada com o bootstrap, que manda a lista
 * completa do pátio a cada ciclo de sync.
 */
export const COLUNAS_TICKET_ABERTO =
  'id, placa, tipo_veiculo, entrada, operador_id, caixa_sessao_id, tabela_preco_id, cliente_id, plano_id, origem';

/**
 * GET /tickets/aberto?patio_id=...&placa=... (ou &id=...)
 *
 * Busca pontual de um ticket aberto quando o celular não o tem. O ciclo de 30s
 * do bootstrap traz os carros dos outros aparelhos, mas não pega o caso mais
 * comum: o carro entrou pelo aparelho do pátio há segundos e já está no caixa.
 *
 * `{ ticket: null }` = não há ticket aberto. Erro de banco = 502, para o app
 * não confundir "não existe" com "não deu para consultar".
 */
export async function ticketsAbertosRoutes(app: FastifyInstance): Promise<void> {
  app.get('/tickets/aberto', { preHandler: requireAuth }, async (req, reply) => {
    const operador = req.operador!;
    const q = req.query as Record<string, string | undefined>;
    const patioId = q.patio_id;
    const placa = q.placa?.trim().toUpperCase();
    const id = q.id?.trim();

    if (!patioId || (!placa && !id)) {
      return reply.code(400).send({ error: 'patio_id e placa ou id obrigatórios' });
    }
    if (!operador.patio_ids.includes(patioId)) {
      return reply.code(403).send({ error: 'Sem acesso a este pátio' });
    }

    const db = await tenantClient(operador.tenant_id);
    let query = db
      .from('tickets')
      .select(COLUNAS_TICKET_ABERTO)
      .eq('patio_id', patioId)
      .eq('status', 'aberto');
    query = id ? query.eq('id', id) : query.eq('placa', placa!);

    // Mais de um aberto com a mesma placa (dado antigo): vale o mais recente,
    // igual à busca local do app.
    const { data, error } = await query
      .order('entrada', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return reply.code(502).send({ error: 'consulta indisponível' });
    return reply.send({ ticket: data ?? null });
  });
}
