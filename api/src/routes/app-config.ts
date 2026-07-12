import type { FastifyInstance } from 'fastify';

/**
 * GET /app-config — versão mínima suportada + flags. Público (checado antes/depois do login).
 * Valores hardcoded por enquanto; podem virar tabela por tenant no futuro.
 */
export async function appConfigRoutes(app: FastifyInstance): Promise<void> {
  app.get('/app-config', async (_req, reply) => {
    return reply.send({
      versao_minima: '1.0.0',
      forcar_atualizacao: false,
      // flags de feature globais (ex: pix habilitado). Por tenant vem depois.
      flags: {
        pix: true,
        stone: false,
      },
    });
  });
}
