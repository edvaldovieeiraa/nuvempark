import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lerContrato, validar, type Contrato, type Regra } from '../contrato';
import {
  adicionarRegra,
  formDeContrato,
  formVazio,
  idCampo,
  lerForm,
  removerRegra,
  sobreposicoes,
  type ContratoForm,
} from './editor';

const golden = JSON.parse(
  readFileSync(new URL('../../../../golden/tarifa-contrato.json', import.meta.url), 'utf8'),
) as { contratos: Record<string, unknown> };
const contrato = (nome: string) => lerContrato(golden.contratos[nome]);

const mudar = (f: ContratoForm, fn: (f: ContratoForm) => void): ContratoForm => {
  const c = structuredClone(f);
  fn(c);
  return c;
};

describe('formulário ↔ contrato', () => {
  it.each(Object.keys(golden.contratos))('%s: ida e volta', (nome) => {
    const c = contrato(nome);
    const r = lerForm(formDeContrato(c));
    expect(r.erros).toEqual([]);
    expect(r.contrato).toEqual(c);
  });

  it('textos do formulário no formato do gestor', () => {
    const f = formDeContrato(contrato('C4'));
    expect(f.regras[1]).toMatchObject({
      nome: 'Noturno',
      inicio: '20:00',
      fim: '06:00',
      dias: [1, 2, 3, 4, 5, 6, 7],
      faixas: [{ ate: '12:00', valor: '25,00' }],
      fracaoMinutos: '1:00',
      fracaoValor: '5,00',
    });
    expect(f.diariaLigada).toBe(false);
    const c2 = formDeContrato(contrato('C2'));
    expect(c2.diariaLigada).toBe(true);
    expect(c2.diaria).toBe('40,00');
  });

  it('cada regra tem um id estável e único (chave do React)', () => {
    const f = formDeContrato(contrato('C4'));
    expect(new Set(f.regras.map((r) => r.id)).size).toBe(2);
  });

  it('formulário vazio: só a Padrão, válido', () => {
    const f = formVazio();
    expect(f.regras).toHaveLength(1);
    const r = lerForm(f);
    expect(r.erros).toEqual([]);
    expect(r.contrato?.regras[0]?.nome).toBe('Padrão');
  });

  it('nome da regra é gravado sem espaços nas pontas', () => {
    const f = mudar(formDeContrato(contrato('C4')), (x) => (x.regras[1]!.nome = '  Noturno '));
    expect(lerForm(f).contrato?.regras[1]?.nome).toBe('Noturno');
  });

  it('recomeçar ignora a fração digitada', () => {
    const f = mudar(formVazio(), (x) => (x.regras[0]!.recomecarTabela = true));
    expect(lerForm(f).contrato?.regras[0]?.fracao).toBeNull();
  });

  it('diária desligada ignora o valor digitado', () => {
    const f = mudar(formVazio(), (x) => (x.diaria = 'abc'));
    expect(lerForm(f).contrato?.diariaCentavos).toBeNull();
  });
});

describe('erros no campo certo', () => {
  it('formato inválido: código, caminho, id e mensagem; contrato nulo', () => {
    const f = mudar(formVazio(), (x) => (x.regras[0]!.faixas[0]!.valor = '10,555'));
    const r = lerForm(f);
    expect(r.contrato).toBeNull();
    expect(r.erros).toEqual([
      {
        caminho: 'regras[0].faixas[0].valor_centavos',
        codigo: 'formato_valor',
        campo: 'ct-r0-f0-valor',
        mensagem: 'Use reais com vírgula, ex.: 10,50.',
      },
    ]);
  });

  it('um campo ilegível não gera erro falso nos vizinhos', () => {
    const f = mudar(formDeContrato(contrato('C1')), (x) => (x.regras[0]!.faixas[1]!.ate = '1h'));
    expect(lerForm(f).erros.map((e) => e.codigo)).toEqual(['formato_hora']);
  });

  it('faixas fora de ordem citam a anterior', () => {
    const f = mudar(formDeContrato(contrato('C1')), (x) => (x.regras[0]!.faixas[2]!.ate = '0:45'));
    expect(lerForm(f).erros).toEqual([
      {
        caminho: 'regras[0].faixas[2].ate_minutos',
        codigo: 'faixa_fora_de_ordem',
        campo: 'ct-r0-f2-ate',
        mensagem: 'As faixas precisam crescer: esta tem que passar de 1:00.',
      },
    ]);
  });

  it('valor menor que o anterior cita o valor', () => {
    const f = mudar(formDeContrato(contrato('C1')), (x) => (x.regras[0]!.faixas[2]!.valor = '5,00'));
    expect(lerForm(f).erros[0]?.mensagem).toBe(
      'O valor é o total até aqui: não pode ser menor que o da faixa anterior (R$ 10,00).',
    );
  });

  it('24:00 sem "mais de 24 horas" é erro; com a opção, não', () => {
    const base = mudar(formVazio(), (x) => (x.regras[0]!.faixas[0]!.ate = '24:00'));
    expect(lerForm(base).erros[0]).toMatchObject({
      codigo: 'acima_do_limite',
      mensagem: expect.stringContaining('Máximo 23:59'),
    });
    expect(lerForm({ ...base, maisDe24h: true }).erros).toEqual([]);
    const muito = mudar(base, (x) => {
      x.maisDe24h = true;
      x.regras[0]!.faixas[0]!.ate = '999:01';
    });
    expect(lerForm(muito).erros[0]?.mensagem).toBe('Máximo 999:00.');
  });

  it('janela: vazia → do validar; hora inválida → do formato', () => {
    const f = adicionarRegra(formVazio()).form;
    const vazia = mudar(f, (x) => {
      x.regras[1]!.inicio = '';
      x.regras[1]!.fim = '';
    });
    expect(lerForm(vazia).erros.map((e) => [e.codigo, e.campo])).toContainEqual([
      'janela_incompleta',
      'ct-r1-inicio',
    ]);
    const invalida = mudar(f, (x) => (x.regras[1]!.fim = '25:00'));
    expect(lerForm(invalida).erros.map((e) => [e.codigo, e.campo])).toContainEqual([
      'hora_do_dia',
      'ct-r1-fim',
    ]);
  });

  it('sobreposição nomeia a outra regra, o dia e a hora', () => {
    const f = mudar(adicionarRegra(formDeContrato(contrato('C4'))).form, (x) => {
      Object.assign(x.regras[2]!, { nome: 'Madrugada', inicio: '02:00', fim: '05:00', dias: [2] });
    });
    const erro = lerForm(f).erros.find((e) => e.codigo === 'sobreposicao');
    expect(erro).toMatchObject({ campo: 'ct-r2-inicio' });
    expect(erro?.mensagem).toBe(
      'O Noturno de segunda (20:00–06:00) ainda vale às 02:00 de terça. Duas regras não podem cobrir o mesmo horário.',
    );
  });

  it('nao_provado_* sai com a mensagem de "ainda não suportado"', () => {
    const f = mudar(adicionarRegra(formVazio()).form, (x) => (x.regras[1]!.recomecarTabela = true));
    expect(lerForm(f).erros.map((e) => e.codigo)).toContain('nao_provado_recomeco_em_regra');
  });
});

describe('idCampo', () => {
  it.each([
    ['regras[1].nome', 'ct-r1-nome'],
    ['regras[1]', 'ct-r1-inicio'],
    ['regras[1].inicio', 'ct-r1-inicio'],
    ['regras[1].fim', 'ct-r1-fim'],
    ['regras[1].dias', 'ct-r1-dias'],
    ['regras[0].faixas', 'ct-r0-faixas'],
    ['regras[0].faixas[3].ate_minutos', 'ct-r0-f3-ate'],
    ['regras[0].faixas[3].valor_centavos', 'ct-r0-f3-valor'],
    ['regras[0].fracao', 'ct-r0-depois'],
    ['regras[0].recomecar_tabela', 'ct-r0-depois'],
    ['regras[0].fracao.minutos', 'ct-r0-fracao-min'],
    ['regras[0].fracao.valor_centavos', 'ct-r0-fracao-valor'],
    ['regras[2].usar_minutos_pagos', 'ct-r2-pagos'],
    ['diaria_centavos', 'ct-diaria'],
    ['cobrar_menor_valor', 'ct-menor'],
    ['mais_de_24h', 'ct-mais24'],
    ['regras', 'ct-regras'],
    ['contrato', 'ct-regras'],
  ])('%s → %s', (caminho, id) => {
    expect(idCampo(caminho)).toBe(id);
  });
});

describe('adicionar e remover regra', () => {
  it('adiciona uma regra por horário com nome sugerido', () => {
    const { form, avisos } = adicionarRegra(formVazio());
    expect(form.regras).toHaveLength(2);
    expect(form.regras[1]!.nome).toBe('Regra 1');
    expect(avisos).toEqual([]);
  });

  it('a 2ª regra por horário desmarca os minutos pagos, com aviso', () => {
    const um = formDeContrato(contrato('C5'));
    const { form, avisos } = adicionarRegra(um);
    expect(form.regras[1]!.usarMinutosPagos).toBe(false);
    expect(avisos).toHaveLength(1);
  });

  it('remover a última regra desliga o menor valor, com aviso', () => {
    const { form, avisos } = removerRegra(formDeContrato(contrato('C6')), 1);
    expect(form.regras).toHaveLength(1);
    expect(form.cobrarMenorValor).toBe(false);
    expect(avisos).toEqual(['Cobrar o menor valor foi desligado: não há regra para comparar.']);
  });

  it('a Padrão não sai', () => {
    const f = formVazio();
    expect(removerRegra(f, 0).form).toBe(f);
  });
});

describe('sobreposicoes — mesma decisão que o validar', () => {
  const JANELAS: Array<[number, number]> = [
    [1200, 360],
    [120, 300],
    [0, 1439],
    [720, 780],
    [1320, 120],
    [1380, 60],
  ];
  const DIAS = [[1], [2], [7], [1, 2, 3, 4, 5, 6, 7], [6, 7], [1, 7]];

  const regra = (i: number, j: [number, number], dias: number[]): Regra => ({
    nome: `R${i}`,
    inicio: j[0],
    fim: j[1],
    dias,
    usarMinutosPagos: false,
    recomecarTabela: false,
    faixas: [{ ateMinutos: 60, valorCentavos: 100 }],
    fracao: { minutos: 60, valorCentavos: 100 },
  });

  it('em todas as combinações de duas e três regras', () => {
    const padrao = contrato('C1').regras[0]!;
    let comparacoes = 0;
    for (const [a, ja] of JANELAS.entries()) {
      for (const [b, jb] of JANELAS.entries()) {
        for (const da of DIAS) {
          for (const db of DIAS) {
            for (const terceira of [null, regra(3, JANELAS[(a + b) % JANELAS.length]!, [3])]) {
              const regras = [padrao, regra(1, ja, da), regra(2, jb, db)];
              if (terceira) regras.push(terceira);
              const c: Contrato = { ...contrato('C1'), regras };
              const doValidar = validar(c)
                .filter((e) => e.codigo === 'sobreposicao')
                .map((e) => Number(/\d+/.exec(e.caminho)![0]));
              expect([...sobreposicoes(regras).keys()].sort()).toEqual(doValidar);
              comparacoes++;
            }
          }
        }
      }
    }
    expect(comparacoes).toBeGreaterThan(1000);
  });
});
