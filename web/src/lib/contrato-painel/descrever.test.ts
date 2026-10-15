import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lerContrato, type Contrato } from '../contrato';
import { campoDoInstante, exemploDaRegra, instanteDoCampo, resumoContrato, simular } from './descrever';

const FUSO = 'America/Sao_Paulo';

const golden = JSON.parse(
  readFileSync(new URL('../../../../golden/tarifa-contrato.json', import.meta.url), 'utf8'),
) as {
  contratos: Record<string, unknown>;
  casos: Array<{ id: string; contrato: string; entrada: string; saida: string; total_centavos: number }>;
};
const contrato = (nome: string): Contrato => lerContrato(golden.contratos[nome]);

function caso(id: string) {
  const c = golden.casos.find((x) => x.id === id)!;
  const r = simular({
    entrada: new Date(c.entrada),
    saida: new Date(c.saida),
    contrato: contrato(c.contrato),
    fuso: FUSO,
  });
  if (!r.ok) throw new Error(r.mensagem);
  expect(r.resultado.totalCentavos).toBe(c.total_centavos);
  return r.memoria;
}

const linhas = (m: ReturnType<typeof caso>) =>
  m.linhas.map((l) => `${l.titulo} | ${l.valorCentavos} | ${l.detalhe}`);

describe('memória de cálculo — casos do golden', () => {
  it('S24: Padrão e Noturno, paga até o fim da janela', () => {
    const m = caso('S24');
    expect(m.motivo).toBe('Por regras de horário · 2 fatias');
    expect(linhas(m)).toEqual([
      'Padrão | 1000 | seg 19:00 → 20:00 · 1h00 na faixa “até 1:00”',
      'Noturno | 2500 | seg 20:00 → ter 06:00 · 1h00 na faixa “até 12:00”, paga até o fim da janela (06:00)',
    ]);
    expect(m.permanencia).toBe('2h00');
    expect(m.pagoAte).toBe('ter 20/10 06:00');
    expect(m.restam).toBe('9h00');
    expect(m.avisos).toEqual([]);
  });

  it('S27: Noturno e depois a Padrão com fração', () => {
    expect(linhas(caso('S27'))).toEqual([
      'Noturno | 2500 | ter 05:00 → 06:00 · 1h00 na faixa “até 12:00”, paga até o fim da janela (06:00)',
      'Padrão | 1500 | ter 06:00 → 08:00 · 2h00 · última faixa “até 1:00” + 1 fração de 1:00',
    ]);
  });

  it('S31: minutos pagos passam do fim da janela', () => {
    const m = caso('S31');
    expect(m.motivo).toBe('Por regras de horário · 1 fatia');
    expect(linhas(m)).toEqual([
      'Noturno | 2500 | seg 22:00 → ter 10:00 · 8h00 na faixa “até 12:00”, paga até 10:00 (usa todos os minutos pagos)',
    ]);
  });

  it('S16: diárias cheias e a tabela na sobra', () => {
    const m = caso('S16');
    expect(m.motivo).toBe('Diária');
    expect(linhas(m)).toEqual([
      'Diárias | 8000 | seg 10:00 → qua 10:00 · 2 diárias de R$ 40,00 (24 h corridas desde a entrada)',
      'Padrão | 1000 | qua 10:00 → 11:00 · 1h00 na faixa “até 1:00”',
    ]);
    expect(m.avisos).toEqual([]);
  });

  it('S10: a diária ganha da tabela e avisa', () => {
    const m = caso('S10');
    expect(linhas(m)).toEqual([
      'Diária | 4000 | seg 08:00 → ter 08:00 · 1 diária de R$ 40,00 (24 h corridas desde a entrada)',
    ]);
    expect(m.avisos).toEqual([
      'A diária (R$ 40,00) não sai mais cara que a tabela (R$ 75,00) e cobre mais tempo.',
    ]);
  });

  it('S22: ciclos da tabela', () => {
    const m = caso('S22');
    expect(m.motivo).toBe('Só a Padrão');
    expect(linhas(m)).toEqual([
      'Padrão | 6000 | seg 10:00 → 19:00 · 7h30 · 2 ciclos da tabela (R$ 40,00) + faixa “até 3:00”',
    ]);
  });

  it('S53: faixas de mais de 24 h', () => {
    expect(linhas(caso('S53'))).toEqual([
      'Padrão | 10000 | seg 10:00 → qui 10:00 · 2 dias 1h00 · última faixa “até 48:00” + 1 fração de 24:00',
    ]);
  });

  it('Padrão cortada pelo começo da regra seguinte', () => {
    // C4, 18:30 → 18:45 + … : Padrão de 19:30 a 20:00 fica paga só até 20:00.
    const r = simular({
      entrada: new Date('2026-10-19T22:30:00Z'),
      saida: new Date('2026-10-19T23:30:00Z'),
      contrato: contrato('C4'),
      fuso: FUSO,
    });
    if (!r.ok) throw new Error(r.mensagem);
    expect(r.memoria.linhas[0]?.detalhe).toBe(
      'seg 19:30 → 20:00 · 30 min na faixa “até 1:00”, paga até o começo do Noturno (20:00)',
    );
  });

  it('menor valor escolheu a Padrão (C6, 19:00 → 21:00)', () => {
    const r = simular({
      entrada: new Date('2026-10-19T22:00:00Z'),
      saida: new Date('2026-10-20T00:00:00Z'),
      contrato: contrato('C6'),
      fuso: FUSO,
    });
    if (!r.ok) throw new Error(r.mensagem);
    expect(r.resultado.totalCentavos).toBe(1500);
    expect(r.memoria.motivo).toBe('Menor valor: só pela Padrão');
    expect(r.memoria.avisos).toEqual([
      'Ficou com a cobrança só pela Padrão (R$ 15,00), menor que com as regras (R$ 35,00).',
    ]);
  });

  it('todos os casos do golden geram memória com a soma igual ao total', () => {
    for (const c of golden.casos) {
      const r = simular({
        entrada: new Date(c.entrada),
        saida: new Date(c.saida),
        contrato: contrato(c.contrato),
        fuso: FUSO,
      });
      expect(r.ok, c.id).toBe(true);
      if (!r.ok) continue;
      const soma = r.memoria.linhas.reduce((s, l) => s + l.valorCentavos, 0);
      expect(soma, c.id).toBe(c.total_centavos);
      for (const l of r.memoria.linhas) expect(l.detalhe, c.id).not.toMatch(/NaN|undefined/);
    }
  });
});

describe('simular — erros viram mensagem', () => {
  const base = { contrato: contrato('C1'), fuso: FUSO };

  it('saída antes da entrada', () => {
    expect(
      simular({ ...base, entrada: new Date('2026-10-19T13:00:00Z'), saida: new Date('2026-10-19T12:00:00Z') }),
    ).toEqual({ ok: false, mensagem: 'A saída não pode ser antes da entrada.' });
  });

  it('saída igual à entrada é aceita', () => {
    const d = new Date('2026-10-19T13:00:00Z');
    const r = simular({ ...base, entrada: d, saida: d });
    expect(r.ok && r.resultado.totalCentavos).toBe(0);
  });

  it('mais de 10 anos', () => {
    expect(
      simular({ ...base, entrada: new Date('2015-01-01T00:00:00Z'), saida: new Date('2026-10-19T12:00:00Z') }),
    ).toEqual({ ok: false, mensagem: 'A estadia passa de 10 anos: confira as datas.' });
  });

  it('data inválida', () => {
    expect(simular({ ...base, entrada: new Date('x'), saida: new Date() })).toEqual({
      ok: false,
      mensagem: 'Informe a data e a hora de entrada e de saída.',
    });
  });

  it('contrato inválido', () => {
    const c = contrato('C1');
    const r = simular({
      ...base,
      contrato: { ...c, regras: [] },
      entrada: new Date('2026-10-19T12:00:00Z'),
      saida: new Date('2026-10-19T13:00:00Z'),
    });
    expect(r).toEqual({ ok: false, mensagem: 'O contrato tem erros: corrija antes de simular.' });
  });
});

describe('campos de data do simulador no fuso do pátio', () => {
  it('"2026-10-19T19:00" é 19:00 de Brasília, não do navegador', () => {
    expect(instanteDoCampo('2026-10-19T19:00', FUSO)?.toISOString()).toBe('2026-10-19T22:00:00.000Z');
    expect(instanteDoCampo('', FUSO)).toBeNull();
    expect(instanteDoCampo('2026-13-40T99:00', FUSO)).toBeNull();
  });

  it('campoDoInstante faz o caminho de volta', () => {
    expect(campoDoInstante(new Date('2026-10-19T22:00:00Z'), FUSO)).toBe('2026-10-19T19:00');
  });
});

describe('exemploDaRegra (exemplo ao vivo do editor)', () => {
  it('com fração', () => {
    expect(exemploDaRegra(contrato('C4').regras[0]!)).toBe('2h30 = R$ 20,00');
  });

  it('com recomeçar mostra os ciclos', () => {
    expect(exemploDaRegra(contrato('C3').regras[0]!)).toBe(
      '4h00 = 1 ciclo R$ 20,00 + até 1:00 R$ 10,00 = R$ 30,00',
    );
  });

  it('regra incompleta não tem exemplo', () => {
    expect(exemploDaRegra({ ...contrato('C1').regras[0]!, faixas: [] })).toBeNull();
    expect(exemploDaRegra({ ...contrato('C1').regras[0]!, fracao: null })).toBeNull();
  });
});

describe('resumoContrato (lista de Tarifas)', () => {
  it.each([
    ['C1', 'Só a Padrão: 3 faixas, depois R$ 5,00 a cada 1:00'],
    ['C2', 'Só a Padrão: 3 faixas, depois R$ 5,00 a cada 1:00 · diária R$ 40,00'],
    ['C3', 'Só a Padrão: 2 faixas, depois recomeça a tabela'],
    ['C4', 'Padrão + Noturno (20:00–06:00, todos os dias)'],
    ['C6', 'Padrão + Noturno (20:00–06:00, todos os dias) · menor valor'],
    ['C7', 'Padrão + FDS (00:00–23:59, sáb e dom)'],
    ['C10', 'Só a Padrão: 2 faixas, depois R$ 30,00 a cada 24:00 · mais de 24 h'],
  ])('%s', (nome, texto) => {
    expect(resumoContrato(contrato(nome))).toBe(texto);
  });

  it('várias regras por horário', () => {
    const c4 = contrato('C4');
    const outra = { ...c4.regras[1]!, nome: 'Almoço', inicio: 720, fim: 840, dias: [1, 2, 3, 4, 5] };
    expect(resumoContrato({ ...c4, regras: [...c4.regras, outra] })).toBe(
      'Padrão + Noturno (20:00–06:00, todos os dias) + Almoço (12:00–14:00, seg a sex)',
    );
  });
});
