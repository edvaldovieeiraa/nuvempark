import 'dotenv/config';
import { z } from 'zod';

/**
 * Env vars validadas na inicialização. Falha rápido se algo faltar.
 */
const schema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // JWT Secret do projeto Supabase — assina os JWTs tenant-scoped que a RLS aceita.
  SUPABASE_JWT_SECRET: z.string().min(16, 'SUPABASE_JWT_SECRET muito curto'),

  NUVEMPARK_JWT_SECRET: z.string().min(16, 'NUVEMPARK_JWT_SECRET muito curto (mín 16 chars)'),

  CORS_ORIGINS: z.string().default('*'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Configuração de ambiente inválida:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins =
  env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(',').map((o) => o.trim());
