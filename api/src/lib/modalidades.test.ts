import { describe, expect, it } from 'vitest';
import { modalidadesAceitas } from './modalidades.js';

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
