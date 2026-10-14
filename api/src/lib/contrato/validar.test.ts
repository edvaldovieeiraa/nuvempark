import { describe, expect, it } from 'vitest';
import type { Contrato, Regra } from './modelo.js';
import { validar } from './validar.js';

/** Padrão + Noturno (como o C4 do golden): válido. */
function base(): Contrato {
  return {
    versao: 1,
    maisDe24h: false,
    diariaCentavos: null,
    cobrarMenorValor: false,
    regras: [
      regra({ nome: 'Padrão' }),
      regra({ nome: 'Noturno', inicio: 20 * 60, fim: 6 * 60, dias: [1, 2, 3, 4, 5, 6, 7] }),
    ],
  };
}

function regra(r: Partial<Regra>): Regra {
  return {
    nome: 'Padrão',
    inicio: null,
    fim: null,
    dias: null,
    usarMinutosPagos: false,
    recomecarTabela: false,
    faixas: [{ ateMinutos: 60, valorCentavos: 1000 }],
    fracao: { minutos: 60, valorCentavos: 500 },
    ...r,
  };
}

/** Códigos de erro (com caminho) de um contrato alterado a partir da base. */
function erros(muda: (c: Contrato) => void): string[] {
  const c = base();
  muda(c);
  return validar(c).map((e) => `${e.caminho}:${e.codigo}`);
}

describe('validar', () => {
  it('a base é válida', () => {
    expect(validar(base())).toEqual([]);
  });

  describe('regras', () => {
    it('sem nenhuma regra', () => {
      expect(erros((c) => (c.regras = []))).toEqual(['regras:sem_regras']);
    });

    it('a primeira precisa se chamar Padrão', () => {
      expect(erros((c) => (c.regras[0]!.nome = 'Geral'))).toEqual(['regras[0].nome:padrao_nome']);
    });

    it('Padrão não tem horário nem dias', () => {
      expect(erros((c) => (c.regras[0]!.inicio = 60))).toEqual(['regras[0]:padrao_com_horario']);
      expect(erros((c) => (c.regras[0]!.dias = [1]))).toEqual(['regras[0]:padrao_com_horario']);
    });

    it('Padrão não usa minutos pagos', () => {
      expect(erros((c) => (c.regras[0]!.usarMinutosPagos = true))).toEqual([
        'regras[0].usar_minutos_pagos:padrao_usar_minutos_pagos',
      ]);
    });

    it('nenhuma outra regra se chama Padrão', () => {
      expect(erros((c) => (c.regras[1]!.nome = 'Padrão'))).toEqual([
        'regras[1].nome:nome_padrao_repetido',
      ]);
    });

    it('nome vazio e nome repetido', () => {
      expect(erros((c) => (c.regras[1]!.nome = '  '))).toEqual(['regras[1].nome:nome_vazio']);
      expect(
        erros((c) =>
          c.regras.push(regra({ nome: 'Noturno', inicio: 8 * 60, fim: 9 * 60, dias: [1] })),
        ),
      ).toEqual(['regras[2].nome:nome_repetido']);
    });

    it('regra além da Padrão precisa de início, fim e dias', () => {
      expect(erros((c) => (c.regras[1]!.fim = null))).toEqual(['regras[1]:janela_incompleta']);
      expect(erros((c) => (c.regras[1]!.dias = []))).toEqual(['regras[1].dias:sem_dias']);
      expect(erros((c) => (c.regras[1]!.dias = null))).toEqual(['regras[1].dias:sem_dias']);
    });

    it('início igual ao fim é janela vazia', () => {
      expect(erros((c) => (c.regras[1]!.fim = 20 * 60))).toEqual(['regras[1]:janela_vazia']);
    });

    it('dia fora de 1–7 ou repetido', () => {
      expect(erros((c) => (c.regras[1]!.dias = [0, 1]))).toEqual(['regras[1].dias:dia_invalido']);
      expect(erros((c) => (c.regras[1]!.dias = [1, 1]))).toEqual(['regras[1].dias:dia_invalido']);
    });
  });

  describe('sobreposição', () => {
    it('duas regras no mesmo horário e dia', () => {
      expect(
        erros((c) => c.regras.push(regra({ nome: 'Madrugada', inicio: 2 * 60, fim: 4 * 60, dias: [2] }))),
      ).toEqual(['regras[2]:sobreposicao']);
    });

    it('a virada da meia-noite conta: Noturno de segunda invade a madrugada de terça', () => {
      expect(
        erros((c) => {
          c.regras[1]!.dias = [1];
          c.regras.push(regra({ nome: 'Terça cedo', inicio: 5 * 60, fim: 7 * 60, dias: [2] }));
        }),
      ).toEqual(['regras[2]:sobreposicao']);
    });

    it('domingo à noite invade segunda de manhã', () => {
      expect(
        erros((c) => {
          c.regras[1]!.dias = [7];
          c.regras.push(regra({ nome: 'Segunda cedo', inicio: 5 * 60, fim: 7 * 60, dias: [1] }));
        }),
      ).toEqual(['regras[2]:sobreposicao']);
    });

    it('janelas encostadas não se sobrepõem', () => {
      expect(
        erros((c) => c.regras.push(regra({ nome: 'Manhã', inicio: 6 * 60, fim: 9 * 60, dias: [1] }))),
      ).toEqual([]);
    });
  });

  describe('faixas e fração', () => {
    it('regra sem faixa', () => {
      expect(erros((c) => (c.regras[0]!.faixas = []))).toEqual(['regras[0].faixas:sem_faixas']);
    });

    it('faixa com menos de 1 minuto', () => {
      expect(erros((c) => (c.regras[0]!.faixas[0]!.ateMinutos = 0))).toEqual([
        'regras[0].faixas[0].ate_minutos:faixa_minimo',
      ]);
    });

    it('faixas fora de ordem', () => {
      expect(
        erros((c) => c.regras[0]!.faixas.push({ ateMinutos: 60, valorCentavos: 2000 })),
      ).toEqual(['regras[0].faixas[1].ate_minutos:faixa_fora_de_ordem']);
    });

    it('valor negativo e valor menor que o da faixa anterior', () => {
      expect(erros((c) => (c.regras[0]!.faixas[0]!.valorCentavos = -1))).toEqual([
        'regras[0].faixas[0].valor_centavos:valor_negativo',
      ]);
      expect(
        erros((c) => c.regras[0]!.faixas.push({ ateMinutos: 120, valorCentavos: 900 })),
      ).toEqual(['regras[0].faixas[1].valor_centavos:valor_menor_que_anterior']);
    });

    it('faixa acima de 23:59 sem "mais de 24 h"; até 999 h com', () => {
      expect(erros((c) => (c.regras[0]!.faixas[0]!.ateMinutos = 1440))).toEqual([
        'regras[0].faixas[0].ate_minutos:acima_do_limite',
      ]);
      expect(
        erros((c) => {
          c.maisDe24h = true;
          c.regras = [c.regras[0]!];
          c.regras[0]!.faixas[0]!.ateMinutos = 999 * 60;
        }),
      ).toEqual([]);
      expect(
        erros((c) => {
          c.maisDe24h = true;
          c.regras = [c.regras[0]!];
          c.regras[0]!.faixas[0]!.ateMinutos = 999 * 60 + 1;
        }),
      ).toEqual(['regras[0].faixas[0].ate_minutos:acima_do_limite']);
    });

    it('fração com menos de 1 minuto, acima do limite ou valor negativo', () => {
      expect(erros((c) => (c.regras[0]!.fracao = { minutos: 0, valorCentavos: 500 }))).toEqual([
        'regras[0].fracao.minutos:fracao_minimo',
      ]);
      expect(erros((c) => (c.regras[0]!.fracao = { minutos: 1440, valorCentavos: 500 }))).toEqual([
        'regras[0].fracao.minutos:acima_do_limite',
      ]);
      expect(erros((c) => (c.regras[0]!.fracao = { minutos: 60, valorCentavos: -5 }))).toEqual([
        'regras[0].fracao.valor_centavos:valor_negativo',
      ]);
    });

    it('sem fração nem recomeço não sabe cobrar depois da última faixa', () => {
      expect(erros((c) => (c.regras[0]!.fracao = null))).toEqual([
        'regras[0].fracao:sem_fracao_nem_recomeco',
      ]);
    });

    it('recomeço não convive com fração', () => {
      expect(erros((c) => (c.regras[0]!.recomecarTabela = true))).toEqual([
        'regras[0].fracao:recomeco_com_fracao',
      ]);
    });
  });

  describe('opções do contrato', () => {
    it('"mais de 24 h" não convive com diária nem com várias regras', () => {
      expect(
        erros((c) => {
          c.maisDe24h = true;
          c.regras = [c.regras[0]!];
          c.diariaCentavos = 4000;
        }),
      ).toEqual(['diaria_centavos:mais_de_24h_com_diaria']);
      expect(erros((c) => (c.maisDe24h = true))).toEqual(['regras:mais_de_24h_com_regras']);
    });

    it('"cobrar menor valor" só com 2+ regras', () => {
      expect(
        erros((c) => {
          c.regras = [c.regras[0]!];
          c.cobrarMenorValor = true;
        }),
      ).toEqual(['cobrar_menor_valor:menor_valor_sem_regras']);
    });

    it('diária precisa ser maior que zero', () => {
      expect(
        erros((c) => {
          c.regras = [c.regras[0]!];
          c.diariaCentavos = 0;
        }),
      ).toEqual(['diaria_centavos:diaria_invalida']);
    });
  });

  // Combinações que os 45 casos do CloudPark não provam (spec, tabela a–f).
  // Recusadas até serem simuladas — plano, Fase 0.
  describe('não provado no CloudPark', () => {
    it('(a) recomeçar a tabela numa regra por horário', () => {
      expect(
        erros((c) => {
          c.regras[1]!.recomecarTabela = true;
          c.regras[1]!.fracao = null;
        }),
      ).toEqual(['regras[1].recomecar_tabela:nao_provado_recomeco_em_regra']);
    });

    it('(b/c) diária com regras por horário', () => {
      expect(erros((c) => (c.diariaCentavos = 4000))).toEqual([
        'diaria_centavos:nao_provado_diaria_com_regras',
      ]);
    });

    it('(f) minutos pagos com mais de uma regra por horário', () => {
      expect(
        erros((c) => {
          c.regras[1]!.usarMinutosPagos = true;
          c.regras.push(regra({ nome: 'Manhã', inicio: 7 * 60, fim: 9 * 60, dias: [1] }));
        }),
      ).toEqual(['regras[1].usar_minutos_pagos:nao_provado_minutos_pagos_com_regras']);
    });

    it('minutos pagos com uma regra só é o caso provado (C5)', () => {
      expect(erros((c) => (c.regras[1]!.usarMinutosPagos = true))).toEqual([]);
    });
  });
});
