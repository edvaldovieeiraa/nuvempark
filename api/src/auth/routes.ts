import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { admin } from '../supabase.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  type OperadorTokenPayload,
} from './jwt.js';
import { resolveAssinaturaStatus } from '../lib/assinatura.js';

/**
 * Auth do operador — portado do E-Park com camada de tenant (decisões #8 e #17).
 * Login = codigo_tenant (4 díg) + usuario + senha + device_uuid.
 * Usa o cliente ADMIN porque o tenant ainda não está resolvido (é o que estamos resolvendo).
 */

const REFRESH_TTL_DAYS = 30;

const loginSchema = z.object({
  codigo_tenant: z.string().trim().min(1),
  usuario: z.string().trim().min(1),
  senha: z.string().min(1),
  device_uuid: z.string().trim().min(1),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
  device_uuid: z.string().trim().min(1),
});

const logoutSchema = z.object({
  refresh_token: z.string().min(1),
  device_uuid: z.string().trim().min(1),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------------ LOGIN
  app.post('/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Dados de login inválidos' });
    }
    const { codigo_tenant, usuario, senha, device_uuid } = parsed.data;

    // 1) Resolve o código (4 díg). Decisão 2026-07-10: o código é do PÁTIO —
    //    o operador entra direto na unidade onde trabalha. Fallback: código
    //    do tenant (transição; códigos são únicos entre as duas tabelas).
    let patioFixoId: string | null = null;
    let tenant: { id: string; nome: string; ativo: boolean } | null = null;

    const { data: patioLogin } = await admin
      .from('patios')
      .select('id, nome, ativo, tenant_id, tenants!inner(id, nome, ativo)')
      .eq('codigo_acesso', codigo_tenant)
      .maybeSingle();

    if (patioLogin) {
      const t = patioLogin.tenants as unknown as { id: string; nome: string; ativo: boolean };
      if (!patioLogin.ativo || !t.ativo) {
        return reply.code(401).send({ error: 'Código do pátio ou credenciais inválidos' });
      }
      patioFixoId = patioLogin.id;
      tenant = t;
    } else {
      const { data: t } = await admin
        .from('tenants')
        .select('id, nome, ativo')
        .eq('codigo', codigo_tenant)
        .maybeSingle();
      tenant = t;
    }

    if (!tenant || !tenant.ativo) {
      return reply.code(401).send({ error: 'Código do pátio ou credenciais inválidos' });
    }

    // 2) Busca operador por (tenant_id, usuario) — usuário único DENTRO do tenant.
    const { data: operador } = await admin
      .from('operadores')
      .select('id, nome, usuario, senha_hash, ativo')
      .eq('tenant_id', tenant.id)
      .eq('usuario', usuario.toUpperCase())
      .maybeSingle();

    if (!operador) {
      return reply.code(401).send({ error: 'Código do pátio ou credenciais inválidos' });
    }
    if (!operador.ativo) {
      return reply.code(403).send({ error: 'Operador inativo. Contate o supervisor.' });
    }

    // 3) Confere a senha.
    const ok = await bcrypt.compare(senha, operador.senha_hash);
    if (!ok) {
      return reply.code(401).send({ error: 'Código do pátio ou credenciais inválidos' });
    }

    // 4) Carrega os pátios do operador (só ativos do tenant), via junção.
    const { data: vinculos } = await admin
      .from('operador_patios')
      .select('patio_id, patios!inner(id, nome, codigo, qtd_vagas, ativo, tenant_id)')
      .eq('operador_id', operador.id)
      .eq('tenant_id', tenant.id);

    let patios = (vinculos ?? [])
      .map((v) => v.patios as unknown as {
        id: string;
        nome: string;
        codigo: string | null;
        qtd_vagas: number;
        ativo: boolean;
      })
      .filter((p) => p && p.ativo)
      .map((p) => ({ id: p.id, nome: p.nome, codigo: p.codigo, qtd_vagas: p.qtd_vagas }));

    // Login por código de PÁTIO: o operador precisa estar vinculado a ELE,
    // e a sessão nasce fixada nesse pátio (o app entra direto, sem seleção).
    if (patioFixoId) {
      patios = patios.filter((p) => p.id === patioFixoId);
      if (patios.length === 0) {
        return reply.code(403).send({ error: 'Você não tem acesso a este pátio. Contate o supervisor.' });
      }
    }

    const patioIds = patios.map((p) => p.id);

    // 5) Estado da assinatura. Decisão #11 REVISTA (2026-07-23): o login NÃO
    //    recusa mais tenant suspenso/cancelado/atrasado — o app ENTRA e aplica
    //    o bloqueio (tela dedicada) ou o banner (atrasada). Único corte no login:
    //    o TRIAL EXPIRADO (comportamento do trial preservado). Sem isto o app
    //    não conseguiria mostrar a tela de bloqueio com mensagem clara.
    const { data: assinatura } = await admin
      .from('assinaturas')
      .select('estado, trial_expira_em')
      .eq('tenant_id', tenant.id)
      .maybeSingle();
    const assinaturaEstado = assinatura?.estado ?? 'ativa';

    const trialVigente =
      assinaturaEstado === 'trial' &&
      !!assinatura?.trial_expira_em &&
      new Date(assinatura.trial_expira_em).getTime() > Date.now();

    if (assinaturaEstado === 'trial' && !trialVigente) {
      return reply.code(403).send({
        error: 'Seu teste grátis expirou. Ative a assinatura no painel para continuar.',
        assinatura_estado: assinaturaEstado,
      });
    }

    // 6) Tokens. Access carrega tenant_id (o RLS lê isso).
    const payload: OperadorTokenPayload = {
      sub: operador.id,
      usuario: operador.usuario,
      nome: operador.nome,
      tenant_id: tenant.id,
      patio_ids: patioIds,
    };
    const accessToken = await signAccessToken(payload);
    const refreshToken = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    // Uma sessão ativa por device: delete-then-insert.
    await admin
      .from('operador_sessoes')
      .delete()
      .eq('operador_id', operador.id)
      .eq('device_uuid', device_uuid);

    await admin.from('operador_sessoes').insert({
      operador_id: operador.id,
      tenant_id: tenant.id,
      refresh_token_hash: refreshHash,
      device_uuid,
      expires_at: expiresAt.toISOString(),
    });

    // Status completo (tenant-scoped, semeia o cache). O app usa `assinatura`
    // para decidir bloqueio/banner já na entrada; `assinatura_estado` fica por
    // compat com o cliente antigo.
    const assinaturaStatus = await resolveAssinaturaStatus(tenant.id);

    return reply.send({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: operador.id, nome: operador.nome, usuario: operador.usuario, tenant_id: tenant.id },
      tenant: { id: tenant.id, nome: tenant.nome, codigo: codigo_tenant },
      patios,
      assinatura_estado: assinaturaEstado,
      assinatura: assinaturaStatus,
    });
  });

  // ---------------------------------------------------------------- REFRESH
  app.post('/auth/refresh', async (req, reply) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Dados de refresh inválidos' });
    }
    const { refresh_token, device_uuid } = parsed.data;

    const tokenHash = hashRefreshToken(refresh_token);
    const { data: sessao } = await admin
      .from('operador_sessoes')
      .select('id, operador_id, tenant_id, expires_at, device_uuid')
      .eq('refresh_token_hash', tokenHash)
      .maybeSingle();

    if (!sessao) {
      return reply.code(401).send({ error: 'Sessão inválida' });
    }
    if (sessao.device_uuid !== device_uuid) {
      return reply.code(401).send({ error: 'Dispositivo não reconhecido' });
    }
    if (new Date(sessao.expires_at) < new Date()) {
      await admin.from('operador_sessoes').delete().eq('id', sessao.id);
      return reply.code(401).send({ error: 'Sessão expirada' });
    }

    // Recarrega operador (pode ter sido inativado).
    const { data: operador } = await admin
      .from('operadores')
      .select('id, nome, usuario, ativo')
      .eq('id', sessao.operador_id)
      .maybeSingle();

    if (!operador || !operador.ativo) {
      return reply.code(403).send({ error: 'Operador inativo' });
    }

    // Recarrega patios (podem ter mudado).
    const { data: vinculos } = await admin
      .from('operador_patios')
      .select('patio_id')
      .eq('operador_id', operador.id)
      .eq('tenant_id', sessao.tenant_id);
    const patioIds = (vinculos ?? []).map((v) => v.patio_id);

    // Rotação in-place (one-time-use): substitui hash + expiry na MESMA linha.
    const newRefresh = generateRefreshToken();
    const newHash = hashRefreshToken(newRefresh);
    const newExpiry = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    await admin
      .from('operador_sessoes')
      .update({ refresh_token_hash: newHash, expires_at: newExpiry.toISOString() })
      .eq('id', sessao.id);

    const accessToken = await signAccessToken({
      sub: operador.id,
      usuario: operador.usuario,
      nome: operador.nome,
      tenant_id: sessao.tenant_id,
      patio_ids: patioIds,
    });

    // Publica o estado atual da assinatura no refresh (o app renova de tempos
    // em tempos, então isto também é um canal de atualização do gate).
    const assinaturaStatus = await resolveAssinaturaStatus(sessao.tenant_id);

    return reply.send({
      access_token: accessToken,
      refresh_token: newRefresh,
      assinatura: assinaturaStatus,
    });
  });

  // ----------------------------------------------------------------- LOGOUT
  app.post('/auth/logout', async (req, reply) => {
    const parsed = logoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Dados inválidos' });
    }
    const { refresh_token, device_uuid } = parsed.data;
    await admin
      .from('operador_sessoes')
      .delete()
      .eq('refresh_token_hash', hashRefreshToken(refresh_token))
      .eq('device_uuid', device_uuid);
    return reply.send({ ok: true });
  });
}
