import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { tenantClient } from '../supabase.js';

/**
 * POST /heartbeat — "o app deste pátio está vivo".
 *
 * Existe porque o sync só fala com o servidor quando há dado novo: num pátio
 * parado o painel não conseguia distinguir app ocioso de app fechado. O app
 * bate aqui a cada 60s (mecanismo à parte do sync engine — não o toca).
 *
 * Carimba dispositivos.ultimo_acesso e devolve 204. É chamado por todo tablet
 * a cada minuto, então precisa ser barato: UM update, sem select antes.
 * Header X-Device-Id → match exato, senão synthetic-uuid (mesma regra de
 * /dispositivo, onde o short code registrado no admin vira uuid sintético).
 */
export async function heartbeatRoutes(app: FastifyInstance): Promise<void> {
  app.post('/heartbeat', { preHandler: requireAuth }, async (req, reply) => {
    const operador = req.operador!;
    const deviceUuid = (req.headers['x-device-id'] as string | undefined)?.trim();
    if (!deviceUuid) {
      return reply.code(400).send({ error: 'Header X-Device-Id obrigatório' });
    }

    // Cliente tenant-scoped: a RLS é a 2ª camada — mesmo com um device_uuid de
    // outro tenant, o update não acha linha.
    const db = await tenantClient(operador.tenant_id);

    const syntheticUuid = `${deviceUuid.replace(/-/g, '').substring(0, 8).toLowerCase()}-0000-4000-8000-000000000000`;

    // Um único UPDATE cobre os dois formatos de uuid. `select('status')` não
    // custa query extra (é o RETURNING do próprio update) e é o que diferencia
    // "não existe" (404) de "revogado" (403).
    const { data, error } = await db
      .from('dispositivos')
      .update({ ultimo_acesso: new Date().toISOString() })
      .in('device_uuid', [deviceUuid, syntheticUuid])
      .neq('status', 'revogado')
      .select('status');

    if (error) {
      return reply.code(500).send({ error: 'Falha ao registrar heartbeat' });
    }

    // Nada atualizado: ou o device não existe, ou está revogado. Um select
    // barato só neste caminho (raro) separa os dois — o caminho feliz segue
    // com uma query só.
    if (!data || data.length === 0) {
      const { data: existente } = await db
        .from('dispositivos')
        .select('status')
        .in('device_uuid', [deviceUuid, syntheticUuid])
        .maybeSingle();

      if (!existente) {
        return reply.code(404).send({ error: 'Dispositivo não registrado' });
      }
      return reply.code(403).send({ error: 'Dispositivo revogado' });
    }

    return reply.code(204).send();
  });
}
