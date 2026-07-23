import { SignJWT, jwtVerify } from 'jose';
import { randomUUID, createHash } from 'node:crypto';
import { env } from '../env.js';

/**
 * JWT do operador — portado de patio-jwt.ts do E-Park, com `tenant_id` adicionado ao claim.
 * Access token: HS256, 8h. Refresh token: UUID opaco, guardado SHA-256-hasheado no banco.
 */

export interface OperadorTokenPayload {
  sub: string; // operador UUID
  usuario: string;
  nome: string;
  tenant_id: string; // ⚠️ novo no NuvemPark — o que o RLS lê
  patio_ids: string[];
  /**
   * Token restrito de DRENAGEM: emitido no /refresh quando o dispositivo está
   * bloqueado mas dentro da janela de 7 dias. O middleware só deixa este token
   * chamar POST /sync (para o outbox terminar de drenar). Ausente = token pleno.
   */
  modo?: 'drenagem';
}

const secret = new TextEncoder().encode(env.NUVEMPARK_JWT_SECRET);

export async function signAccessToken(payload: OperadorTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<OperadorTokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as OperadorTokenPayload;
}

/** Refresh token opaco (UUID). O servidor guarda só o hash. */
export function generateRefreshToken(): string {
  return randomUUID();
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function extractBearer(authHeader: string | undefined): string | null {
  const auth = authHeader ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}
