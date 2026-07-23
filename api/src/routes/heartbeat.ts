import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { tenantClient } from '../supabase.js';
import { avaliarDispositivo } from '../lib/dispositivos.js';

/**
 * POST /heartbeat — "o app deste pátio está vivo".
 *
 * Existe porque o sync só fala com o servidor quando há dado novo: num pátio
 * parado o painel não conseguia distinguir app ocioso de app fechado. O app
 * bate aqui a cada 60s (mecanismo à parte do sync engine — não o toca).
 *
 * NÃO cria mais nada em `dispositivos` (o antigo trust-on-first-use saiu): o
 * ÚNICO ponto que registra dispositivo agora é o /auth/login. O heartbeat só:
 *  1) localiza o dispositivo pelo device_uuid (RLS garante o tenant),
 *  2) reavalia via fn_dispositivo_pode_logar (gate em tempo real),
 *  3) carimba ultimo_acesso.
 *
 * ⚠️ NÃO grava evento em dispositivo_acessos: são ~1.440 batidas/dia por
 * aparelho — inundaria a tabela. Só ultimo_acesso.
 *
 * pode=false → 403 com o mesmo contrato do login (com codigo_pareamento), para
 * o app cair na tela de bloqueio em ~60s, sem esperar o token de 8h expirar.
 */
export async function heartbeatRoutes(app: FastifyInstance): Promise<void> {
  app.post('/heartbeat', { preHandler: requireAuth }, async (req, reply) => {
    const operador = req.operador!;
    const deviceUuid = (req.headers['x-device-id'] as string | undefined)?.trim();
    if (!deviceUuid) {
      return reply.code(400).send({ error: 'Header X-Device-Id obrigatório' });
    }

    // Cliente tenant-scoped: a RLS é a 2ª camada — um device_uuid de outro
    // tenant não acha linha aqui.
    const db = await tenantClient(operador.tenant_id);

    const { data: disp } = await db
      .from('dispositivos')
      .select('id, patio_id, status, codigo_pareamento')
      .eq('device_uuid', deviceUuid)
      .order('ultimo_acesso', { ascending: false, nullsFirst: false })
      .limit(1);
    const dispositivo = (disp ?? [])[0] as
      | { id: string; patio_id: string; status: string; codigo_pareamento: string | null }
      | undefined;

    // Desconhecido: o login é quem registra. Não cadastramos aqui.
    if (!dispositivo) {
      return reply.code(404).send({ error: 'Dispositivo não registrado' });
    }

    // Gate em tempo real (regra de ouro no banco).
    let avaliacao;
    try {
      avaliacao = await avaliarDispositivo(db, dispositivo.patio_id, deviceUuid);
    } catch {
      // Fail-open: erro transitório na RPC não deve trancar um app válido.
      avaliacao = { pode: true, motivo: 'ok', acao: 'permitir' as const };
    }
    if (!avaliacao.pode) {
      return reply.code(403).send({
        erro: 'dispositivo_nao_autorizado',
        motivo: avaliacao.motivo,
        codigo_pareamento: dispositivo.codigo_pareamento ?? null,
        mensagem: 'Este dispositivo não está autorizado neste pátio.',
      });
    }

    // Carimbo do SERVIDOR: volta pro app e alimenta a "última sincronização".
    // App e painel exibem ESTE instante (relógio do servidor), nunca divergem.
    const agora = new Date().toISOString();
    const { error: erroUpdate } = await db
      .from('dispositivos')
      .update({ ultimo_acesso: agora })
      .eq('id', dispositivo.id);

    if (erroUpdate) {
      return reply.code(500).send({ error: 'Falha ao registrar heartbeat' });
    }

    return reply.code(200).send({ sincronizado_em: agora });
  });
}
