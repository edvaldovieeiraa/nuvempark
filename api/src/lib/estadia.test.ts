import { describe, expect, it } from 'vitest';
import { argsPagamentoEstadia, linhaEstadia, montarEstadias } from './estadia.js';

const ctx = {
  patioId: '11111111-1111-1111-1111-111111111111',
  tenantId: '22222222-2222-2222-2222-222222222222',
  operadorSub: '33333333-3333-3333-3333-333333333333',
  agora: '2026-10-08T17:30:00.000Z',
};

const estadia = {
  id: 'est-1',
  placa: 'rto4f21',
  tipo_veiculo: 'carro',
  tarifa_id: '44444444-4444-4444-4444-444444444444',
  diaria_valor: 30,
  diaria_horas: 24,
  inicio: Date.parse('2026-10-08T17:30:00Z'),
  valida_ate: Date.parse('2026-10-11T17:30:00Z'),
  diarias: 3,
  valor_total: 90,
  operador_id: '55555555-5555-5555-5555-555555555555',
};

describe('linhaEstadia', () => {
  it('monta a linha com ids do token, datas em ISO e placa em maiúsculas', () => {
    const r = linhaEstadia('est-1', estadia, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toMatchObject({
      id: 'est-1',
      patio_id: ctx.patioId,
      tenant_id: ctx.tenantId,
      placa: 'RTO4F21',
      inicio: '2026-10-08T17:30:00.000Z',
      valida_ate: '2026-10-11T17:30:00.000Z',
      diarias: 3,
      valor_total: 90,
      operador_id: estadia.operador_id,
      sincronizado_em: ctx.agora,
    });
  });

  it('operador ausente cai no dono do token', () => {
    const { operador_id: _, ...sem } = estadia;
    const r = linhaEstadia('est-1', sem, ctx);
    expect(r.ok && r.valor.operador_id).toBe(ctx.operadorSub);
  });

  it.each(['placa', 'tarifa_id', 'inicio', 'valida_ate', 'diarias', 'diaria_horas'])(
    'sem %s é recusado (o app não vai mandar diferente se tentar de novo)',
    (campo) => {
      const r = linhaEstadia('est-1', { ...estadia, [campo]: undefined }, ctx);
      expect(r.ok).toBe(false);
    },
  );

  it('validade antes do início é recusada', () => {
    const r = linhaEstadia('est-1', { ...estadia, valida_ate: estadia.inicio - 1 }, ctx);
    expect(r.ok).toBe(false);
  });
});

describe('argsPagamentoEstadia', () => {
  const pagamento = {
    estadia_id: 'est-1',
    tipo: 'renovacao',
    diarias: 2,
    valor: 60,
    forma_pagamento: 'pix',
    base: Date.parse('2026-10-11T17:30:00Z'),
    caixa_sessao_id: 'cx-1',
    caixa_movimento_id: 'mv-1',
    pago_em: Date.parse('2026-10-10T12:00:00Z'),
  };

  it('vira os argumentos da função do banco', () => {
    const r = argsPagamentoEstadia('pg-1', pagamento, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toEqual({
      p_id: 'pg-1',
      p_tenant_id: ctx.tenantId,
      p_patio_id: ctx.patioId,
      p_estadia_id: 'est-1',
      p_tipo: 'renovacao',
      p_diarias: 2,
      p_valor: 60,
      p_forma_pagamento: 'pix',
      p_base: '2026-10-11T17:30:00.000Z',
      p_operador_id: ctx.operadorSub,
      p_caixa_sessao_id: 'cx-1',
      p_caixa_movimento_id: 'mv-1',
      p_pago_em: '2026-10-10T12:00:00.000Z',
    });
  });

  it('contratação sem base manda null', () => {
    const { base: _, ...sem } = pagamento;
    const r = argsPagamentoEstadia('pg-0', { ...sem, tipo: 'contratacao' }, ctx);
    expect(r.ok && r.valor.p_base).toBeNull();
  });

  it.each([
    ['tipo desconhecido', { tipo: 'estorno' }],
    ['zero diárias', { diarias: 0 }],
    ['valor negativo', { valor: -1 }],
    ['sem forma', { forma_pagamento: '' }],
    ['sem estadia', { estadia_id: undefined }],
  ])('%s é recusado', (_, troca) => {
    const r = argsPagamentoEstadia('pg-1', { ...pagamento, ...troca }, ctx);
    expect(r.ok).toBe(false);
  });
});

describe('montarEstadias', () => {
  const e = (id: string) => ({
    id,
    placa: 'AAA1A11',
    tipo_veiculo: 'carro',
    tarifa_id: 't',
    diaria_valor: 30,
    diaria_horas: 24,
    inicio: '2026-10-08T17:30:00+00:00',
    valida_ate: '2026-10-11T17:30:00+00:00',
    diarias: 3,
    valor_total: 90,
  });
  const pg = (id: string, estadia_id: string, pago_em: string) => ({
    id,
    estadia_id,
    tipo: 'renovacao',
    diarias: 1,
    valor: 30,
    forma_pagamento: 'pix',
    pago_em,
  });

  it('agrupa os pagamentos na estadia, em ordem de pagamento, sem repetir estadia_id', () => {
    const out = montarEstadias(
      [e('b'), e('a')],
      [pg('p2', 'a', '2026-10-09T10:00:00Z'), pg('p1', 'a', '2026-10-08T17:30:00Z'), pg('p3', 'b', '2026-10-08T18:00:00Z')],
    );
    expect(out.map((x) => x.id)).toEqual(['a', 'b']);
    expect(out[0].pagamentos.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(out[0].pagamentos[0]).not.toHaveProperty('estadia_id');
  });

  it('pagamentos do mesmo instante: ordem estável pelo id (ETag não oscila)', () => {
    const mesmo = '2026-10-09T10:00:00Z';
    const a = montarEstadias([e('a')], [pg('z', 'a', mesmo), pg('m', 'a', mesmo)]);
    const b = montarEstadias([e('a')], [pg('m', 'a', mesmo), pg('z', 'a', mesmo)]);
    expect(a[0].pagamentos.map((p) => p.id)).toEqual(['m', 'z']);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('estadia repetida (válida e com ticket aberto) aparece uma vez', () => {
    const out = montarEstadias([e('a'), e('a')], []);
    expect(out).toHaveLength(1);
    expect(out[0].pagamentos).toEqual([]);
  });
});
