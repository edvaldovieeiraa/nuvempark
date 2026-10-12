import { describe, expect, it } from 'vitest';
import { flagsModoRapido } from './modo-rapido.js';

describe('flagsModoRapido', () => {
  // Só o helper: a API NÃO aguenta banco sem a migração 43 — o select do
  // bootstrap pede as colunas e falha antes de chegar aqui.
  it('campos ausentes caem nos defaults da coluna', () => {
    expect(flagsModoRapido({})).toEqual({
      modo_rapido_entrada: false,
      modo_rapido_imprime: true,
    });
  });

  it('null cai nos defaults', () => {
    expect(
      flagsModoRapido({ modo_rapido_entrada: null, modo_rapido_imprime: null }),
    ).toEqual({ modo_rapido_entrada: false, modo_rapido_imprime: true });
  });

  it('valores explícitos passam, inclusive imprime desligado', () => {
    expect(
      flagsModoRapido({ modo_rapido_entrada: true, modo_rapido_imprime: false }),
    ).toEqual({ modo_rapido_entrada: true, modo_rapido_imprime: false });
    expect(
      flagsModoRapido({ modo_rapido_entrada: false, modo_rapido_imprime: true }),
    ).toEqual({ modo_rapido_entrada: false, modo_rapido_imprime: true });
  });
});
