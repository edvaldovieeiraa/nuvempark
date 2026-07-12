import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { tenantClient } from '../supabase.js';

/**
 * POST /foto — upload best-effort da foto de entrada.
 * Multipart: campos ticket_id + patio_id + file. Salva no bucket privado 'nuvempark-entradas'
 * no caminho <patio_id>/<ticket_id>.jpg e grava foto_entrada_path no ticket.
 */
export async function fotoRoutes(app: FastifyInstance): Promise<void> {
  app.post('/foto', { preHandler: requireAuth }, async (req, reply) => {
    const operador = req.operador!;

    const parts = req.parts();
    let ticketId: string | undefined;
    let patioId: string | undefined;
    let fileBuffer: Buffer | undefined;
    let mime = 'image/jpeg';

    for await (const part of parts) {
      if (part.type === 'file') {
        fileBuffer = await part.toBuffer();
        mime = part.mimetype || mime;
      } else if (part.type === 'field') {
        if (part.fieldname === 'ticket_id') ticketId = String(part.value);
        if (part.fieldname === 'patio_id') patioId = String(part.value);
      }
    }

    if (!ticketId || !patioId || !fileBuffer) {
      return reply.code(400).send({ error: 'ticket_id, patio_id e arquivo obrigatórios' });
    }
    if (!operador.patio_ids.includes(patioId)) {
      return reply.code(403).send({ error: 'Sem acesso a este pátio' });
    }

    const db = await tenantClient(operador.tenant_id);
    const path = `${patioId}/${ticketId}.jpg`;

    const up = await db.storage
      .from('nuvempark-entradas')
      .upload(path, fileBuffer, { contentType: mime, upsert: true });
    if (up.error) {
      return reply.code(500).send({ error: up.error.message });
    }

    await db.from('tickets').update({ foto_entrada_path: path }).eq('id', ticketId);

    return reply.send({ ok: true, path });
  });

  // POST /foto-avaria — upload de UMA foto de avaria.
  // Multipart: avaria_id + patio_id + indice + file → avarias/<avaria_id>/<indice>.jpg
  app.post('/foto-avaria', { preHandler: requireAuth }, async (req, reply) => {
    const operador = req.operador!;

    const parts = req.parts();
    let avariaId: string | undefined;
    let patioId: string | undefined;
    let indice = '0';
    let fileBuffer: Buffer | undefined;
    let mime = 'image/jpeg';

    for await (const part of parts) {
      if (part.type === 'file') {
        fileBuffer = await part.toBuffer();
        mime = part.mimetype || mime;
      } else if (part.type === 'field') {
        if (part.fieldname === 'avaria_id') avariaId = String(part.value);
        if (part.fieldname === 'patio_id') patioId = String(part.value);
        if (part.fieldname === 'indice') indice = String(part.value);
      }
    }

    if (!avariaId || !patioId || !fileBuffer) {
      return reply.code(400).send({ error: 'avaria_id, patio_id e arquivo obrigatórios' });
    }
    if (!operador.patio_ids.includes(patioId)) {
      return reply.code(403).send({ error: 'Sem acesso a este pátio' });
    }

    const db = await tenantClient(operador.tenant_id);
    const path = `avarias/${avariaId}/${indice}.jpg`;

    const up = await db.storage
      .from('nuvempark-entradas')
      .upload(path, fileBuffer, { contentType: mime, upsert: true });
    if (up.error) {
      return reply.code(500).send({ error: up.error.message });
    }

    return reply.send({ ok: true, path });
  });
}
