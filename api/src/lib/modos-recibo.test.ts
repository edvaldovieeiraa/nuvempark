import { describe, expect, it } from 'vitest';
import { modosRecibo } from './modos-recibo.js';

describe('modosRecibo', () => {
  // Só o helper: sem a migração 53 o select do bootstrap falha antes daqui.
  it('campos ausentes imprimem automático, como sempre foi', () => {
    expect(modosRecibo({})).toEqual({
      recibo_saida_modo: 'automatica',
      recibo_estadia_modo: 'automatica',
      recibo_caixa_modo: 'automatica',
    });
  });

  it('null e valor desconhecido também caem em automática', () => {
    expect(
      modosRecibo({
        recibo_saida_modo: null,
        recibo_estadia_modo: 'qualquer',
        recibo_caixa_modo: undefined,
      }),
    ).toEqual({
      recibo_saida_modo: 'automatica',
      recibo_estadia_modo: 'automatica',
      recibo_caixa_modo: 'automatica',
    });
  });

  it('valores válidos passam um a um', () => {
    expect(
      modosRecibo({
        recibo_saida_modo: 'desativada',
        recibo_estadia_modo: 'perguntar',
        recibo_caixa_modo: 'automatica',
      }),
    ).toEqual({
      recibo_saida_modo: 'desativada',
      recibo_estadia_modo: 'perguntar',
      recibo_caixa_modo: 'automatica',
    });
  });
});
