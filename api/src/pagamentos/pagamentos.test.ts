import { beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';

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

beforeAll(async () => {
  ({ encrypt, decrypt } = await import('./crypto.js'));
  ({ mapearStatus } = await import('./asaas.js'));
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
