import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { tenantClient } from '../supabase.js';

/**
 * GET /dispositivo — device binding. Portado do E-Park.
 * Header X-Device-Id → match exato, senão synthetic-uuid (short code registrado no admin).
 * status='revogado' → 403; qualquer outro passa. Fire-and-forget em ultimo_acesso.
 */
export async function dispositivoRoutes(app: FastifyInstance): Promise<void> {
  app.get('/dispositivo', { preHandler: requireAuth }, async (req, reply) => {
    const operador = req.operador!;
    const deviceUuid = (req.headers['x-device-id'] as string | undefined)?.trim();
    if (!deviceUuid) {
      return reply.code(400).send({ error: 'Header X-Device-Id obrigatório' });
    }

    const db = await tenantClient(operador.tenant_id);

    const syntheticUuid = `${deviceUuid.replace(/-/g, '').substring(0, 8).toLowerCase()}-0000-4000-8000-000000000000`;

    let { data: dispositivo } = await db
      .from('dispositivos')
      .select('id, device_uuid, patio_id, status')
      .eq('device_uuid', deviceUuid)
      .maybeSingle();

    if (!dispositivo) {
      const retry = await db
        .from('dispositivos')
        .select('id, device_uuid, patio_id, status')
        .eq('device_uuid', syntheticUuid)
        .maybeSingle();
      dispositivo = retry.data;
      // Upgrade fire-and-forget: grava o uuid real p/ acelerar buscas futuras.
      if (dispositivo && dispositivo.device_uuid !== deviceUuid) {
        void db.from('dispositivos').update({ device_uuid: deviceUuid }).eq('id', dispositivo.id);
      }
    }

    if (!dispositivo) {
      return reply.code(404).send({ error: 'Dispositivo não registrado' });
    }
    if (dispositivo.status === 'revogado') {
      return reply.code(403).send({ error: 'Dispositivo revogado' });
    }

    // Fire-and-forget: carimba último acesso.
    void db.from('dispositivos').update({ ultimo_acesso: new Date().toISOString() }).eq('id', dispositivo.id);

    // Nome do pátio vinculado.
    const { data: patio } = await db
      .from('patios')
      .select('id, nome, codigo')
      .eq('id', dispositivo.patio_id)
      .maybeSingle();

    return reply.send({
      patio_id: dispositivo.patio_id,
      nome_patio: patio?.nome ?? null,
      codigo_patio: patio?.codigo ?? null,
    });
  });
}
