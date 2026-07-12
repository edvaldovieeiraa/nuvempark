import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { env, corsOrigins } from './env.js';
import { authRoutes } from './auth/routes.js';
import { bootstrapRoutes } from './routes/bootstrap.js';
import { syncRoutes } from './routes/sync.js';
import { dispositivoRoutes } from './routes/dispositivo.js';
import { appConfigRoutes } from './routes/app-config.js';
import { fotoRoutes } from './routes/foto.js';

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
    await appConfigRoutes(scope);
    await fotoRoutes(scope);
  },
  { prefix: PREFIX },
);

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`NuvemPark API rodando na porta ${env.PORT} (prefixo ${PREFIX})`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
