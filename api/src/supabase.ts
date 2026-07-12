import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';
import { env } from './env.js';

/**
 * REGRA DE OURO (não repetir o erro do E-Park):
 * O E-Park roda 100% no service_role (fura RLS) e a única autorização é um check em código.
 * No NuvemPark, o caminho normal usa um cliente TENANT-SCOPED: um JWT assinado com o
 * JWT Secret do projeto Supabase carregando `tenant_id` no claim, de forma que a RLS
 * (public.current_tenant_id()) isole as linhas no próprio banco — 2ª camada de defesa.
 *
 * O cliente ADMIN (service_role) fura RLS e só deve ser usado onde o tenant ainda NÃO
 * foi resolvido (ex: resolver código do tenant no login) ou em operações administrativas
 * explícitas. Nunca no caminho de dados de um operador já autenticado.
 */

// Segredo que o Supabase usa para validar JWTs (Settings → API → JWT Secret).
const supabaseJwtSecret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);

/**
 * Cliente admin: service_role, ignora RLS. Uso restrito (login, super-admin).
 */
export const admin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/**
 * Cria um cliente tenant-scoped. Assina um JWT Supabase (role 'authenticated' +
 * claim tenant_id) e o injeta no Authorization — então a RLS enxerga
 * current_tenant_id() = tenantId e isola tudo automaticamente.
 *
 * Vida curta (1h): criado por request, descartado depois.
 */
export async function tenantClient(tenantId: string): Promise<SupabaseClient> {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    role: 'authenticated',
    aud: 'authenticated',
    tenant_id: tenantId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60)
    .sign(supabaseJwtSecret);

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
