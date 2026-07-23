import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Helper único de licenciamento de dispositivos. Concentra TODO o acesso à
 * tabela `dispositivos`/`dispositivo_acessos` do ponto de vista da API.
 *
 * REGRA DE OURO: a decisão de deixar logar mora em
 * public.fn_dispositivo_pode_logar(patio_id, device_uuid). A API só chama a
 * função e obedece o retorno — nada de reimplementar a regra em TS.
 *
 * Todo I/O aqui usa o cliente TENANT-SCOPED recebido por parâmetro (RLS ativa);
 * nunca service_role. O ANDROID_ID nunca é persistido cru — só o sha256.
 */

export type DispositivoAcao =
  | 'permitir'
  | 'criar_incluso'
  | 'criar_pendente'
  | 'negar';

export interface AvaliacaoDispositivo {
  pode: boolean;
  motivo: string;
  acao: DispositivoAcao;
}

/** Linha de dispositivos com os campos que a API manipula. */
export interface DispositivoRow {
  id: string;
  device_uuid: string;
  status: string;
  licenca: string;
  patio_id: string;
  tenant_id: string;
}

/** Código Postgres de violação de unicidade (índice/constraint UNIQUE). */
export const UNIQUE_VIOLATION = '23505';

/** sha256 hex do ANDROID_ID. NUNCA persistir o valor cru. */
export function hashAndroidId(androidId: string): string {
  return createHash('sha256').update(androidId).digest('hex');
}

const ACOES: readonly DispositivoAcao[] = [
  'permitir',
  'criar_incluso',
  'criar_pendente',
  'negar',
];

function coerceAcao(v: unknown): DispositivoAcao {
  return typeof v === 'string' && (ACOES as readonly string[]).includes(v)
    ? (v as DispositivoAcao)
    : 'negar';
}

function narrowAvaliacao(v: unknown): AvaliacaoDispositivo {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return {
      pode: o.pode === true,
      motivo: typeof o.motivo === 'string' ? o.motivo : 'desconhecido',
      acao: coerceAcao(o.acao),
    };
  }
  return { pode: false, motivo: 'erro_avaliacao', acao: 'negar' };
}

/**
 * Chama a RPC fn_dispositivo_pode_logar e devolve o resultado tipado.
 * Lança em erro de RPC (o chamador decide como degradar) — mas nunca retorna
 * um estado ambíguo.
 */
export async function avaliarDispositivo(
  db: SupabaseClient,
  patioId: string,
  deviceUuid: string,
): Promise<AvaliacaoDispositivo> {
  const { data, error } = await db.rpc('fn_dispositivo_pode_logar', {
    p_patio_id: patioId,
    p_device_uuid: deviceUuid,
  });
  if (error) {
    throw new Error(`fn_dispositivo_pode_logar falhou: ${error.message}`);
  }
  return narrowAvaliacao(data);
}

export interface EventoDispositivo {
  patioId: string;
  tenantId: string;
  deviceUuid: string;
  evento: string;
  dispositivoId?: string | null;
  operadorId?: string | null;
  motivo?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  appVersao?: string | null;
  ip?: string | null;
}

/**
 * Insere um evento em dispositivo_acessos. FIRE-AND-FORGET: falha ao gravar
 * histórico NUNCA derruba a requisição principal — loga e segue.
 */
export function registrarEvento(db: SupabaseClient, ev: EventoDispositivo): void {
  void db
    .from('dispositivo_acessos')
    .insert({
      patio_id: ev.patioId,
      tenant_id: ev.tenantId,
      dispositivo_id: ev.dispositivoId ?? null,
      device_uuid: ev.deviceUuid,
      operador_id: ev.operadorId ?? null,
      evento: ev.evento,
      motivo: ev.motivo ?? null,
      fabricante: ev.fabricante ?? null,
      modelo: ev.modelo ?? null,
      app_versao: ev.appVersao ?? null,
      ip: ev.ip ?? null,
    })
    .then(
      (res) => {
        if (res.error) {
          console.error('[dispositivo_acessos] insert falhou:', res.error.message);
        }
      },
      (err: unknown) => {
        console.error('[dispositivo_acessos] insert rejeitado:', err);
      },
    );
}

export interface MergeAndroidParams {
  patioId: string;
  tenantId: string;
  androidIdHash: string;
  novoDeviceUuid: string;
  operadorId?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  appVersao?: string | null;
  ip?: string | null;
}

/**
 * Reidentificação por ANDROID_ID DENTRO DO MESMO PÁTIO: uma reinstalação gera
 * um device_uuid novo, mas o aparelho físico é o mesmo. Procuramos um
 * dispositivo não-revogado com o mesmo android_id_hash NAQUELE pátio; se achar,
 * costuramos o device_uuid novo por cima, preservando status/licenca (o slot
 * incluso/licenciado não se perde na reinstalação) e gravamos 'reidentificado'.
 *
 * ⚠️ Nunca comparar android_id_hash ENTRE pátios: dois tenants não podem inferir
 * a existência um do outro por colisão de hash. Por isso o filtro por patio_id
 * é obrigatório.
 */
export async function mergePorAndroidId(
  db: SupabaseClient,
  params: MergeAndroidParams,
): Promise<DispositivoRow | null> {
  const { patioId, tenantId, androidIdHash, novoDeviceUuid } = params;

  const { data: candidatos } = await db
    .from('dispositivos')
    .select('id, device_uuid, status, licenca, patio_id, tenant_id')
    .eq('patio_id', patioId)
    .eq('android_id_hash', androidIdHash)
    .neq('status', 'revogado')
    .order('ultimo_acesso', { ascending: false, nullsFirst: false })
    .limit(1);

  const existente = (candidatos ?? [])[0] as DispositivoRow | undefined;
  if (!existente) return null;

  // Já é o mesmo uuid → nada a costurar.
  if (existente.device_uuid === novoDeviceUuid) return existente;

  const { data: atualizado, error } = await db
    .from('dispositivos')
    .update({ device_uuid: novoDeviceUuid })
    .eq('id', existente.id)
    .select('id, device_uuid, status, licenca, patio_id, tenant_id')
    .maybeSingle();

  if (error || !atualizado) {
    // Update falhou (ex.: corrida) → devolve o existente sem quebrar o login.
    return existente;
  }

  registrarEvento(db, {
    patioId,
    tenantId,
    dispositivoId: existente.id,
    deviceUuid: novoDeviceUuid,
    operadorId: params.operadorId,
    evento: 'reidentificado',
    motivo: 'android_id',
    fabricante: params.fabricante,
    modelo: params.modelo,
    appVersao: params.appVersao,
    ip: params.ip,
  });

  return atualizado as DispositivoRow;
}
