import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { admin, tenantClient } from '../supabase.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  type OperadorTokenPayload,
} from './jwt.js';
import { resolveAssinaturaStatus } from '../lib/assinatura.js';
import {
  avaliarDispositivo,
  hashAndroidId,
  mergePorAndroidId,
  registrarEvento,
  UNIQUE_VIOLATION,
} from '../lib/dispositivos.js';
import { compact } from '../lib/coerce.js';

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
  // Novos campos — TODOS opcionais (o app publicado continua funcionando; sem
  // android_id o merge por reinstalação simplesmente não acontece).
  android_id: z.string().trim().min(1).optional(),
  fabricante: z.string().trim().optional(),
  modelo: z.string().trim().optional(),
  so_versao: z.string().trim().optional(),
  app_versao: z.string().trim().optional(),
});

const JANELA_DRENAGEM_MS = 7 * 24 * 60 * 60 * 1000;
const MSG_DISPOSITIVO_NEGADO = 'Este dispositivo não está autorizado neste pátio.';

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
    const {
      codigo_tenant,
      usuario,
      senha,
      device_uuid,
      android_id,
      fabricante,
      modelo,
      so_versao,
      app_versao,
    } = parsed.data;
    const ip = req.ip;

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

    // 5.5) BINDING DE DISPOSITIVO (gate de licença por pátio).
    //  O login é o ÚNICO ponto que cria linha em public.dispositivos.
    //  Só acontece quando há UM pátio resolvido (login por código de pátio, ou
    //  fallback de tenant que resultou em 1 pátio). No fluxo legado multi-pátio
    //  (operador escolhe o pátio depois) não há como fixar o par (pátio,device),
    //  então o binding é pulado — preserva o app publicado. A REGRA DE OURO mora
    //  em fn_dispositivo_pode_logar; aqui só obedecemos a `acao`.
    const bindPatioId = patioFixoId ?? (patios.length === 1 ? patios[0]?.id ?? null : null);
    if (bindPatioId) {
      const agora = new Date().toISOString();
      // Cliente TENANT-SCOPED (regra de ouro): o tenant já está resolvido.
      const db = await tenantClient(tenant.id);
      const hash = android_id ? hashAndroidId(android_id) : undefined;

      // 1) Reidentificação por android_id (reinstalação) no MESMO pátio.
      let deviceUuidEfetivo = device_uuid;
      if (android_id) {
        const merged = await mergePorAndroidId(db, {
          patioId: bindPatioId,
          tenantId: tenant.id,
          androidIdHash: hashAndroidId(android_id),
          novoDeviceUuid: device_uuid,
          operadorId: operador.id,
          fabricante,
          modelo,
          appVersao: app_versao,
          ip,
        });
        if (merged) deviceUuidEfetivo = merged.device_uuid;
      }

      // 2) A regra de ouro decide.
      let avaliacao;
      try {
        avaliacao = await avaliarDispositivo(db, bindPatioId, deviceUuidEfetivo);
      } catch (e) {
        req.log.error({ err: e }, 'fn_dispositivo_pode_logar falhou no login');
        return reply.code(500).send({ error: 'Falha ao avaliar dispositivo' });
      }

      // Helper: corpo do 403 (contrato consumido pelo app do Bloco 5).
      const negar = (motivo: string, codigo: string | null) =>
        reply.code(403).send({
          erro: 'dispositivo_nao_autorizado',
          motivo,
          codigo_pareamento: codigo,
          mensagem: MSG_DISPOSITIVO_NEGADO,
        });

      // Insere como pendente e devolve o codigo_pareamento (coluna gerada).
      // Robusto a corrida: se o device já existir agora, lê o código atual.
      const inserirPendente = async (): Promise<string | null> => {
        const ins = await db
          .from('dispositivos')
          .insert(
            compact({
              tenant_id: tenant.id,
              patio_id: bindPatioId,
              device_uuid,
              status: 'pendente',
              licenca: 'nenhuma',
              android_id_hash: hash,
              fabricante,
              modelo,
              so_versao,
              app_versao,
            }),
          )
          .select('codigo_pareamento')
          .maybeSingle();
        if (!ins.error && ins.data) {
          return (ins.data as { codigo_pareamento: string }).codigo_pareamento;
        }
        const cur = await db
          .from('dispositivos')
          .select('codigo_pareamento')
          .eq('patio_id', bindPatioId)
          .eq('device_uuid', device_uuid)
          .maybeSingle();
        return (cur.data as { codigo_pareamento?: string } | null)?.codigo_pareamento ?? null;
      };

      if (avaliacao.acao === 'permitir') {
        // Dispositivo já existe e está ativo: atualiza metadados + ultimo_acesso.
        await db
          .from('dispositivos')
          .update(
            compact({
              ultimo_acesso: agora,
              android_id_hash: hash,
              fabricante,
              modelo,
              so_versao,
              app_versao,
            }),
          )
          .eq('patio_id', bindPatioId)
          .eq('device_uuid', deviceUuidEfetivo);
        registrarEvento(db, {
          patioId: bindPatioId,
          tenantId: tenant.id,
          deviceUuid: deviceUuidEfetivo,
          operadorId: operador.id,
          evento: 'login_ok',
          fabricante,
          modelo,
          appVersao: app_versao,
          ip,
        });
        // segue para emitir tokens
      } else if (avaliacao.acao === 'criar_incluso') {
        // 1º aparelho do pátio: entra sem fricção como ativo/incluso.
        const { error: insErr } = await db.from('dispositivos').insert(
          compact({
            tenant_id: tenant.id,
            patio_id: bindPatioId,
            device_uuid,
            status: 'ativo',
            licenca: 'incluso',
            vinculado_em: agora,
            ultimo_acesso: agora,
            android_id_hash: hash,
            fabricante,
            modelo,
            so_versao,
            app_versao,
          }),
        );
        if (insErr) {
          // Corrida: dois aparelhos num pátio vazio. O índice único parcial
          // uq_dispositivo_incluso_por_patio barra o 2º → cai em pendente.
          if (insErr.code === UNIQUE_VIOLATION) {
            const codigo = await inserirPendente();
            registrarEvento(db, {
              patioId: bindPatioId,
              tenantId: tenant.id,
              deviceUuid: device_uuid,
              operadorId: operador.id,
              evento: 'login_negado',
              motivo: 'limite_atingido',
              fabricante,
              modelo,
              appVersao: app_versao,
              ip,
            });
            return negar('limite_atingido', codigo);
          }
          req.log.error({ err: insErr }, 'falha ao inserir dispositivo incluso');
          return reply.code(500).send({ error: 'Falha ao registrar dispositivo' });
        }
        registrarEvento(db, {
          patioId: bindPatioId,
          tenantId: tenant.id,
          deviceUuid: device_uuid,
          operadorId: operador.id,
          evento: 'vinculado',
          motivo: 'slot_incluso_livre',
          fabricante,
          modelo,
          appVersao: app_versao,
          ip,
        });
        registrarEvento(db, {
          patioId: bindPatioId,
          tenantId: tenant.id,
          deviceUuid: device_uuid,
          operadorId: operador.id,
          evento: 'login_ok',
          fabricante,
          modelo,
          appVersao: app_versao,
          ip,
        });
        // segue para emitir tokens
      } else if (avaliacao.acao === 'criar_pendente') {
        const codigo = await inserirPendente();
        registrarEvento(db, {
          patioId: bindPatioId,
          tenantId: tenant.id,
          deviceUuid: device_uuid,
          operadorId: operador.id,
          evento: 'login_negado',
          motivo: avaliacao.motivo,
          fabricante,
          modelo,
          appVersao: app_versao,
          ip,
        });
        return negar(avaliacao.motivo, codigo);
      } else {
        // acao === 'negar'
        let codigo: string | null = null;
        if (avaliacao.motivo !== 'limite_pendentes') {
          const cur = await db
            .from('dispositivos')
            .select('codigo_pareamento')
            .eq('patio_id', bindPatioId)
            .eq('device_uuid', deviceUuidEfetivo)
            .maybeSingle();
          codigo = (cur.data as { codigo_pareamento?: string } | null)?.codigo_pareamento ?? null;
        }
        registrarEvento(db, {
          patioId: bindPatioId,
          tenantId: tenant.id,
          deviceUuid: deviceUuidEfetivo,
          operadorId: operador.id,
          evento: 'login_negado',
          motivo: avaliacao.motivo,
          fabricante,
          modelo,
          appVersao: app_versao,
          ip,
        });
        return negar(avaliacao.motivo, codigo);
      }
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

    // Reavaliação de dispositivo a cada refresh (gate em tempo real). Só quando
    // o device foi bindado a um pátio (fluxo novo); device legado/não-bindado
    // segue o refresh normal (não quebra o app publicado).
    let modoDrenagem = false;
    {
      const dbT = await tenantClient(sessao.tenant_id);
      const { data: disp } = await dbT
        .from('dispositivos')
        .select('patio_id, status, bloqueado_em')
        .eq('device_uuid', device_uuid)
        .order('ultimo_acesso', { ascending: false, nullsFirst: false })
        .limit(1);
      const dispositivo = (disp ?? [])[0] as
        | { patio_id: string; status: string; bloqueado_em: string | null }
        | undefined;

      if (dispositivo) {
        let avaliacao;
        try {
          avaliacao = await avaliarDispositivo(dbT, dispositivo.patio_id, device_uuid);
        } catch (e) {
          // Fail-open: erro transitório na RPC não deve derrubar a sessão.
          req.log.error({ err: e }, 'reavaliação de dispositivo falhou no refresh');
          avaliacao = { pode: true, motivo: 'ok', acao: 'permitir' as const };
        }
        if (!avaliacao.pode) {
          const encerrar = async (msg: string) => {
            await admin.from('operador_sessoes').delete().eq('id', sessao.id);
            return reply.code(401).send({ error: msg });
          };
          if (avaliacao.motivo === 'assinatura_bloqueada') {
            return encerrar('Assinatura bloqueada');
          }
          if (dispositivo.status === 'revogado') {
            return encerrar('Dispositivo revogado');
          }
          if (dispositivo.status === 'bloqueado') {
            const dentroJanela =
              !!dispositivo.bloqueado_em &&
              Date.now() < new Date(dispositivo.bloqueado_em).getTime() + JANELA_DRENAGEM_MS;
            if (dentroJanela) {
              modoDrenagem = true; // token restrito de drenagem (só /sync)
            } else {
              return encerrar('Dispositivo bloqueado');
            }
          } else {
            // pendente/negado → sessão não deveria existir; encerra.
            return encerrar('Dispositivo não autorizado');
          }
        }
      }
    }

    // Rotação in-place (one-time-use): substitui o hash na MESMA linha. Em
    // DRENAGEM a rotação continua (segurança), mas NÃO estende a validade da
    // sessão — o corte de 7 dias é reavaliado aqui a cada refresh.
    const newRefresh = generateRefreshToken();
    const newHash = hashRefreshToken(newRefresh);
    const rotacao: { refresh_token_hash: string; expires_at?: string } = {
      refresh_token_hash: newHash,
    };
    if (!modoDrenagem) {
      rotacao.expires_at = new Date(
        Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();
    }
    await admin.from('operador_sessoes').update(rotacao).eq('id', sessao.id);

    const accessPayload: OperadorTokenPayload = {
      sub: operador.id,
      usuario: operador.usuario,
      nome: operador.nome,
      tenant_id: sessao.tenant_id,
      patio_ids: patioIds,
    };
    if (modoDrenagem) accessPayload.modo = 'drenagem';
    const accessToken = await signAccessToken(accessPayload);

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
