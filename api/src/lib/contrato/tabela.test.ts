import { describe, expect, it } from 'vitest';
import type { Regra } from './modelo.js';
import { precoDaTabela } from './tabela.js';

function padrao(r: Partial<Regra>): Regra {
  return {
    nome: 'Padrão',
    inicio: null,
    fim: null,
    dias: null,
    usarMinutosPagos: false,
    recomecarTabela: false,
    faixas: [],
    fracao: null,
    ...r,
  };
}

// C1: até 0:15 → 0 · até 1:00 → 10 · até 2:00 → 15 · depois 5 a cada 1:00
const c1 = padrao({
  faixas: [
    { ateMinutos: 15, valorCentavos: 0 },
    { ateMinutos: 60, valorCentavos: 1000 },
    { ateMinutos: 120, valorCentavos: 1500 },
  ],
  fracao: { minutos: 60, valorCentavos: 500 },
});
// C3: até 1:00 → 10 · até 3:00 → 20 · recomeça
const c3 = padrao({
  faixas: [
    { ateMinutos: 60, valorCentavos: 1000 },
    { ateMinutos: 180, valorCentavos: 2000 },
  ],
  recomecarTabela: true,
});
// C10: até 24:00 → 40 · até 48:00 → 70 · depois 30 a cada 24:00
const c10 = padrao({
  faixas: [
    { ateMinutos: 1440, valorCentavos: 4000 },
    { ateMinutos: 2880, valorCentavos: 7000 },
  ],
  fracao: { minutos: 1440, valorCentavos: 3000 },
});

/** [minutos, valor, coberto] */
function confere(regra: Regra, casos: Array<[number, number, number]>) {
  for (const [minutos, valor, coberto] of casos) {
    const p = precoDaTabela(regra, minutos);
    expect({ minutos, valor: p.valorCentavos, coberto: p.cobertoMinutos }).toEqual({
      minutos,
      valor,
      coberto,
    });
  }
}

describe('precoDaTabela', () => {
  it('limite da faixa é inclusivo (S01–S05)', () => {
    confere(c1, [
      [0, 0, 15],
      [15, 0, 15],
      [16, 1000, 60],
      [60, 1000, 60],
      [61, 1500, 120],
      [120, 1500, 120],
    ]);
  });

  it('fração depois da última faixa arredonda para cima (S06–S09)', () => {
    confere(c1, [
      [121, 2000, 180],
      [150, 2000, 180],
      [180, 2000, 180],
      [181, 2500, 240],
    ]);
    expect(precoDaTabela(c1, 181).cobranca).toEqual({ tipo: 'fracao', ateMinutos: 120, fracoes: 2 });
  });

  it('recomeçar: soma o maior valor por ciclo e aplica a tabela ao resto (S17–S22)', () => {
    confere(c3, [
      [180, 2000, 180],
      [181, 3000, 240],
      [240, 3000, 240],
      [360, 4000, 360],
      [361, 5000, 420],
      [450, 6000, 540],
    ]);
    expect(precoDaTabela(c3, 450).cobranca).toEqual({
      tipo: 'ciclos',
      ciclos: 2,
      resto: { tipo: 'faixa', ateMinutos: 180 },
    });
    expect(precoDaTabela(c3, 360).cobranca).toEqual({ tipo: 'ciclos', ciclos: 2, resto: null });
  });

  it('faixas e fração acima de 24 h (S50–S54)', () => {
    confere(c10, [
      [1380, 4000, 1440],
      [1440, 4000, 1440],
      [1500, 7000, 2880],
      [2940, 10000, 4320],
      [4380, 13000, 5760],
    ]);
  });
});
