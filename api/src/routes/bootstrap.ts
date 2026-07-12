import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { tenantClient } from '../supabase.js';

/**
 * GET /bootstrap?patio_id=... — hidrata a config offline do app.
 * Escopado ao patio_id; autorização = patio_ids do token + tenant_id via RLS.
 * Portado do bootstrap do E-Park (config lazy-provision, tarifas, clientes livre-passagem).
 */
export async function bootstrapRoutes(app: FastifyInstance): Promise<void> {
  app.get('/bootstrap', { preHandler: requireAuth }, async (req, reply) => {
    const operador = req.operador!;
    const patioId = (req.query as Record<string, string | undefined>).patio_id;

    if (!patioId) {
      return reply.code(400).send({ error: 'patio_id obrigatório' });
    }
    // Autorização: o operador só acessa pátios do seu token.
    if (!operador.patio_ids.includes(patioId)) {
      return reply.code(403).send({ error: 'Sem acesso a este pátio' });
    }

    // Cliente tenant-scoped: RLS garante que só o dado do tenant é visível.
    const db = await tenantClient(operador.tenant_id);

    // Pátio
    const { data: patio, error: patioErr } = await db
      .from('patios')
      .select('id, nome, codigo, qtd_vagas, ativo')
      .eq('id', patioId)
      .maybeSingle();
    if (patioErr || !patio) {
      return reply.code(404).send({ error: 'Pátio não encontrado' });
    }
    if (!patio.ativo) {
      return reply.code(403).send({ error: 'Pátio inativo' });
    }

    // Config — lazy-provision (insere default se não existir), igual E-Park.
    let { data: config } = await db
      .from('patio_config')
      .select('tipos_veiculo, formas_pagamento, motivos_isencao, motivos_cancelamento, ticket_cabecalho, ticket_rodape, patio_ativo')
      .eq('patio_id', patioId)
      .maybeSingle();

    if (!config) {
      await db.from('patio_config').insert({ patio_id: patioId, tenant_id: operador.tenant_id });
      const reread = await db
        .from('patio_config')
        .select('tipos_veiculo, formas_pagamento, motivos_isencao, motivos_cancelamento, ticket_cabecalho, ticket_rodape, patio_ativo')
        .eq('patio_id', patioId)
        .maybeSingle();
      config = reread.data;
    }

    // Tarifas ativas, ordenadas.
    const { data: tarifas } = await db
      .from('tarifas')
      .select('*')
      .eq('patio_id', patioId)
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    // Clientes livre-passagem (p/ reconhecimento offline de placa).
    const { data: clientes } = await db
      .from('clientes')
      .select('id, nome, plano_id, vagas, vencimento, bloqueado')
      .eq('patio_id', patioId)
      .eq('ativo', true);

    const clienteIds = (clientes ?? []).map((c) => c.id);
    const [{ data: veiculos }, { data: planos }] = await Promise.all([
      clienteIds.length
        ? db.from('cliente_veiculos').select('cliente_id, placa, descricao, codigo_cartao').in('cliente_id', clienteIds)
        : Promise.resolve({ data: [] as Array<{ cliente_id: string; placa: string; descricao: string | null; codigo_cartao: string | null }> }),
      db.from('planos').select('id, nome, tipo').eq('patio_id', patioId).eq('ativo', true),
    ]);

    const veiculosPorCliente = new Map<string, Array<{ placa: string; descricao: string | null; codigo_cartao: string | null }>>();
    for (const v of veiculos ?? []) {
      const arr = veiculosPorCliente.get(v.cliente_id) ?? [];
      arr.push({ placa: v.placa, descricao: v.descricao, codigo_cartao: v.codigo_cartao });
      veiculosPorCliente.set(v.cliente_id, arr);
    }
    const planosById = new Map((planos ?? []).map((p) => [p.id, p]));

    const clientesOut = (clientes ?? []).map((c) => ({
      id: c.id,
      nome: c.nome,
      vagas: c.vagas,
      vencimento: c.vencimento,
      bloqueado: c.bloqueado,
      plano: c.plano_id ? planosById.get(c.plano_id) ?? null : null,
      veiculos: veiculosPorCliente.get(c.id) ?? [],
    }));

    // Estado da assinatura (gate).
    const { data: assinatura } = await db
      .from('assinaturas')
      .select('estado')
      .eq('tenant_id', operador.tenant_id)
      .maybeSingle();

    // Tickets removidos no painel (Limpeza de Pátio) nos últimos 30 dias — o app
    // converge o estado local por aqui na abertura. Usa o índice parcial
    // idx_tickets_removidos (patio_id, removido_em desc) where status='removido'.
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: removidos } = await db
      .from('tickets')
      .select('id')
      .eq('patio_id', patioId)
      .eq('status', 'removido')
      .gte('removido_em', cutoff)
      .order('removido_em', { ascending: false });

    return reply.send({
      patio: { id: patio.id, nome: patio.nome, codigo: patio.codigo, qtd_vagas: patio.qtd_vagas },
      config: {
        tipos_veiculo: config?.tipos_veiculo ?? ['carro', 'moto'],
        formas_pagamento: config?.formas_pagamento ?? ['dinheiro', 'pix'],
        motivos_isencao: config?.motivos_isencao ?? [],
        motivos_cancelamento: config?.motivos_cancelamento ?? [],
        ticket_cabecalho: config?.ticket_cabecalho ?? [],
        ticket_rodape: config?.ticket_rodape ?? [],
        patio_ativo: config?.patio_ativo ?? false,
      },
      tarifas: tarifas ?? [],
      clientes: clientesOut,
      assinatura_estado: assinatura?.estado ?? 'ativa',
      tickets_removidos: (removidos ?? []).map((r) => r.id),
    });
  });
}
