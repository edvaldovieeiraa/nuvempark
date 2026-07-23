import type { SupabaseClient } from '@supabase/supabase-js';
import { tenantClient } from '../supabase.js';

/**
 * Estado da assinatura publicado em TODA resposta autenticada (headers) e no
 * corpo de login/refresh/bootstrap. O app aplica o bloqueio; a API só PUBLICA.
 *
 * REGRA DE OURO (fonte única): quem decide "libera acesso" é
 * public.fn_assinatura_libera(tenant) no banco — não reimplementamos aqui.
 * Lido sempre com o cliente TENANT-SCOPED (RLS ativa); nunca service_role.
 *
 * Decisão #11 (revista 2026-07-23): 'suspensa'/'cancelada'/tenant inativo =
 * BLOQUEIO TOTAL (antes era "modo restrito"). 'atrasada' = banner + opera.
 */

export type AssinaturaEstado =
  | 'trial'
  | 'ativa'
  | 'atrasada'
  | 'suspensa'
  | 'cancelada';

export interface AssinaturaStatus {
  estado: AssinaturaEstado;
  /** fn_assinatura_libera: ativa OU trial vigente, com tenant ativo. */
  libera: boolean;
  /** estado em (suspensa, cancelada) OU tenant inativo → tela de bloqueio. */
  bloqueia: boolean;
  /** Dias restantes de trial (>=0), ou null quando não é trial. */
  trial_dias_restantes: number | null;
}

const ESTADOS: readonly AssinaturaEstado[] = [
  'trial',
  'ativa',
  'atrasada',
  'suspensa',
  'cancelada',
];

function normalizaEstado(v: unknown): AssinaturaEstado {
  return typeof v === 'string' && (ESTADOS as readonly string[]).includes(v)
    ? (v as AssinaturaEstado)
    : 'ativa'; // sem linha/valor estranho → tratar como ativa (não bloquear à toa)
}

/**
 * Resolve o status com um cliente tenant-scoped já criado. Função pura de I/O:
 * três leituras sob RLS. Testável sem cache.
 */
export async function getAssinaturaStatus(
  client: SupabaseClient,
  tenantId: string,
): Promise<AssinaturaStatus> {
  const [liberaRes, assRes, tenantRes] = await Promise.all([
    client.rpc('fn_assinatura_libera', { p_tenant: tenantId }),
    client
      .from('assinaturas')
      .select('estado, trial_expira_em')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    client.from('tenants').select('ativo').eq('id', tenantId).maybeSingle(),
  ]);

  const estado = normalizaEstado(assRes.data?.estado);
  // Sem linha de tenant visível (não deveria ocorrer sob RLS correta) → fail-open
  // no tenant.ativo: o bloqueio comercial vem do estado, não de um dado ausente.
  const tenantAtivo = tenantRes.data?.ativo ?? true;
  const libera = liberaRes.data === true;
  const bloqueia =
    estado === 'suspensa' || estado === 'cancelada' || tenantAtivo === false;

  let trialDiasRestantes: number | null = null;
  const expira = assRes.data?.trial_expira_em;
  if (estado === 'trial' && typeof expira === 'string') {
    const ms = new Date(expira).getTime() - Date.now();
    trialDiasRestantes = Math.max(0, Math.ceil(ms / 86_400_000));
  }

  return {
    estado,
    libera,
    bloqueia,
    trial_dias_restantes: trialDiasRestantes,
  };
}

// ── Cache em memória por tenant (TTL 30s) ────────────────────────────────────
// O sync manda 1 item por request; sem cache, um dreno de fila viraria 1 query
// de assinatura por item. 30s é curto o bastante para o bloqueio chegar no
// próximo tick de sync/heartbeat e barato o bastante para a rajada.
interface Entrada {
  status: AssinaturaStatus;
  expira: number;
}
const cache = new Map<string, Entrada>();
const TTL_MS = 30_000;

/**
 * Status com cache por tenant. Cria o cliente tenant-scoped só no cache-miss
 * (não gasta assinatura de JWT à toa no caminho quente).
 */
export async function resolveAssinaturaStatus(
  tenantId: string,
): Promise<AssinaturaStatus> {
  const agora = Date.now();
  const hit = cache.get(tenantId);
  if (hit && hit.expira > agora) return hit.status;

  const client = await tenantClient(tenantId);
  const status = await getAssinaturaStatus(client, tenantId);
  cache.set(tenantId, { status, expira: agora + TTL_MS });
  return status;
}

/** Semeia/atualiza o cache (ex.: login já resolveu o status fresco). */
export function setAssinaturaCache(
  tenantId: string,
  status: AssinaturaStatus,
): void {
  cache.set(tenantId, { status, expira: Date.now() + TTL_MS });
}
