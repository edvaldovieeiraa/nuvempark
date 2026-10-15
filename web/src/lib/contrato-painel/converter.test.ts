import { describe, expect, it } from 'vitest';
import { calcular, validar } from '../contrato';
import { calcularTarifa, type TarifaSim } from '../tarifa-engine';
import { contratoDeTarifa } from './converter';

const FUSO = 'America/Sao_Paulo';

const tarifa = (t: Partial<TarifaSim> = {}): TarifaSim => ({
  tolerancia_minutos: 10,
  fracao_inicial_minutos: 15,
  fracao_inicial_valor: 5,
  fracao_adicional_minutos: 15,
  fracao_adicional_valor: 3,
  teto_diaria: 0,
  pernoite_valor: 0,
  pernoite_hora_inicio: 22,
  pernoite_hora_fim: 8,
  ...t,
});

describe('contratoDeTarifa — campos', () => {
  it('tolerância vira faixa grátis, fração inicial vira faixa, adicional vira fração', () => {
    const r = contratoDeTarifa(tarifa());
    expect(r.contrato.regras).toHaveLength(1);
    const padrao = r.contrato.regras[0]!;
    expect(padrao.nome).toBe('Padrão');
    expect(padrao.faixas).toEqual([
      { ateMinutos: 10, valorCentavos: 0 },
      { ateMinutos: 15, valorCentavos: 500 },
    ]);
    expect(padrao.fracao).toEqual({ minutos: 15, valorCentavos: 300 });
    expect(padrao.recomecarTabela).toBe(false);
    expect(r.contrato.diariaCentavos).toBeNull();
    expect(r.contrato.maisDe24h).toBe(false);
    expect(r.contrato.cobrarMenorValor).toBe(false);
    expect(validar(r.contrato)).toEqual([]);
    expect(r.origem).toEqual({
      'regras[0].faixas[0]': 'veio da tolerância',
      'regras[0].faixas[1]': 'veio da fração inicial',
      'regras[0].fracao': 'veio das frações adicionais',
    });
  });

  it('teto vira diária; teto 0 = sem diária', () => {
    const r = contratoDeTarifa(tarifa({ teto_diaria: 60 }));
    expect(r.contrato.diariaCentavos).toBe(6000);
    expect(r.origem.diaria_centavos).toBe('veio do teto');
    expect(contratoDeTarifa(tarifa({ teto_diaria: 0 })).contrato.diariaCentavos).toBeNull();
  });

  it('valores com centavos quebrados arredondam para o centavo', () => {
    const r = contratoDeTarifa(tarifa({ fracao_inicial_valor: 5.1, fracao_adicional_valor: 0.3 }));
    expect(r.contrato.regras[0]!.faixas[1]!.valorCentavos).toBe(510);
    expect(r.contrato.regras[0]!.fracao!.valorCentavos).toBe(30);
  });

  it('tolerância 0: sem faixa grátis', () => {
    const r = contratoDeTarifa(tarifa({ tolerancia_minutos: 0 }));
    expect(r.contrato.regras[0]!.faixas).toEqual([{ ateMinutos: 15, valorCentavos: 500 }]);
  });
});

describe('contratoDeTarifa — avisos', () => {
  const textos = (t: TarifaSim) => contratoDeTarifa(t).avisos.map((a) => a.texto).join('\n');

  it('tolerância passa a contar minutos inteiros (informação)', () => {
    const a = contratoDeTarifa(tarifa()).avisos;
    expect(a).toHaveLength(1);
    expect(a[0]).toEqual({
      tom: 'info',
      texto:
        'A tolerância de 10 min virou a faixa grátis “até 0:10”. Ela passa a contar minutos inteiros: 10 min 59 s continua grátis (hoje já cobra).',
    });
  });

  it('pernoite com teto: manda desligar a diária e adicionar regra', () => {
    const a = contratoDeTarifa(tarifa({ teto_diaria: 60, pernoite_valor: 25, pernoite_hora_inicio: 22, pernoite_hora_fim: 6 }))
      .avisos.find((x) => x.texto.includes('pernoite'));
    expect(a?.tom).toBe('atencao');
    expect(a?.texto).toBe(
      'A pernoite não foi convertida. A tarifa cobra R$ 25,00 de quem fica das 22:00 às 06:00. Para cobrar a noite à parte, desligue a diária e adicione uma regra por horário (diária junto com regra por horário ainda não é suportada).',
    );
  });

  it('pernoite sem teto: só manda adicionar regra', () => {
    expect(textos(tarifa({ pernoite_valor: 40 }))).toContain(
      'Para cobrar a noite à parte, adicione uma regra por horário.',
    );
  });

  it('tolerância 0: entrada e saída no mesmo instante passam a cobrar', () => {
    const a = contratoDeTarifa(tarifa({ tolerancia_minutos: 0 })).avisos;
    expect(a).toEqual([
      {
        tom: 'atencao',
        texto:
          'Sem tolerância, não há faixa grátis: entrada e saída no mesmo instante passam a cobrar a primeira faixa (R$ 5,00). Hoje saem grátis.',
      },
    ]);
  });

  it('fração inicial que não passa da tolerância: tabela ajustada, mesmo valor', () => {
    const r = contratoDeTarifa(tarifa({ tolerancia_minutos: 10, fracao_inicial_minutos: 10 }));
    expect(r.contrato.regras[0]!.faixas).toEqual([
      { ateMinutos: 10, valorCentavos: 0 },
      { ateMinutos: 25, valorCentavos: 800 },
    ]);
    expect(r.avisos.map((a) => a.texto)).toContain(
      'A fração inicial (0:10) não passa da tolerância (0:10): a primeira faixa paga virou “até 0:25” (R$ 8,00), para cobrar o mesmo que hoje. Confira no Simular.',
    );
  });
});

/**
 * Equivalência (spec, testing criteria): para tarifas SEM pernoite, o contrato
 * convertido cobra o mesmo que o motor v1 em minutos inteiros de 1 a 1440.
 * 0 min fica de fora (aviso da tolerância 0). Acima de 24 h depende do PR #6.
 */
describe('contratoDeTarifa — mesma cobrança que o motor v1 (1–1440 min)', () => {
  const entrada = new Date('2026-10-19T13:00:00Z');
  const grade: Array<[string, Partial<TarifaSim>]> = [];
  for (const tolerancia_minutos of [0, 5, 10, 15, 30]) {
    for (const [fi, fa] of [
      [15, 15],
      [60, 60],
      [30, 15],
      [10, 20],
      [5, 7],
      [0, 30],
    ] as const) {
      for (const teto_diaria of [0, 25, 60]) {
        grade.push([
          `tol ${tolerancia_minutos} · ${fi}/${fa} · teto ${teto_diaria}`,
          {
            tolerancia_minutos,
            fracao_inicial_minutos: fi,
            fracao_inicial_valor: 6.5,
            fracao_adicional_minutos: fa,
            fracao_adicional_valor: 2.25,
            teto_diaria,
          },
        ]);
      }
    }
  }

  it.each(grade)('%s', (_, parcial) => {
    const t = tarifa(parcial);
    const { contrato } = contratoDeTarifa(t);
    expect(validar(contrato)).toEqual([]);
    for (let min = 1; min <= 1440; min++) {
      const saida = new Date(entrada.getTime() + min * 60_000);
      const v1 = Math.round(calcularTarifa(entrada, saida, t).valor * 100);
      const v2 = calcular({ entrada, saida, contrato, fuso: FUSO }).totalCentavos;
      if (v1 !== v2) throw new Error(`${min} min: v1 ${v1} × contrato ${v2}`);
    }
  });
});
