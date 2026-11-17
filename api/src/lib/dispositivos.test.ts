import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { avaliarDispositivo } from './dispositivos.js';

/** Cliente falso: só responde à RPC fn_dispositivo_pode_logar. */
function fakeRpc(data: unknown, error: { message: string } | null = null) {
  return {
    rpc: async () => ({ data, error }),
  } as unknown as SupabaseClient;
}

describe('avaliarDispositivo', () => {
  it('repassa a ação criar_cortesia (conta de revisão da loja)', async () => {
    const r = await avaliarDispositivo(
      fakeRpc({ pode: true, motivo: 'conta_revisao', acao: 'criar_cortesia' }),
      'patio',
      'device',
    );
    expect(r).toEqual({ pode: true, motivo: 'conta_revisao', acao: 'criar_cortesia' });
  });

  it('mantém criar_incluso', async () => {
    const r = await avaliarDispositivo(
      fakeRpc({ pode: true, motivo: 'slot_incluso_livre', acao: 'criar_incluso' }),
      'patio',
      'device',
    );
    expect(r.acao).toBe('criar_incluso');
  });

  it('ação desconhecida vira negar (nunca libera por engano)', async () => {
    const r = await avaliarDispositivo(
      fakeRpc({ pode: true, motivo: 'x', acao: 'liberar_tudo' }),
      'patio',
      'device',
    );
    expect(r.acao).toBe('negar');
  });

  it('erro da RPC lança', async () => {
    await expect(
      avaliarDispositivo(fakeRpc(null, { message: 'boom' }), 'patio', 'device'),
    ).rejects.toThrow('fn_dispositivo_pode_logar falhou');
  });
});
