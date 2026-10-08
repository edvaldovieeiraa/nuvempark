import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { tenantClient } from '../supabase.js';
import { montarEstadias, type PagamentoResumo } from '../lib/estadia.js';

/**
 * Colunas do ticket aberto que o app precisa para dar a saída de um carro que
 * entrou por OUTRO aparelho. Mesmas colunas na lista e na busca pontual.
 */
export const COLUNAS_TICKET_ABERTO =
  'id, placa, tipo_veiculo, entrada, operador_id, caixa_sessao_id, tabela_preco_id, cliente_id, plano_id, origem, estadia_id';

const COLUNAS_ESTADIA =
  'id, placa, tipo_veiculo, tarifa_id, diaria_valor, diaria_horas, inicio, valida_ate, diarias, valor_total';

/** Estadia vencida continua no aparelho por esta janela (aviso na volta, aba Hóspedes). */
const JANELA_VENCIDA_MS = 7 * 24 * 60 * 60 * 1000;

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
  /**
   * GET /tickets/abertos?patio_id=... — todos os veículos no pátio agora,
   * entrados por QUALQUER aparelho.
   *
   * O app chama a cada 5s com a tela aberta. Para isso custar pouco, a resposta
   * leva um ETag (hash da lista) e o app o devolve em If-None-Match: lista igual
   * → 304 sem corpo. A comparação ignora o prefixo fraco `W/`, que um proxy no
   * caminho pode acrescentar ao comprimir a resposta.
   *
   * O app APAGA os abertos locais que não vierem na lista, então qualquer falha
   * aqui é 502 — nunca uma lista vazia, que esvaziaria o pátio no celular.
   */
  app.get('/tickets/abertos', { preHandler: requireAuth }, async (req, reply) => {
    const operador = req.operador!;
    const patioId = (req.query as Record<string, string | undefined>).patio_id;

    if (!patioId) return reply.code(400).send({ error: 'patio_id obrigatório' });
    if (!operador.patio_ids.includes(patioId)) {
      return reply.code(403).send({ error: 'Sem acesso a este pátio' });
    }

    const db = await tenantClient(operador.tenant_id);
    // Índice: idx_tickets_patio_status. O limite cobre qualquer pátio real; se
    // for atingido a lista estaria incompleta, e incompleta apagaria carros.
    const LIMITE = 5000;
    const { data, error } = await db
      .from('tickets')
      .select(COLUNAS_TICKET_ABERTO)
      .eq('patio_id', patioId)
      .eq('status', 'aberto')
      .order('entrada', { ascending: false })
      .order('id', { ascending: true })
      .limit(LIMITE);
    if (error || (data ?? []).length >= LIMITE) {
      return reply.code(502).send({ error: 'consulta indisponível' });
    }

    // Estadias que o aparelho precisa ter: válidas, vencidas há até 7 dias e
    // QUALQUER uma ligada a um carro que está dentro — sem esta última, um
    // hóspede que ficou além da janela cairia no "estadia não encontrada" e a
    // saída não teria como calcular o atraso. Cada uma leva os pagamentos (a
    // ficha da estadia precisa deles em qualquer aparelho).
    const corte = new Date(Date.now() - JANELA_VENCIDA_MS).toISOString();
    const idsDeCarroDentro = [
      ...new Set(
        (data ?? [])
          .map((t) => (t as { estadia_id?: string | null }).estadia_id)
          .filter((id): id is string => !!id),
      ),
    ];
    const [recentes, deCarroDentro] = await Promise.all([
      db.from('estadias').select(COLUNAS_ESTADIA).eq('patio_id', patioId).gte('valida_ate', corte),
      idsDeCarroDentro.length
        ? db.from('estadias').select(COLUNAS_ESTADIA).eq('patio_id', patioId).in('id', idsDeCarroDentro)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (recentes.error || deCarroDentro.error) {
      return reply.code(502).send({ error: 'consulta indisponível' });
    }
    const estadias = [...(recentes.data ?? []), ...(deCarroDentro.data ?? [])] as Array<{ id: string }>;
    let pagamentos: Array<PagamentoResumo & { estadia_id: string }> = [];
    if (estadias.length) {
      const pg = await db
        .from('estadia_pagamentos')
        .select('id, estadia_id, tipo, diarias, valor, forma_pagamento, pago_em')
        .in('estadia_id', [...new Set(estadias.map((e) => e.id))]);
      if (pg.error) return reply.code(502).send({ error: 'consulta indisponível' });
      pagamentos = (pg.data ?? []) as typeof pagamentos;
    }

    const corpo = JSON.stringify({
      tickets: data ?? [],
      estadias: montarEstadias(estadias, pagamentos),
    });
    const etag = `"${createHash('sha1').update(corpo).digest('base64url')}"`;
    const recebido = (req.headers['if-none-match'] as string | undefined)
      ?.replace(/^W\//, '')
      .trim();

    reply.header('etag', etag).header('cache-control', 'private, no-cache');
    if (recebido === etag) return reply.code(304).send();
    return reply.type('application/json').send(corpo);
  });

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
