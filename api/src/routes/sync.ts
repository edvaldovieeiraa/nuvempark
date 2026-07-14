import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { tenantClient } from '../supabase.js';
import { toIso, num, str, compact } from '../lib/coerce.js';
import { proximoVencimento, hojeYmdUtc } from '../lib/vencimento.js';

/**
 * POST /sync — recebe UM item da outbox do app (não batch).
 * Portado do sync do E-Park, PRESERVANDO as 3 estratégias de idempotência:
 *  - ticket        → read-then-write com fallbacks NOT-NULL no insert
 *  - caixa_sessao  → read-then-write (sem fallbacks extras)
 *  - caixa_movimento → upsert nativo onConflict:id ignoreDuplicates (imutável)
 *
 * Autorização dupla: patio_id ∈ token.patio_ids  E  tenant_id do envelope == token.tenant_id.
 * O tenant_id/patio_id são carimbados em toda linha; RLS é a 2ª camada.
 */

interface SyncEnvelope {
  app_id?: string;
  tenant_id?: string;
  patio_id?: string;
  entidade?: string;
  entidade_id?: string;
  operacao?: string;
  payload?: Record<string, unknown>;
}

export async function syncRoutes(app: FastifyInstance): Promise<void> {
  app.post('/sync', { preHandler: requireAuth }, async (req, reply) => {
    const operador = req.operador!;
    const env = (req.body ?? {}) as SyncEnvelope;

    const patioId = env.patio_id;
    const entidade = env.entidade;
    const entidadeId = env.entidade_id;
    const payload = env.payload;

    if (!patioId || !entidade || !entidadeId || !payload) {
      return reply.code(400).send({ error: 'Envelope incompleto' });
    }

    // Autorização dupla.
    if (env.tenant_id && env.tenant_id !== operador.tenant_id) {
      return reply.code(403).send({ error: 'Tenant divergente' });
    }
    if (!operador.patio_ids.includes(patioId)) {
      return reply.code(403).send({ error: 'Sem acesso a este pátio' });
    }

    const tenantId = operador.tenant_id;
    const db = await tenantClient(tenantId);
    const agora = new Date().toISOString();

    try {
      switch (entidade) {
        // ---------------------------------------------------------- TICKET
        case 'ticket': {
          const row = compact({
            id: entidadeId,
            patio_id: patioId,
            tenant_id: tenantId,
            placa: str(payload.placa),
            tipo_veiculo: str(payload.tipo_veiculo),
            entrada: toIso(payload.entrada),
            saida: toIso(payload.saida),
            valor_calculado: num(payload.valor_calculado),
            valor_cobrado: num(payload.valor_cobrado),
            forma_pagamento: str(payload.forma_pagamento),
            motivo_isencao: str(payload.motivo_isencao),
            status: str(payload.status),
            operador_id: str(payload.operador_id) ?? operador.sub,
            caixa_sessao_id: str(payload.caixa_sessao_id),
            tabela_preco_id: str(payload.tabela_preco_id),
            cliente_id: str(payload.cliente_id),
            plano_id: str(payload.plano_id),
            origem: str(payload.origem),
            foto_entrada_path: str(payload.foto_entrada_path),
            atk: str(payload.atk),
            itk: str(payload.itk),
            authorization_code: str(payload.authorization_code),
            brand: str(payload.brand),
            card_pan: str(payload.pan),
            installments: num(payload.installments),
            payment_processor: str(payload.payment_processor),
            atualizado_em: toIso(payload.atualizado_em) ?? agora,
            sincronizado_em: agora,
          });

          const { data: existente } = await db
            .from('tickets')
            .select('id, status')
            .eq('id', entidadeId)
            .maybeSingle();

          // Camada 1 (defesa no sync): um ticket removido no painel (Limpeza de
          // Pátio) NÃO pode ser ressuscitado por um update tardio do app.
          // Responde sucesso para o app não re-tentar, sinalizando que ignorou.
          if (existente && existente.status === 'removido') {
            return reply.send({
              ok: true,
              ignorado: true,
              motivo: 'removido',
              sincronizado_em: agora,
            });
          }

          const res = existente
            ? await db.from('tickets').update(row).eq('id', entidadeId)
            : await db.from('tickets').insert({
                // fallbacks NOT-NULL: update fora de ordem que chega antes do create
                entrada: agora,
                placa: '—',
                tipo_veiculo: 'carro',
                ...row,
              });
          if (res.error) throw res.error;
          break;
        }

        // ---------------------------------------------------- CAIXA_SESSAO
        case 'caixa_sessao': {
          const row = compact({
            id: entidadeId,
            patio_id: patioId,
            tenant_id: tenantId,
            operador_id: str(payload.operador_id) ?? operador.sub,
            operador_nome: str(payload.operador_nome),
            fundo_caixa: num(payload.fundo_caixa),
            total_fechamento: num(payload.total_fechamento),
            status: str(payload.status),
            abertura: toIso(payload.abertura),
            fechamento: toIso(payload.fechamento),
            observacao_fechamento: str(payload.observacao_fechamento),
            atualizado_em: toIso(payload.atualizado_em) ?? agora,
            sincronizado_em: agora,
          });

          const { data: existente } = await db
            .from('caixa_sessoes')
            .select('id')
            .eq('id', entidadeId)
            .maybeSingle();

          const res = existente
            ? await db.from('caixa_sessoes').update(row).eq('id', entidadeId)
            : await db.from('caixa_sessoes').insert(row);
          if (res.error) throw res.error;
          break;
        }

        // ------------------------------------------------- CAIXA_MOVIMENTO
        case 'caixa_movimento': {
          const row = compact({
            id: entidadeId,
            caixa_sessao_id: str(payload.caixa_sessao_id),
            patio_id: patioId,
            tenant_id: tenantId,
            tipo: str(payload.tipo) ?? 'entrada',
            valor: num(payload.valor) ?? 0,
            descricao: str(payload.descricao),
            ticket_id: str(payload.ticket_id),
            forma_pagamento: str(payload.forma_pagamento),
            criado_em: toIso(payload.criado_em) ?? agora,
            sincronizado_em: agora,
          });

          // Imutável: re-envio é no-op.
          const res = await db
            .from('caixa_movimentos')
            .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
          if (res.error) throw res.error;
          break;
        }

        // -------------------------------------------------------- AVARIA
        case 'avaria': {
          const fotos = Array.isArray(payload.fotos)
            ? (payload.fotos as unknown[]).map(String)
            : [];
          const row = compact({
            id: entidadeId,
            ticket_id: str(payload.ticket_id),
            patio_id: patioId,
            tenant_id: tenantId,
            placa: str(payload.placa),
            descricao: str(payload.descricao),
            fotos,
            operador_id: str(payload.operador_id) ?? operador.sub,
            criado_em: toIso(payload.criado_em) ?? agora,
            sincronizado_em: agora,
          });
          // Imutável (create-only): re-envio é no-op.
          const res = await db
            .from('avarias')
            .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
          if (res.error) throw res.error;
          break;
        }

        // -------------------------------------------- MENSALIDADE_PAGAMENTO
        case 'mensalidade_pagamento': {
          const clienteId = str(payload.cliente_id);
          const row = compact({
            id: entidadeId,
            patio_id: patioId,
            tenant_id: tenantId,
            cliente_id: clienteId,
            plano_id: str(payload.plano_id),
            competencia: str(payload.competencia), // 'YYYY-MM-01'
            valor: num(payload.valor) ?? 0,
            forma_pagamento: str(payload.forma_pagamento),
            pago_em: toIso(payload.pago_em) ?? agora, // epoch-ms → iso
            origem: str(payload.origem) ?? 'app',
            registrado_por: str(payload.registrado_por) ?? operador.sub,
            registrado_por_nome: str(payload.registrado_por_nome),
            caixa_sessao_id: str(payload.caixa_sessao_id),
            caixa_movimento_id: str(payload.caixa_movimento_id),
            observacao: str(payload.observacao),
            sincronizado_em: agora,
          });
          // Imutável (create-only), mesma estratégia do caixa_movimento:
          // re-envio é no-op. .select() → só volta linha quando REALMENTE inseriu.
          const { data: inserido, error: erroPag } = await db
            .from('mensalidade_pagamentos')
            .upsert(row, { onConflict: 'id', ignoreDuplicates: true })
            .select('id');
          if (erroPag) throw erroPag;

          // Avança a vigência do cliente SÓ na 1ª chegada do pagamento (mantém a
          // idempotência: re-envio não avança de novo). Mesma regra do painel.
          if (inserido && inserido.length > 0 && clienteId) {
            const { data: cli } = await db
              .from('clientes')
              .select('vencimento, dia_vencimento')
              .eq('id', clienteId)
              .maybeSingle();
            if (cli) {
              const atual = cli.vencimento
                ? String(cli.vencimento).slice(0, 10)
                : null;
              const novo = proximoVencimento(
                atual,
                (cli.dia_vencimento as number | null) ?? null,
                hojeYmdUtc(),
              );
              await db
                .from('clientes')
                .update({ vencimento: novo })
                .eq('id', clienteId);
            }
          }
          break;
        }

        default:
          return reply.code(400).send({ error: `Entidade desconhecida: ${entidade}` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro no sync';
      return reply.code(500).send({ error: message });
    }

    // `sincronizado_em`: o MESMO carimbo gravado nas linhas acima. O app guarda
    // este valor em vez do relógio dele, para que "última sincronização" no app
    // e no painel sejam o mesmo número — antes o app mostrava a hora do celular
    // e o painel a do servidor, e os dois divergiam.
    // Aditivo: cliente antigo ignora o campo.
    return reply.send({ ok: true, sincronizado_em: agora });
  });
}
