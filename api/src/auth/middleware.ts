import type { FastifyReply, FastifyRequest } from 'fastify';
import { extractBearer, verifyAccessToken, type OperadorTokenPayload } from './jwt.js';
import { resolveAssinaturaStatus, type AssinaturaStatus } from '../lib/assinatura.js';

/**
 * Porta o withPatioAuth do E-Park: valida o Bearer token e injeta o operador (payload do JWT)
 * no request. Como no E-Park, NÃO re-checa o banco — o access token é confiado pela sua vida
 * (8h). Checagens de operador-ativo/device só ocorrem em login/refresh.
 *
 * Além disso, PUBLICA o estado da assinatura (gate em tempo real): resolve o
 * status tenant-scoped (com cache 30s) e o entrega em `request.assinatura` +
 * headers `X-Assinatura-*`. É o que faz o bloqueio comercial chegar ao app
 * durante o sync/heartbeat, sem precisar deslogar. Fail-open: erro ao resolver
 * NÃO derruba a autenticação nem manda header algum (o app mantém o último
 * estado conhecido).
 */

declare module 'fastify' {
  interface FastifyRequest {
    operador?: OperadorTokenPayload;
    assinatura?: AssinaturaStatus;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = extractBearer(req.headers.authorization);
  if (!token) {
    await reply.code(401).send({ error: 'Token não fornecido' });
    return;
  }
  try {
    req.operador = await verifyAccessToken(token);
  } catch {
    await reply.code(401).send({ error: 'Token inválido ou expirado' });
    return;
  }

  // Publica o estado da assinatura. Best-effort: nunca bloqueia a rota (a rota
  // de sync tem que drenar mesmo com tenant suspenso — o bloqueio é do APP).
  try {
    const status = await resolveAssinaturaStatus(req.operador.tenant_id);
    req.assinatura = status;
    reply.header('X-Assinatura-Estado', status.estado);
    reply.header('X-Assinatura-Bloqueia', status.bloqueia ? 'true' : 'false');
  } catch {
    // Silencioso: sem header, o app fica no último estado conhecido (fail-open).
  }
}
