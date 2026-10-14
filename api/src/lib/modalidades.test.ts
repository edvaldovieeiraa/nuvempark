import { describe, expect, it } from 'vitest';
import { filtrarModalidades, modalidadesAceitas, semColunaModalidade } from './modalidades.js';

describe('modalidadesAceitas', () => {
  it('sem parâmetro → só avulso (app anterior às tarifas de hóspede)', () => {
    expect(modalidadesAceitas(undefined)).toEqual(['avulso']);
    expect(modalidadesAceitas('')).toEqual(['avulso']);
  });

  it('hospede → avulso + hospede, e NÃO contrato', () => {
    // O bug que esta função corrige: com `?modalidades=hospede` a consulta não
    // filtrava nada, e uma tabela `contrato` chegaria ao app atual como avulsa.
    expect(modalidadesAceitas('hospede')).toEqual(['avulso', 'hospede']);
  });

  it('contrato só se o app pedir', () => {
    expect(modalidadesAceitas('hospede,contrato')).toEqual(['avulso', 'hospede', 'contrato']);
    expect(modalidadesAceitas('contrato')).toEqual(['avulso', 'contrato']);
  });

  it('valor desconhecido, espaços e repetição são ignorados', () => {
    expect(modalidadesAceitas(' hospede , xyz,hospede')).toEqual(['avulso', 'hospede']);
  });
});

describe('filtrarModalidades', () => {
  const linhas = [
    { id: 'a', modalidade: 'avulso' },
    { id: 'h', modalidade: 'hospede' },
    { id: 'c', modalidade: 'contrato' },
    { id: 'antiga' }, // banco sem db/42: sem a coluna, é avulsa
  ];

  it('app atual (hospede) não recebe contrato, mesmo vindo da consulta sem filtro', () => {
    expect(filtrarModalidades(linhas, modalidadesAceitas('hospede')).map((l) => l.id)).toEqual([
      'a',
      'h',
      'antiga',
    ]);
  });

  it('app antigo só recebe avulsas', () => {
    expect(filtrarModalidades(linhas, modalidadesAceitas(undefined)).map((l) => l.id)).toEqual([
      'a',
      'antiga',
    ]);
  });
});

describe('semColunaModalidade', () => {
  it('só o erro de coluna inexistente (42703) libera a consulta sem filtro', () => {
    expect(semColunaModalidade({ code: '42703' })).toBe(true);
    expect(semColunaModalidade({ code: '57014' })).toBe(false); // timeout
    expect(semColunaModalidade(null)).toBe(false);
  });
});
