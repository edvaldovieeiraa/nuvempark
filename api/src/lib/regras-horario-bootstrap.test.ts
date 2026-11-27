import { describe, expect, it } from 'vitest';
import { tarifaVaiParaApp, versaoRegrasDeclarada } from './regras-horario-bootstrap.js';

const regraV1 = {
  id: 'r1',
  nome: 'Comercial',
  dias: [1, 2, 3, 4, 5],
  hora_inicio: '08:00',
  hora_fim: '18:00',
  cobrar_do_inicio: false,
  degraus: [{ ate_minutos: 60, valor: 10 }],
  adicional_minutos: 30,
  adicional_valor: 5,
};

describe('versaoRegrasDeclarada', () => {
  it('lê o token do app 1.0.2', () => {
    expect(versaoRegrasDeclarada('hospede,regras_horario_v1')).toBe(1);
  });
  it('app antigo (só hospede, ou nada) = 0', () => {
    expect(versaoRegrasDeclarada('hospede')).toBe(0);
    expect(versaoRegrasDeclarada('')).toBe(0);
  });
  it('só o token exato conta', () => {
    expect(versaoRegrasDeclarada('regras_horario')).toBe(0);
    expect(versaoRegrasDeclarada('xregras_horario_v1')).toBe(0);
    expect(versaoRegrasDeclarada(' regras_horario_v2 ,hospede')).toBe(2);
  });
});

describe('tarifaVaiParaApp', () => {
  it('tabela sem regras vai para todos (inclusive banco sem a coluna)', () => {
    for (const v of [0, 1]) {
      expect(tarifaVaiParaApp({}, v)).toBe(true);
      expect(tarifaVaiParaApp({ regras_horario: [] }, v)).toBe(true);
      expect(tarifaVaiParaApp({ regras_horario: null }, v)).toBe(true);
    }
  });
  it('app antigo não recebe tabela com regras, nem com regra malformada', () => {
    expect(tarifaVaiParaApp({ regras_horario: [regraV1] }, 0)).toBe(false);
    expect(tarifaVaiParaApp({ regras_horario: [{ lixo: true }] }, 0)).toBe(false);
    expect(tarifaVaiParaApp({ regras_horario: JSON.stringify([regraV1]) }, 0)).toBe(false);
  });
  it('app v1 recebe regras v1', () => {
    expect(tarifaVaiParaApp({ regras_horario: [regraV1] }, 1)).toBe(true);
    expect(tarifaVaiParaApp({ regras_horario: [{ ...regraV1, requer: 1 }] }, 1)).toBe(true);
  });
  it('app v1 não recebe tabela com regra que requer v2', () => {
    expect(
      tarifaVaiParaApp({ regras_horario: [regraV1, { id: 'n', requer: 2, formato: 'novo' }] }, 1),
    ).toBe(false);
    expect(tarifaVaiParaApp({ regras_horario: [{ ...regraV1, requer: 2 }] }, 2)).toBe(true);
  });
});
