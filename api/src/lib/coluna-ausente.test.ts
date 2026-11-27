import { describe, expect, it } from 'vitest';
import { colunaAusente } from './coluna-ausente.js';

describe('colunaAusente', () => {
  it('só o erro de coluna inexistente, da coluna pedida', () => {
    const erro = { code: '42703', message: 'column tarifas.regras_horario does not exist' };
    expect(colunaAusente(erro, 'regras_horario')).toBe(true);
    expect(colunaAusente(erro, 'modalidade')).toBe(false);
    expect(
      colunaAusente({ code: 'PGRST204', message: "Could not find the 'regras_horario' column" }, 'regras_horario'),
    ).toBe(true);
  });

  it('erro passageiro NÃO dispara o retorno sem a coluna', () => {
    expect(colunaAusente({ code: '57014', message: 'canceling statement due to statement timeout' }, 'regras_horario')).toBe(false);
    expect(colunaAusente({ message: 'fetch failed' }, 'regras_horario')).toBe(false);
    expect(colunaAusente(null, 'regras_horario')).toBe(false);
  });
});
