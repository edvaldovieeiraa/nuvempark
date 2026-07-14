import { describe, expect, it } from 'vitest';
import { TarifaEngine, type TarifaConfig } from './tarifa-engine.js';

/**
 * PORT DIRETO de `app/test/features/tarifa/tarifa_engine_test.dart` — os mesmos
 * 7 cenários, os mesmos valores esperados.
 *
 * Se um destes falhar, o bug está NO PORT (tarifa-engine.ts). Nunca ajuste o
 * valor esperado para o teste passar: ele é o contrato com o app, e uma
 * divergência aqui vira o cliente pagando um valor no QR e o operador cobrando
 * outro na saída.
 */

// fracao_inicial: 15 min / R$ 5,00 · fracao_adicional: 15 min / R$ 3,00
// teto_diaria: R$ 60,00 · tolerancia: 10 min · pernoite: R$ 25,00 | 22h–06h
const tarifa: TarifaConfig = {
  fracaoInicialMinutos: 15,
  fracaoInicialValor: 5.0,
  fracaoAdicionalMinutos: 15,
  fracaoAdicionalValor: 3.0,
  tetoDiaria: 60.0,
  toleranciaMinutos: 10,
  pernoiteValor: 25.0,
  pernoiteHoraInicio: 22,
  pernoiteHoraFim: 6,
};

/** Dia base dos cenários sem pernoite: 15/01/2024, hora local. */
function base(horas: number, minutos = 0): Date {
  return new Date(2024, 0, 15, horas, minutos);
}

describe('TarifaEngine (port do Dart)', () => {
  it('Cenário 1 — dentro da tolerância (8 min) → R$ 0,00', () => {
    const r = TarifaEngine.calcular({
      entrada: base(10),
      saida: base(10, 8),
      tarifa,
    });
    expect(r.motivo).toBe('tolerancia');
    expect(r.valor).toBeCloseTo(0.0, 3);
    expect(r.duracaoMinutos).toBe(8);
  });

  it('Cenário 2 — fração inicial exata (15 min) → R$ 5,00', () => {
    const r = TarifaEngine.calcular({
      entrada: base(10),
      saida: base(10, 15),
      tarifa,
    });
    expect(r.motivo).toBe('normal');
    expect(r.valor).toBeCloseTo(5.0, 3);
  });

  it('Cenário 3 — inicial + 1 adicional (30 min) → R$ 8,00', () => {
    const r = TarifaEngine.calcular({
      entrada: base(10),
      saida: base(10, 30),
      tarifa,
    });
    expect(r.motivo).toBe('normal');
    expect(r.valor).toBeCloseTo(8.0, 3); // 5 + 1×3
  });

  it('Cenário 4 — inicial + 3 adicionais (60 min) → R$ 14,00', () => {
    const r = TarifaEngine.calcular({
      entrada: base(10),
      saida: base(11),
      tarifa,
    });
    expect(r.motivo).toBe('normal');
    expect(r.valor).toBeCloseTo(14.0, 3); // 5 + 3×3
  });

  it('Cenário 5 — fração adicional parcial (35 min) → R$ 11,00', () => {
    // 35 min = 15 inicial + 20 adicionais; ceil(20/15) = 2 frações
    const r = TarifaEngine.calcular({
      entrada: base(10),
      saida: base(10, 35),
      tarifa,
    });
    expect(r.motivo).toBe('normal');
    expect(r.valor).toBeCloseTo(11.0, 3); // 5 + 2×3
  });

  it('Cenário 6 — teto diária (10 h = 600 min) → R$ 60,00', () => {
    // Normal seria 5 + ceil(585/15)×3 = 122,00 → aplica teto
    const r = TarifaEngine.calcular({
      entrada: base(8),
      saida: base(18),
      tarifa,
    });
    expect(r.motivo).toBe('tetoDiaria');
    expect(r.valor).toBeCloseTo(60.0, 3);
  });

  it('Cenário 7 — pernoite (20h → 08h do dia seguinte) → R$ 25,00', () => {
    // Janela: 22h de D até 06h de D+1. Entrada 20h ≤ 22h e saída 08h ≥ 06h.
    const r = TarifaEngine.calcular({
      entrada: new Date(2024, 0, 15, 20, 0),
      saida: new Date(2024, 0, 16, 8, 0),
      tarifa,
    });
    expect(r.motivo).toBe('pernoite');
    expect(r.valor).toBeCloseTo(25.0, 3);
  });
});
