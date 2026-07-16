import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { tenantClient } from '../supabase.js';

const corpoSchema = z.object({
  patio_id: z.string().uuid().optional(),
});

/**
 * POST /heartbeat — "o app deste pátio está vivo".
 *
 * Existe porque o sync só fala com o servidor quando há dado novo: num pátio
 * parado o painel não conseguia distinguir app ocioso de app fechado. O app
 * bate aqui a cada 60s (mecanismo à parte do sync engine — não o toca).
 *
 * Carimba dispositivos.ultimo_acesso e devolve 204. É chamado por todo tablet
 * a cada minuto, então o caminho feliz é UM único UPDATE.
 *
 * REGISTRO NA PRIMEIRA BATIDA (trust on first use): nada mais no produto insere
 * em `dispositivos` — o painel só ativa/revoga, e a tela de cadastro do E-Park
 * (código curto por aparelho) nunca foi portada. Sem registrar aqui, a tabela
 * ficaria vazia para sempre e o "App conectado" jamais acenderia. Então um
 * aparelho desconhecido, com sessão válida, se cadastra sozinho como 'ativo'.
 *
 * O registro NUNCA ressuscita um revogado: revogar é a única defesa do gestor
 * contra um aparelho perdido, e um upsert ingênuo (que resetasse `status`)
 * desfaria isso a cada 60s — o aparelho roubado voltaria sozinho. Por isso a
 * ordem aqui é UPDATE → checar existência → só então inserir, e a inserção usa
 * ON CONFLICT DO NOTHING (nunca UPDATE).
 */
export async function heartbeatRoutes(app: FastifyInstance): Promise<void> {
  app.post('/heartbeat', { preHandler: requireAuth }, async (req, reply) => {
    const operador = req.operador!;
    const deviceUuid = (req.headers['x-device-id'] as string | undefined)?.trim();
    if (!deviceUuid) {
      return reply.code(400).send({ error: 'Header X-Device-Id obrigatório' });
    }

    const corpo = corpoSchema.safeParse(req.body ?? {});
    if (!corpo.success) {
      return reply.code(400).send({ error: 'Corpo inválido' });
    }
    const patioId = corpo.data.patio_id;

    // Cliente tenant-scoped: a RLS é a 2ª camada — mesmo com um device_uuid de
    // outro tenant, nada aqui acha linha.
    const db = await tenantClient(operador.tenant_id);

    const syntheticUuid = `${deviceUuid.replace(/-/g, '').substring(0, 8).toLowerCase()}-0000-4000-8000-000000000000`;
    const uuids = [deviceUuid, syntheticUuid];

    // 1) Caminho feliz (99,9% das batidas): o aparelho já existe e está ativo.
    // Um único UPDATE cobre os dois formatos de uuid; o select('status') é o
    // RETURNING do próprio update, não uma query extra.
    const { data: atualizados, error: erroUpdate } = await db
      .from('dispositivos')
      .update({ ultimo_acesso: new Date().toISOString() })
      .in('device_uuid', uuids)
      .neq('status', 'revogado')
      .select('status');

    if (erroUpdate) {
      return reply.code(500).send({ error: 'Falha ao registrar heartbeat' });
    }
    if (atualizados && atualizados.length > 0) {
      return reply.code(204).send();
    }

    // 2) Nada atualizado: ou não existe, ou está revogado. Só aqui (raro) vale
    // uma query a mais para separar os dois casos.
    const { data: existente } = await db
      .from('dispositivos')
      .select('status')
      .in('device_uuid', uuids)
      .maybeSingle();

    if (existente) {
      // Existe e não foi atualizado ⇒ está revogado. Não registrar, não carimbar.
      return reply.code(403).send({ error: 'Dispositivo revogado' });
    }

    // 3) Aparelho desconhecido → registrar. Sem pátio não dá: patio_id é NOT
    // NULL e adivinhar (ex.: patio_ids[0]) cadastraria o aparelho no pátio
    // errado para um operador multi-pátio.
    if (!patioId) {
      return reply.code(404).send({ error: 'Dispositivo não registrado' });
    }
    // O pátio tem que ser um a que ESTE operador tem acesso. A RLS garante o
    // tenant, mas não o pátio dentro dele.
    if (!operador.patio_ids.includes(patioId)) {
      return reply.code(403).send({ error: 'Pátio fora do escopo do operador' });
    }

    // ignoreDuplicates ⇒ INSERT ... ON CONFLICT DO NOTHING. Duas batidas
    // simultâneas (device_uuid é UNIQUE) não derrubam uma à outra, e um
    // revogado que escapasse da checagem acima jamais teria o status resetado.
    const { error: erroInsert } = await db.from('dispositivos').upsert(
      {
        tenant_id: operador.tenant_id,
        patio_id: patioId,
        device_uuid: deviceUuid,
        status: 'ativo',
        ultimo_acesso: new Date().toISOString(),
      },
      { onConflict: 'device_uuid', ignoreDuplicates: true },
    );

    if (erroInsert) {
      return reply.code(500).send({ error: 'Falha ao registrar dispositivo' });
    }

    return reply.code(204).send();
  });
}
