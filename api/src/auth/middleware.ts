import type { FastifyReply, FastifyRequest } from 'fastify';
import { extractBearer, verifyAccessToken, type OperadorTokenPayload } from './jwt.js';

/**
 * Porta o withPatioAuth do E-Park: valida o Bearer token e injeta o operador (payload do JWT)
 * no request. Como no E-Park, NÃO re-checa o banco — o access token é confiado pela sua vida
 * (8h). Checagens de operador-ativo/device só ocorrem em login/refresh.
 */

declare module 'fastify' {
  interface FastifyRequest {
    operador?: OperadorTokenPayload;
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
  }
}
