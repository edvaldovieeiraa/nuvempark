import { beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// env precisa existir ANTES de assinatura.ts → supabase.ts → env.ts carregar.
process.env.NUVEMPARK_CRYPTO_KEY ||= randomBytes(32).toString('base64');
process.env.SUPABASE_URL ||= 'https://exemplo.supabase.co';
process.env.SUPABASE_ANON_KEY ||= 'anon';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'service';
process.env.SUPABASE_JWT_SECRET ||= 'segredo-de-teste-com-16+';
process.env.NUVEMPARK_JWT_SECRET ||= 'segredo-de-teste-com-16+';

let getAssinaturaStatus: typeof import('./assinatura.js').getAssinaturaStatus;

beforeAll(async () => {
  ({ getAssinaturaStatus } = await import('./assinatura.js'));
});

/** Cliente Supabase falso: responde às 3 leituras de getAssinaturaStatus. */
function fakeClient(opts: {
  libera: boolean;
  estado: string | null;
  trialExpira?: string | null;
  tenantAtivo?: boolean | null;
}): SupabaseClient {
  const { libera, estado, trialExpira = null, tenantAtivo = true } = opts;
  return {
    rpc: () => Promise.resolve({ data: libera, error: null }),
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve(
              table === 'assinaturas'
                ? {
                    data:
                      estado === null
                        ? null
                        : { estado, trial_expira_em: trialExpira },
                    error: null,
                  }
                : {
                    data: tenantAtivo === null ? null : { ativo: tenantAtivo },
                    error: null,
                  },
            ),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

const T = '00000000-0000-4000-8000-000000000000';

describe('getAssinaturaStatus — bloqueio', () => {
  it("suspensa => bloqueia, mesmo que fn_assinatura_libera falhe em concordar", async () => {
    const s = await getAssinaturaStatus(
      fakeClient({ libera: false, estado: 'suspensa' }),
      T,
    );
    expect(s.estado).toBe('suspensa');
    expect(s.bloqueia).toBe(true);
    expect(s.libera).toBe(false);
    expect(s.trial_dias_restantes).toBeNull();
  });

  it('cancelada => bloqueia', async () => {
    const s = await getAssinaturaStatus(
      fakeClient({ libera: false, estado: 'cancelada' }),
      T,
    );
    expect(s.bloqueia).toBe(true);
  });

  it('tenant inativo => bloqueia mesmo com estado ativa', async () => {
    const s = await getAssinaturaStatus(
      fakeClient({ libera: false, estado: 'ativa', tenantAtivo: false }),
      T,
    );
    expect(s.estado).toBe('ativa');
    expect(s.bloqueia).toBe(true);
  });

  it('ativa (tenant ativo) => NÃO bloqueia e libera', async () => {
    const s = await getAssinaturaStatus(
      fakeClient({ libera: true, estado: 'ativa' }),
      T,
    );
    expect(s.bloqueia).toBe(false);
    expect(s.libera).toBe(true);
  });

  it('atrasada => NÃO bloqueia (banner + opera), libera reflete a fn', async () => {
    const s = await getAssinaturaStatus(
      fakeClient({ libera: false, estado: 'atrasada' }),
      T,
    );
    expect(s.estado).toBe('atrasada');
    expect(s.bloqueia).toBe(false);
    expect(s.libera).toBe(false);
  });
});

describe('getAssinaturaStatus — trial', () => {
  it('trial vigente => não bloqueia, dias restantes > 0', async () => {
    const expira = new Date(Date.now() + 10 * 86_400_000).toISOString();
    const s = await getAssinaturaStatus(
      fakeClient({ libera: true, estado: 'trial', trialExpira: expira }),
      T,
    );
    expect(s.bloqueia).toBe(false);
    expect(s.libera).toBe(true);
    expect(s.trial_dias_restantes).toBeGreaterThan(8);
    expect(s.trial_dias_restantes).toBeLessThanOrEqual(10);
  });

  it('trial expirado => dias 0, não bloqueia (o corte é no login), não libera', async () => {
    const expira = new Date(Date.now() - 86_400_000).toISOString();
    const s = await getAssinaturaStatus(
      fakeClient({ libera: false, estado: 'trial', trialExpira: expira }),
      T,
    );
    expect(s.trial_dias_restantes).toBe(0);
    expect(s.bloqueia).toBe(false);
    expect(s.libera).toBe(false);
  });

  it('sem linha de assinatura => tratado como ativa (não bloqueia)', async () => {
    const s = await getAssinaturaStatus(
      fakeClient({ libera: true, estado: null }),
      T,
    );
    expect(s.estado).toBe('ativa');
    expect(s.bloqueia).toBe(false);
    expect(s.trial_dias_restantes).toBeNull();
  });
});
