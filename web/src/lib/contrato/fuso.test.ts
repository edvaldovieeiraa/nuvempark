import { describe, expect, it } from 'vitest';
import { instanteLocal, partesLocais, somarDias } from './fuso';

const SP = 'America/Sao_Paulo';
const NY = 'America/New_York';

describe('fuso', () => {
  it('instante UTC → hora de Brasília, com o dia da semana de Brasília', () => {
    // 01:00 UTC de terça = 22:00 de segunda em Brasília.
    expect(partesLocais(new Date('2026-10-20T01:00:00Z'), SP)).toEqual({
      ano: 2026,
      mes: 10,
      dia: 19,
      diaSemana: 1,
      minutoDoDia: 22 * 60,
    });
  });

  it('domingo é 7 (ISO)', () => {
    expect(partesLocais(new Date('2026-10-25T15:00:00Z'), SP).diaSemana).toBe(7);
  });

  it('hora de Brasília → instante UTC', () => {
    expect(instanteLocal(2026, 10, 19, 20 * 60, SP).toISOString()).toBe('2026-10-19T23:00:00.000Z');
  });

  it('não usa offset fixo: Nova York muda de −5 para −4 em 08/03/2026', () => {
    expect(instanteLocal(2026, 3, 7, 3 * 60, NY).toISOString()).toBe('2026-03-07T08:00:00.000Z');
    expect(instanteLocal(2026, 3, 8, 3 * 60, NY).toISOString()).toBe('2026-03-08T07:00:00.000Z');
    expect(partesLocais(new Date('2026-03-08T06:59:00Z'), NY).minutoDoDia).toBe(1 * 60 + 59);
    expect(partesLocais(new Date('2026-03-08T07:00:00Z'), NY).minutoDoDia).toBe(3 * 60);
  });

  it('somarDias atravessa mês e ano', () => {
    expect(somarDias(2026, 12, 31, 1)).toEqual({ ano: 2027, mes: 1, dia: 1 });
    expect(somarDias(2026, 3, 1, -1)).toEqual({ ano: 2026, mes: 2, dia: 28 });
  });
});
