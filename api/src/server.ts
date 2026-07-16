import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { env, corsOrigins } from './env.js';
import { authRoutes } from './auth/routes.js';
import { bootstrapRoutes } from './routes/bootstrap.js';
import { syncRoutes } from './routes/sync.js';
import { dispositivoRoutes } from './routes/dispositivo.js';
import { heartbeatRoutes } from './routes/heartbeat.js';
import { appConfigRoutes } from './routes/app-config.js';
import { fotoRoutes } from './routes/foto.js';
import { webhookAsaasRoutes } from './routes/webhook-asaas.js';
import { publicoRoutes } from './routes/publico.js';
import { pagamentoOnlineRoutes } from './routes/pagamento-online.js';

/**
 * NuvemPark API — servidor Fastify. Consumido pelo app Flutter.
 * Prefixo de todas as rotas: /api/mobile/v1/patio (paridade com o app atual).
 */
const app = Fastify({
  logger: { level: env.NODE_ENV === 'production' ? 'info' : 'debug' },
  bodyLimit: 10 * 1024 * 1024, // 10 MB (fotos)
});

await app.register(cors, { origin: corsOrigins });
await app.register(multipart, { limits: { fileSize: 6 * 1024 * 1024 } });

// Healthcheck
app.get('/health', async () => ({ ok: true, service: 'nuvempark-api' }));

// Rotas do app, sob o prefixo compatível.
const PREFIX = '/api/mobile/v1/patio';
await app.register(
  async (scope) => {
    await authRoutes(scope);
    await bootstrapRoutes(scope);
    await syncRoutes(scope);
    await dispositivoRoutes(scope);
    await heartbeatRoutes(scope);
    await appConfigRoutes(scope);
    await fotoRoutes(scope);
    await pagamentoOnlineRoutes(scope);
  },
  { prefix: PREFIX },
);

// Rotas PÚBLICAS: chamadas por quem não é operador — o PSP (webhook) e o cliente
// que escaneou o QR do cupom. Prefixo separado de propósito: nada aqui passa
// pelo middleware de auth do operador, e é preciso que isso seja óbvio.
const PREFIX_PUBLICO = '/api/public/v1';
await app.register(
  async (scope) => {
    // Rate limit SÓ neste grupo: é o único aberto à internet sem credencial, e
    // o que um scanner de UUID atacaria. As rotas mobile seguem sem limite (o
    // operador em rede ruim faz rajadas legítimas ao drenar a fila).
    //
    // O webhook fica de fora: o Asaas pode mandar rajada legítima de eventos, e
    // limitá-lo significaria devolver 429 — que ele trata como falha e re-tenta,
    // piorando o problema.
    await scope.register(rateLimit, {
      max: 30,
      timeWindow: '1 minute',
      allowList: (req) => req.url.includes('/webhooks/'),
    });
    await publicoRoutes(scope);
    await webhookAsaasRoutes(scope);
  },
  { prefix: PREFIX_PUBLICO },
);

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`NuvemPark API rodando na porta ${env.PORT} (prefixo ${PREFIX})`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
