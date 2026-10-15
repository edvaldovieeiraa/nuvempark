import { describe, expect, it } from 'vitest';
import {
  brl,
  centavosParaTexto,
  duracaoTexto,
  horaDoDia,
  horaParaMinutos,
  minutosParaHora,
  MAX_CENTAVOS,
  textoParaCentavos,
} from './formato';

describe('textoParaCentavos', () => {
  it.each([
    ['10,50', 1050],
    ['10', 1000],
    ['0,5', 50],
    ['0,05', 5],
    [' 7,00 ', 700],
    ['R$ 12,30', 1230],
    ['1.000,00', 100000],
    ['1.000', 100000],
    // O formulário avulso usa "5.00" como padrão: ponto com 1–2 casas é decimal.
    ['5.00', 500],
    ['5.5', 550],
    ['0', 0],
    ['99.999,99', MAX_CENTAVOS],
  ])('%s → %i', (texto, centavos) => {
    expect(textoParaCentavos(texto)).toEqual({ ok: true, centavos });
  });

  it.each([
    ['', 'valor_vazio'],
    ['   ', 'valor_vazio'],
    ['abc', 'formato_valor'],
    ['10,555', 'formato_valor'],
    ['1,2,3', 'formato_valor'],
    ['10.5.5', 'formato_valor'],
    ['-5', 'valor_negativo'],
    ['-0,50', 'valor_negativo'],
    ['100.000,00', 'valor_maximo'],
  ])('%s → erro %s', (texto, codigo) => {
    expect(textoParaCentavos(texto)).toEqual({ ok: false, codigo });
  });
});

describe('centavosParaTexto e brl', () => {
  it('volta ao formato do campo, sem prefixo nem milhar', () => {
    expect(centavosParaTexto(1050)).toBe('10,50');
    expect(centavosParaTexto(0)).toBe('0,00');
    expect(centavosParaTexto(100000)).toBe('1000,00');
  });

  it('ida e volta', () => {
    for (const c of [0, 1, 99, 1000, 123456, MAX_CENTAVOS]) {
      expect(textoParaCentavos(centavosParaTexto(c))).toEqual({ ok: true, centavos: c });
    }
  });

  it('brl formata em reais', () => {
    expect(brl(1050).replace(/\s/g, ' ')).toBe('R$ 10,50');
    expect(brl(100000).replace(/\s/g, ' ')).toBe('R$ 1.000,00');
  });
});

describe('horaParaMinutos (faixas e fração)', () => {
  it.each([
    ['0:15', 15],
    ['00:15', 15],
    ['1:00', 60],
    ['23:59', 1439],
    // Passar de 23:59 é decisão do `validar` (acima_do_limite), não do formato.
    ['24:00', 1440],
    ['48:00', 2880],
    ['999:00', 59940],
    [' 2:30 ', 150],
  ])('%s → %i', (texto, minutos) => {
    expect(horaParaMinutos(texto)).toEqual({ ok: true, minutos });
  });

  it.each([
    ['', 'hora_vazia'],
    ['15', 'formato_hora'],
    ['1:5', 'formato_hora'],
    ['1:60', 'formato_hora'],
    ['1000:00', 'formato_hora'],
    ['-1:00', 'formato_hora'],
    ['1h30', 'formato_hora'],
  ])('%s → erro %s', (texto, codigo) => {
    expect(horaParaMinutos(texto)).toEqual({ ok: false, codigo });
  });

  it('minutosParaHora volta ao formato H:MM', () => {
    expect(minutosParaHora(15)).toBe('0:15');
    expect(minutosParaHora(60)).toBe('1:00');
    expect(minutosParaHora(2880)).toBe('48:00');
    for (const m of [1, 59, 61, 1439, 59940]) {
      expect(horaParaMinutos(minutosParaHora(m))).toEqual({ ok: true, minutos: m });
    }
  });
});

describe('horaDoDia (janela das regras)', () => {
  it.each([
    ['20:00', 1200],
    ['0:00', 0],
    ['06:00', 360],
    ['23:59', 1439],
  ])('%s → %i', (texto, minutos) => {
    expect(horaDoDia(texto)).toEqual({ ok: true, minutos });
  });

  it.each([
    ['', 'hora_vazia'],
    ['24:00', 'hora_do_dia'],
    ['48:00', 'hora_do_dia'],
    ['8', 'formato_hora'],
  ])('%s → erro %s', (texto, codigo) => {
    expect(horaDoDia(texto)).toEqual({ ok: false, codigo });
  });
});

describe('duracaoTexto', () => {
  it.each([
    [0, '0 min'],
    [45, '45 min'],
    [60, '1h00'],
    [150, '2h30'],
    [540, '9h00'],
    [1440, '24h00'],
    [2940, '2 dias 1h00'],
    [1500, '1 dia 1h00'],
  ])('%i → %s', (min, texto) => {
    expect(duracaoTexto(min)).toBe(texto);
  });
});
