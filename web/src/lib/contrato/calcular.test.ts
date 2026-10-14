import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calcular, ContratoInvalido } from './calcular';
import { lerContrato, type Contrato } from './modelo';

/**
 * Bordas que o golden não cobre. Os contratos são os do golden (C1, C2, C4,
 * C5); os horários são de Brasília (−03:00, sem horário de verão em 2026).
 */
const golden = JSON.parse(
  readFileSync(new URL('../../../../golden/tarifa-contrato.json', import.meta.url), 'utf8'),
) as { contratos: Record<string, unknown> };
const contrato = (nome: string): Contrato => lerContrato(golden.contratos[nome]);
const SP = 'America/Sao_Paulo';
const brt = (s: string) => new Date(`${s}-03:00`);

function calc(nome: string, entrada: string, saida: string) {
  return calcular({ entrada: brt(entrada), saida: brt(saida), contrato: contrato(nome), fuso: SP });
}

describe('calcular — bordas', () => {
  it('entrada igual à saída cai na primeira faixa', () => {
    const r = calc('C1', '2026-10-19T10:00', '2026-10-19T10:00');
    expect([r.totalCentavos, r.minutosRestantes]).toEqual([0, 15]);
  });

  it('entrada igual à saída dentro do Noturno: paga a faixa até o fim da janela', () => {
    const r = calc('C4', '2026-10-19T21:00', '2026-10-19T21:00');
    expect([r.totalCentavos, r.minutosRestantes]).toEqual([2500, 9 * 60]);
  });

  it('saída antes da entrada é erro', () => {
    expect(() => calc('C1', '2026-10-19T10:00', '2026-10-19T09:59')).toThrow(/posterior/);
  });

  it('contrato inválido não é cobrado', () => {
    const c = contrato('C1');
    c.regras[0]!.fracao = null;
    expect(() =>
      calcular({ entrada: brt('2026-10-19T10:00'), saida: brt('2026-10-19T11:00'), contrato: c, fuso: SP }),
    ).toThrow(ContratoInvalido);
  });

  it('segundos são truncados como no motor v1: 59 min 59 s = 59 min', () => {
    const r = calcular({
      entrada: new Date('2026-10-19T13:00:30Z'),
      saida: new Date('2026-10-19T14:00:29Z'),
      contrato: contrato('C1'),
      fuso: SP,
    });
    expect([r.totalCentavos, r.minutosRestantes]).toEqual([1000, 1]);
  });

  it('a Padrão paga até o começo da próxima janela, não além', () => {
    // 19:40 → 19:50: faixa até 1:00 cobriria até 20:40, mas o Noturno começa às 20:00.
    const r = calc('C4', '2026-10-19T19:40', '2026-10-19T19:50');
    expect([r.totalCentavos, r.minutosRestantes]).toEqual([1000, 10]);
  });

  it('minutos pagos do Noturno e depois a Padrão até a noite seguinte', () => {
    // Noturno 20:00 → 08:00 (faixa de 12 h, minutos pagos) = 25; Padrão 08:00 → 19:30
    // = 10 + ceil(630/60) × 5 = 65; a Padrão para no Noturno de terça (20:00).
    const r = calc('C5', '2026-10-19T20:00', '2026-10-20T19:30');
    expect(r.fatias.map((f) => (f.tipo === 'regra' ? [f.regra, f.valorCentavos] : f))).toEqual([
      ['Noturno', 2500],
      ['Padrão', 6500],
    ]);
    expect(r.minutosRestantes).toBe(30);
  });

  it('diária: estadia curta e barata fica na tabela', () => {
    const r = calc('C2', '2026-10-19T10:00', '2026-10-19T10:00');
    expect(r.fatias.map((f) => f.tipo)).toEqual(['regra']);
    expect(r.totalCentavos).toBe(0);
  });

  it('diária: 48 h exatas são 2 diárias numa fatia só', () => {
    const r = calc('C2', '2026-10-19T10:00', '2026-10-21T10:00');
    expect(r.fatias).toHaveLength(1);
    expect(r.fatias[0]).toMatchObject({ tipo: 'diarias', quantidade: 2, valorCentavos: 8000 });
    expect(r.minutosRestantes).toBe(0);
  });

  it('memória: inicio e fim de cada fatia (S24)', () => {
    const r = calc('C4', '2026-10-19T19:00', '2026-10-19T21:00');
    expect(
      r.fatias.map((f) => [f.inicio.toISOString(), f.fim.toISOString()]),
    ).toEqual([
      ['2026-10-19T22:00:00.000Z', '2026-10-19T23:00:00.000Z'],
      ['2026-10-19T23:00:00.000Z', '2026-10-20T09:00:00.000Z'],
    ]);
    expect(r.pagoAte.toISOString()).toBe('2026-10-20T09:00:00.000Z');
  });
});
