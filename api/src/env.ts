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

  // ── Pagamento online (Pix via QR do cupom) ────────────────────────────────
  // TODAS opcionais DE PROPÓSITO. Este schema faz `process.exit(1)` quando algo
  // falta: marcar as novas como obrigatórias derrubaria a API em produção no
  // primeiro deploy, antes de o .env da VPS ser atualizado. Quem precisa delas
  // (crypto, webhook) valida na hora do uso e falha ali — o resto da API segue
  // de pé.
  //
  // Cifra as chaves de PSP guardadas em tenant_gateways. 32 bytes em base64:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  NUVEMPARK_CRYPTO_KEY: z.string().default(''),

  ASAAS_BASE_URL: z.string().url().default('https://api-sandbox.asaas.com/v3'),
  /** Wallet da PLATAFORMA — recebe o split. Vazio = sem split (tudo do tenant). */
  ASAAS_WALLET_PLATAFORMA: z.string().default(''),
  /** Token que o Asaas envia no header `asaas-access-token` do webhook. */
  ASAAS_WEBHOOK_TOKEN: z.string().default(''),
  /**
   * CPF/CNPJ do cliente genérico das cobranças avulsas. O Asaas exige um
   * `customer` na cobrança e o pagador do ticket é anônimo — ver asaas.ts.
   */
  ASAAS_CPFCNPJ_CLIENTE_PADRAO: z.string().default('00000000000'),
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
