import { describe, expect, it } from 'vitest';
import { validar, type Contrato } from '../contrato';
import {
  adicionarFaixa,
  ajustar,
  disponibilidade,
  type Estrutura,
} from './exclusoes';

type R = { usarMinutosPagos: boolean; recomecarTabela: boolean };
type E = { maisDe24h: boolean; diariaLigada: boolean; cobrarMenorValor: boolean; regras: R[] };

const regra = (r: Partial<R> = {}): R => ({ usarMinutosPagos: false, recomecarTabela: false, ...r });
const estado = (e: Partial<E> = {}): E => ({
  maisDe24h: false,
  diariaLigada: false,
  cobrarMenorValor: false,
  regras: [regra()],
  ...e,
});

describe('disponibilidade — tabela "Exclusões mútuas" do design', () => {
  it('só a Padrão: tudo livre, menos o menor valor', () => {
    const d = disponibilidade(estado());
    expect(d.diaria).toBeNull();
    expect(d.maisDe24h).toBeNull();
    expect(d.adicionarRegra).toBeNull();
    expect(d.menorValor).toEqual({
      tom: 'regra',
      motivo: 'Precisa de pelo menos uma regra por horário para comparar.',
    });
  });

  it('diária com regra por horário: âmbar', () => {
    expect(disponibilidade(estado({ regras: [regra(), regra()] })).diaria).toEqual({
      tom: 'nao_suportado',
      motivo: 'Indisponível com regra por horário: ainda não suportado.',
    });
  });

  it('diária com mais de 24 h: cinza', () => {
    expect(disponibilidade(estado({ maisDe24h: true })).diaria).toEqual({
      tom: 'regra',
      motivo: 'Não combina com faixas de mais de 24 horas.',
    });
  });

  it('mais de 24 h com regra por horário ou com diária: cinza', () => {
    const motivo = { tom: 'regra', motivo: 'Só com a regra Padrão e sem diária.' };
    expect(disponibilidade(estado({ regras: [regra(), regra()] })).maisDe24h).toEqual(motivo);
    expect(disponibilidade(estado({ diariaLigada: true })).maisDe24h).toEqual(motivo);
  });

  it('menor valor livre com uma regra por horário', () => {
    expect(disponibilidade(estado({ regras: [regra(), regra()] })).menorValor).toBeNull();
  });

  it('adicionar regra: diária (âmbar), mais de 24 h (cinza), 20 regras (cinza)', () => {
    expect(disponibilidade(estado({ diariaLigada: true })).adicionarRegra).toEqual({
      tom: 'nao_suportado',
      motivo:
        'Desligue a diária para adicionar regra por horário: os dois juntos ainda não são suportados.',
    });
    expect(disponibilidade(estado({ maisDe24h: true })).adicionarRegra).toEqual({
      tom: 'regra',
      motivo: 'Regras por horário não combinam com faixas de mais de 24 horas.',
    });
    expect(
      disponibilidade(estado({ regras: Array.from({ length: 20 }, () => regra()) })).adicionarRegra,
    ).toEqual({ tom: 'regra', motivo: 'Máximo de 20 regras.' });
  });

  it('adicionar faixa: máximo de 50', () => {
    expect(adicionarFaixa(49)).toBeNull();
    expect(adicionarFaixa(50)).toEqual({ tom: 'regra', motivo: 'Máximo de 50 faixas.' });
  });

  it('recomeçar: livre na Padrão, âmbar em regra por horário', () => {
    const d = disponibilidade(estado({ regras: [regra(), regra()] }));
    expect(d.recomecar(0)).toBeNull();
    expect(d.recomecar(1)).toEqual({
      tom: 'nao_suportado',
      motivo: 'Recomeçar a tabela numa regra por horário ainda não é suportado.',
    });
  });

  it('minutos pagos: não existe na Padrão; âmbar com 2+ regras por horário', () => {
    expect(disponibilidade(estado({ regras: [regra(), regra()] })).minutosPagos(1)).toBeNull();
    expect(disponibilidade(estado()).minutosPagos(0)).toBe('ausente');
    expect(
      disponibilidade(estado({ regras: [regra(), regra(), regra()] })).minutosPagos(2),
    ).toEqual({
      tom: 'nao_suportado',
      motivo: 'Ainda não suportado com mais de uma regra por horário.',
    });
  });
});

describe('ajustar — mudanças automáticas', () => {
  it('sem regra por horário, desliga o menor valor e avisa', () => {
    const r = ajustar(estado({ cobrarMenorValor: true }));
    expect(r.estado.cobrarMenorValor).toBe(false);
    expect(r.avisos).toEqual([
      'Cobrar o menor valor foi desligado: não há regra para comparar.',
    ]);
  });

  it('com a 2ª regra por horário, desmarca os minutos pagos e avisa', () => {
    const r = ajustar(
      estado({ regras: [regra(), regra({ usarMinutosPagos: true }), regra()] }),
    );
    expect(r.estado.regras.map((x) => x.usarMinutosPagos)).toEqual([false, false, false]);
    expect(r.avisos).toEqual([
      '“Usar todos os minutos pagos” foi desmarcado: ainda não é suportado com mais de uma regra por horário.',
    ]);
  });

  it('estado válido não muda e não avisa', () => {
    const e = estado({ cobrarMenorValor: true, regras: [regra(), regra({ usarMinutosPagos: true })] });
    const r = ajustar(e);
    expect(r.estado).toBe(e);
    expect(r.avisos).toEqual([]);
  });

  it('preserva os outros campos do tipo do chamador', () => {
    const e = { ...estado({ cobrarMenorValor: true }), nome: 'x', regras: [{ ...regra(), id: 'a' }] };
    const r = ajustar(e);
    expect(r.estado.nome).toBe('x');
    expect(r.estado.regras[0]!.id).toBe('a');
  });
});

/**
 * Propriedade: todo estado que o editor deixa alcançar (só ligando o que está
 * disponível, com `ajustar` depois de cada mudança) vira um contrato que o
 * motor aceita — nunca um `nao_provado_*` nem uma combinação proibida.
 */
describe('nenhum caminho do editor chega a uma combinação recusada', () => {
  const PROIBIDOS = /^(nao_provado_|mais_de_24h_|menor_valor_sem_regras|regras_demais)/;

  function contratoDe(e: E): Contrato {
    return {
      versao: 1,
      maisDe24h: e.maisDe24h,
      diariaCentavos: e.diariaLigada ? 4000 : null,
      cobrarMenorValor: e.cobrarMenorValor,
      regras: e.regras.map((r, i) => ({
        nome: i === 0 ? 'Padrão' : `R${i}`,
        inicio: i === 0 ? null : i * 60,
        fim: i === 0 ? null : i * 60 + 30,
        dias: i === 0 ? null : [1],
        usarMinutosPagos: r.usarMinutosPagos,
        recomecarTabela: r.recomecarTabela,
        faixas: [{ ateMinutos: 60, valorCentavos: 1000 }],
        fracao: r.recomecarTabela ? null : { minutos: 60, valorCentavos: 500 },
      })),
    };
  }

  function vizinhos(e: E): E[] {
    const d = disponibilidade(e);
    const saida: E[] = [];
    const push = (x: E) => saida.push(ajustar(x).estado);
    if (e.diariaLigada || !d.diaria) push({ ...e, diariaLigada: !e.diariaLigada });
    if (e.maisDe24h || !d.maisDe24h) push({ ...e, maisDe24h: !e.maisDe24h });
    if (e.cobrarMenorValor || !d.menorValor) push({ ...e, cobrarMenorValor: !e.cobrarMenorValor });
    if (!d.adicionarRegra && e.regras.length < 4) push({ ...e, regras: [...e.regras, regra()] });
    e.regras.forEach((r, i) => {
      if (i > 0) push({ ...e, regras: e.regras.filter((_, j) => j !== i) });
      const troca = (novo: R) => ({ ...e, regras: e.regras.map((x, j) => (j === i ? novo : x)) });
      if (r.recomecarTabela || !d.recomecar(i)) {
        push(troca({ ...r, recomecarTabela: !r.recomecarTabela }));
      }
      const pagos = d.minutosPagos(i);
      if (pagos !== 'ausente' && (r.usarMinutosPagos || !pagos)) {
        push(troca({ ...r, usarMinutosPagos: !r.usarMinutosPagos }));
      }
    });
    return saida;
  }

  it('busca em largura sobre os estados alcançáveis', () => {
    const vistos = new Map<string, E>();
    const fila: E[] = [estado()];
    while (fila.length > 0) {
      const e = fila.shift()!;
      const chave = JSON.stringify(e);
      if (vistos.has(chave)) continue;
      vistos.set(chave, e);
      fila.push(...vizinhos(e));
    }
    expect(vistos.size).toBeGreaterThan(20);
    for (const e of vistos.values()) {
      const proibidos = validar(contratoDe(e)).filter((x) => PROIBIDOS.test(x.codigo));
      expect(proibidos, JSON.stringify(e)).toEqual([]);
    }
  });

  it('o tipo Estrutura aceita o estado de teste', () => {
    const e: Estrutura = estado();
    expect(e.regras).toHaveLength(1);
  });
});
