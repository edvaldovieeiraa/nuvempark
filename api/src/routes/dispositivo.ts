import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { tenantClient } from '../supabase.js';

/**
 * GET /dispositivo — device binding.
 * Busca por (patio_id, device_uuid) EXATO. O fallback synthetic-uuid do E-Park
 * saiu: virava 2ª fonte de verdade e permitia casar aparelhos distintos pelo
 * prefixo de 8 hex do uuid. Agora só o match exato conta.
 * Não encontrado → 404. Revogado → 403.
 */
export async function dispositivoRoutes(app: FastifyInstance): Promise<void> {
  app.get('/dispositivo', { preHandler: requireAuth }, async (req, reply) => {
    const operador = req.operador!;
    const deviceUuid = (req.headers['x-device-id'] as string | undefined)?.trim();
    if (!deviceUuid) {
      return reply.code(400).send({ error: 'Header X-Device-Id obrigatório' });
    }
    const patioIdQuery = (req.query as Record<string, string | undefined>).patio_id;

    const db = await tenantClient(operador.tenant_id);

    let query = db
      .from('dispositivos')
      .select('id, device_uuid, patio_id, status, licenca, apelido, codigo_pareamento')
      .eq('device_uuid', deviceUuid);
    if (patioIdQuery) query = query.eq('patio_id', patioIdQuery);

    const { data: rows } = await query
      .order('ultimo_acesso', { ascending: false, nullsFirst: false })
      .limit(1);
    const dispositivo = (rows ?? [])[0] as
      | {
          id: string;
          device_uuid: string;
          patio_id: string;
          status: string;
          licenca: string;
          apelido: string | null;
          codigo_pareamento: string | null;
        }
      | undefined;

    if (!dispositivo) {
      return reply.code(404).send({ error: 'Dispositivo não registrado' });
    }
    if (dispositivo.status === 'revogado') {
      return reply.code(403).send({ error: 'Dispositivo revogado' });
    }

    // Nome do pátio vinculado (compat com o app publicado).
    const { data: patio } = await db
      .from('patios')
      .select('id, nome, codigo')
      .eq('id', dispositivo.patio_id)
      .maybeSingle();

    return reply.send({
      patio_id: dispositivo.patio_id,
      nome_patio: patio?.nome ?? null,
      codigo_patio: patio?.codigo ?? null,
      status: dispositivo.status,
      licenca: dispositivo.licenca,
      apelido: dispositivo.apelido,
      codigo_pareamento: dispositivo.codigo_pareamento,
    });
  });
}
