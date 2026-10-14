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

/**
 * PORT dos testes de borda de tolerância do Dart (o bug do Pix online: com
 * tolerância comparada em minutos truncados, qualquer estadia < 1min saía
 * grátis — o cliente só conseguia pagar depois de 1 minuto). A comparação
 * passou a ser em SEGUNDOS. Mantido em paridade com o app.
 */
describe('TarifaEngine — tolerância em segundos', () => {
  function tarifaCom(toleranciaMinutos: number): TarifaConfig {
    return { ...tarifa, toleranciaMinutos };
  }

  /** 15/01/2024 10:00:SS local, para variar o segundo da saída. */
  function seg(segundos: number): Date {
    return new Date(2024, 0, 15, 10, 0, segundos);
  }

  it('tolerância 0 · 30s → cobra fração inicial (não é grátis)', () => {
    const r = TarifaEngine.calcular({
      entrada: seg(0),
      saida: seg(30),
      tarifa: tarifaCom(0),
    });
    expect(r.motivo).toBe('normal');
    expect(r.valor).toBeCloseTo(5.0, 3);
  });

  it('tolerância 0 · 1s → cobra fração inicial', () => {
    const r = TarifaEngine.calcular({
      entrada: seg(0),
      saida: seg(1),
      tarifa: tarifaCom(0),
    });
    expect(r.motivo).toBe('normal');
    expect(r.valor).toBeCloseTo(5.0, 3);
  });

  it('tolerância 0 · 0s (entrada = saída) → grátis (limite inclusivo)', () => {
    const r = TarifaEngine.calcular({
      entrada: seg(0),
      saida: seg(0),
      tarifa: tarifaCom(0),
    });
    expect(r.motivo).toBe('tolerancia');
    expect(r.valor).toBeCloseTo(0.0, 3);
  });

  it('tolerância 10min · 600s (10min exatos) → grátis (limite inclusivo)', () => {
    const r = TarifaEngine.calcular({
      entrada: seg(0),
      saida: new Date(2024, 0, 15, 10, 10, 0),
      tarifa: tarifaCom(10),
    });
    expect(r.motivo).toBe('tolerancia');
    expect(r.valor).toBeCloseTo(0.0, 3);
  });

  it('tolerância 10min · 601s (10min01s) → cobra (passou 1s do limite)', () => {
    const r = TarifaEngine.calcular({
      entrada: seg(0),
      saida: new Date(2024, 0, 15, 10, 10, 1),
      tarifa: tarifaCom(10),
    });
    expect(r.motivo).toBe('normal');
    expect(r.valor).toBeCloseTo(5.0, 3);
  });
});

/**
 * Estadias acima de 24 h (fix 2026-10). Antes o teto e a pernoite valiam UMA
 * vez para a estadia inteira: 72 h pagavam um teto, 10 dias pagavam uma
 * pernoite. Agora a estadia é dividida em blocos de 24 h corridas desde a
 * entrada; cada bloco é cobrado com as regras de sempre (tolerância, pernoite,
 * frações, teto) e a sobra final também. Só divide quando a tarifa tem teto
 * ou pernoite ligados — tarifa só de frações já cobra o tempo todo.
 * Mesmos cenários em `app/test/features/tarifa/tarifa_engine_test.dart`.
 */
describe('TarifaEngine — estadias acima de 24 h', () => {
  const semPernoite: TarifaConfig = { ...tarifa, pernoiteValor: 0 };
  const soFracoes: TarifaConfig = { ...tarifa, pernoiteValor: 0, tetoDiaria: 0 };
  const d = (dia: number, h: number, m = 0) => new Date(2024, 0, dia, h, m);

  it('24 h exatas sem pernoite → um teto, como antes', () => {
    const r = TarifaEngine.calcular({ entrada: d(15, 10), saida: d(16, 10), tarifa: semPernoite });
    expect(r.motivo).toBe('tetoDiaria');
    expect(r.valor).toBeCloseTo(60.0, 3);
  });

  it('72 h sem pernoite → 3 tetos (R$ 180)', () => {
    const r = TarifaEngine.calcular({ entrada: d(15, 10), saida: d(18, 10), tarifa: semPernoite });
    expect(r.motivo).toBe('diarias');
    expect(r.valor).toBeCloseTo(180.0, 3);
    expect(r.duracaoMinutos).toBe(72 * 60);
  });

  it('74 h sem pernoite → 3 tetos + 2 h pela tabela (R$ 206)', () => {
    // 2 h = 5 + ceil(105/15) × 3 = 26
    const r = TarifaEngine.calcular({ entrada: d(15, 10), saida: d(18, 12), tarifa: semPernoite });
    expect(r.motivo).toBe('diarias');
    expect(r.valor).toBeCloseTo(206.0, 3);
  });

  it('24 h + 5 min: a sobra cai na tolerância → só o teto', () => {
    const r = TarifaEngine.calcular({ entrada: d(15, 10), saida: d(16, 10, 5), tarifa: semPernoite });
    expect(r.motivo).toBe('diarias');
    expect(r.valor).toBeCloseTo(60.0, 3);
  });

  it('72 h com pernoite, entrada 10h → cada bloco fecha a madrugada (3 × R$ 25)', () => {
    const r = TarifaEngine.calcular({ entrada: d(15, 10), saida: d(18, 10), tarifa });
    expect(r.motivo).toBe('diarias');
    expect(r.valor).toBeCloseTo(75.0, 3);
  });

  it('72 h com pernoite, entrada 23h → nenhum bloco fecha a janela 22h–06h (3 tetos)', () => {
    const r = TarifaEngine.calcular({ entrada: d(15, 23), saida: d(18, 23), tarifa });
    expect(r.motivo).toBe('diarias');
    expect(r.valor).toBeCloseTo(180.0, 3);
  });

  it('pernoite sem teto: 48 h desde as 10h → 2 pernoites', () => {
    const r = TarifaEngine.calcular({
      entrada: d(15, 10),
      saida: d(17, 10),
      tarifa: { ...tarifa, tetoDiaria: 0 },
    });
    expect(r.motivo).toBe('diarias');
    expect(r.valor).toBeCloseTo(50.0, 3);
  });

  it('tarifa só de frações (sem teto, sem pernoite) não muda: 72 h = R$ 866', () => {
    // 5 + ceil((4320 − 15) / 15) × 3 = 5 + 287 × 3
    const r = TarifaEngine.calcular({ entrada: d(15, 10), saida: d(18, 10), tarifa: soFracoes });
    expect(r.motivo).toBe('normal');
    expect(r.valor).toBeCloseTo(866.0, 3);
  });

  it('bordas: 48 h exatas, sobra fora da tolerância, sobra de 1 s com tolerância 0', () => {
    const c = (e: Date, sa: Date, t: TarifaConfig) =>
      TarifaEngine.calcular({ entrada: e, saida: sa, tarifa: t }).valor;
    expect(c(d(15, 10), d(17, 10), semPernoite)).toBeCloseTo(120.0, 3);
    // 24 h + 11 min: a sobra passa da tolerância (10) → fração inicial
    expect(c(d(15, 10), d(16, 10, 11), semPernoite)).toBeCloseTo(65.0, 3);
    // tolerância 0: 1 s depois das 24 h já cobra a fração inicial
    const tol0 = { ...semPernoite, toleranciaMinutos: 0 };
    expect(c(d(15, 10), new Date(2024, 0, 16, 10, 0, 1), tol0)).toBeCloseTo(65.0, 3);
  });

  it('30 h desde as 10h com pernoite: bloco fecha a madrugada (R$ 25) + 6 h no teto (R$ 60)', () => {
    const r = TarifaEngine.calcular({ entrada: d(15, 10), saida: d(16, 16), tarifa });
    expect(r.valor).toBeCloseTo(85.0, 3);
  });
});
