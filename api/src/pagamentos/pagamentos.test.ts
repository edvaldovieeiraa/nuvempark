import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';

import type { GatewayTenant } from './adapter.js';

// A chave precisa existir ANTES de o env.ts ser importado (ele valida no load).
process.env.NUVEMPARK_CRYPTO_KEY ||= randomBytes(32).toString('base64');
process.env.SUPABASE_URL ||= 'https://exemplo.supabase.co';
process.env.SUPABASE_ANON_KEY ||= 'anon';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'service';
process.env.SUPABASE_JWT_SECRET ||= 'segredo-de-teste-com-16+';
process.env.NUVEMPARK_JWT_SECRET ||= 'segredo-de-teste-com-16+';

let encrypt: (s: string) => string;
let decrypt: (s: string) => string;
let mapearStatus: (s: string | undefined) => string;
let AsaasAdapter: typeof import('./asaas.js').AsaasAdapter;

beforeAll(async () => {
  ({ encrypt, decrypt } = await import('./crypto.js'));
  ({ mapearStatus, AsaasAdapter } = await import('./asaas.js'));
});

describe('crypto (AES-256-GCM)', () => {
  it('round-trip: decifrar o cifrado devolve o original', () => {
    const chave = '$aact_hmlg_000000000000::abcDEF123';
    expect(decrypt(encrypt(chave))).toBe(chave);
  });

  it('formato é iv:tag:ciphertext em base64', () => {
    const partes = encrypt('x').split(':');
    expect(partes).toHaveLength(3);
    for (const p of partes) {
      expect(p.length).toBeGreaterThan(0);
      // base64 válido (round-trip byte a byte)
      expect(Buffer.from(p, 'base64').toString('base64')).toBe(p);
    }
  });

  it('cada cifra usa IV novo — mesmo texto, ciphertext diferente', () => {
    expect(encrypt('igual')).not.toBe(encrypt('igual'));
  });

  it('ciphertext adulterado LANÇA (a tag GCM detecta)', () => {
    const [iv, tag, ct] = encrypt('segredo').split(':') as [
      string,
      string,
      string,
    ];
    const adulterado = Buffer.from(ct, 'base64');
    adulterado[0] = (adulterado[0] ?? 0) ^ 0xff;
    expect(() =>
      decrypt(`${iv}:${tag}:${adulterado.toString('base64')}`),
    ).toThrow();
  });

  it('formato inválido LANÇA', () => {
    expect(() => decrypt('sem-separadores')).toThrow();
  });
});

describe('mapearStatus (Asaas → adapter)', () => {
  it('recebido/confirmado → pago', () => {
    expect(mapearStatus('RECEIVED')).toBe('pago');
    expect(mapearStatus('CONFIRMED')).toBe('pago');
    expect(mapearStatus('RECEIVED_IN_CASH')).toBe('pago');
  });

  it('vencido → expirado', () => {
    expect(mapearStatus('OVERDUE')).toBe('expirado');
  });

  it('estorno/chargeback → cancelado', () => {
    expect(mapearStatus('REFUNDED')).toBe('cancelado');
    expect(mapearStatus('CHARGEBACK_REQUESTED')).toBe('cancelado');
  });

  it('pendente/análise → pendente', () => {
    expect(mapearStatus('PENDING')).toBe('pendente');
    expect(mapearStatus('AWAITING_RISK_ANALYSIS')).toBe('pendente');
  });

  it('desconhecido NUNCA vira pago — cai em pendente', () => {
    expect(mapearStatus('STATUS_QUE_O_ASAAS_INVENTOU')).toBe('pendente');
    expect(mapearStatus(undefined)).toBe('pendente');
  });
});

/**
 * O `customer` do Asaas é para ser criado UMA vez por tenant e reutilizado. Sem
 * a persistência do id, cada Pix criava um cliente novo na conta do tenant —
 * exatamente o que estes testes agora impedem de voltar.
 */
describe('cliente padrão do Asaas', () => {
  const PIX = {
    valor: 10,
    descricao: 'Estadia ABC**23 — Pátio Centro',
    referenciaExterna: 'ref-1',
    expiracaoMinutos: 30,
  };

  function cfg(customerPadraoId: string | null = null): GatewayTenant {
    return {
      gateway: 'asaas',
      apiKey: '$aact_teste',
      subcontaId: 'sub_1',
      customerPadraoId,
      splitPercentual: 0,
      splitValorFixo: 0,
    };
  }

  /** Asaas de mentira: responde o mínimo e anota o que foi chamado. */
  function asaasFalso(): { chamadas: string[] } {
    const chamadas: string[] = [];
    const fn = async (url: unknown, init?: { method?: string }) => {
      const caminho = String(url);
      chamadas.push(`${init?.method ?? 'GET'} ${caminho}`);

      const corpo = caminho.includes('/customers')
        ? { id: 'cus_novo' }
        : caminho.includes('/pixQrCode')
          ? { encodedImage: 'iVBORw0KG', payload: '00020126BR.GOV.BCB.PIX' }
          : { id: 'pay_1' };

      return new Response(JSON.stringify(corpo), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    vi.stubGlobal('fetch', fn);
    return { chamadas };
  }

  const criacoesDeCliente = (chamadas: string[]) =>
    chamadas.filter((c) => c.startsWith('POST') && c.includes('/customers'));

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sem customer_padrao_id: cria no PSP e PERSISTE o id', async () => {
    const { chamadas } = asaasFalso();
    const persistidos: string[] = [];
    const adapter = new AsaasAdapter(cfg(), async (id) => {
      persistidos.push(id);
    });

    await adapter.gerarCobrancaPix(PIX);

    expect(persistidos).toEqual(['cus_novo']);
    expect(criacoesDeCliente(chamadas)).toHaveLength(1);
  });

  it('com customer_padrao_id: reusa e NÃO cria cliente novo', async () => {
    const { chamadas } = asaasFalso();
    const adapter = new AsaasAdapter(cfg('cus_existente'), async () => {});

    await adapter.gerarCobrancaPix(PIX);

    expect(criacoesDeCliente(chamadas)).toHaveLength(0);
  });

  it('duas cobranças seguidas criam UM cliente só', async () => {
    const { chamadas } = asaasFalso();
    const adapter = new AsaasAdapter(cfg(), async () => {});

    await adapter.gerarCobrancaPix(PIX);
    await adapter.gerarCobrancaPix({ ...PIX, referenciaExterna: 'ref-2' });

    expect(criacoesDeCliente(chamadas)).toHaveLength(1);
  });

  it('falha ao persistir NÃO derruba a cobrança', async () => {
    asaasFalso();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = new AsaasAdapter(cfg(), async () => {
      throw new Error('banco fora');
    });

    const cobranca = await adapter.gerarCobrancaPix(PIX);

    // O cliente existe no PSP; um carro não fica preso na cancela por causa
    // de uma escrita de cache que falhou.
    expect(cobranca.pixCopiaCola).toBe('00020126BR.GOV.BCB.PIX');
    expect(cobranca.gatewayCobrancaId).toBe('pay_1');
  });
});
