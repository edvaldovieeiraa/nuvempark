/**
 * Motor de cálculo de tarifa da API — usado pela página pública de pagamento
 * online (QR). O app cobra na saída física; esta cópia cobra no QR. As duas
 * TÊM de dar o mesmo número: o algoritmo mora em `tarifa-trechos.ts`, port
 * literal do Dart, e os três motores rodam `testdata/tarifa-casos.json`.
 *
 * Esta camada só mantém a assinatura de sempre (`TarifaEngine.calcular`) e as
 * validações de entrada.
 */
import {
  calcularComTrechos,
  type RegraHorario,
  type TrechoCobranca,
} from './tarifa-trechos.js';

export type { RegraHorario, TrechoCobranca } from './tarifa-trechos.js';

/** Espelha as colunas de `public.tarifas` usadas no cálculo. */
export interface TarifaConfig {
  fracaoInicialMinutos: number;
  fracaoInicialValor: number;
  fracaoAdicionalMinutos: number;
  fracaoAdicionalValor: number;
  /** 0 = regra DESLIGADA. */
  tetoDiaria: number;
  toleranciaMinutos: number;
  /** 0 = regra DESLIGADA. */
  pernoiteValor: number;
  pernoiteHoraInicio: number;
  pernoiteHoraFim: number;
  /** Regras de horário já lidas (`regrasDoJson`). Ausente = sem regras. */
  regras?: RegraHorario[];
}

export type FareMotivo = 'tolerancia' | 'normal' | 'tetoDiaria' | 'pernoite';

export interface FareResult {
  valor: number;
  duracaoMinutos: number;
  motivo: FareMotivo;
  /** Vazio na tolerância e no pernoite. */
  trechos: TrechoCobranca[];
}

/**
 * Calcula o valor a cobrar dada uma entrada, saída e configuração de tarifa.
 * O caller escolhe QUAL tarifa aplicar; a engine só calcula.
 */
export function calcular(params: {
  entrada: Date;
  saida: Date;
  tarifa: TarifaConfig;
}): FareResult {
  const { entrada, saida, tarifa } = params;

  if (saida.getTime() < entrada.getTime()) {
    throw new Error('saida deve ser igual ou posterior à entrada');
  }
  if (tarifa.fracaoAdicionalMinutos <= 0) {
    throw new Error('fracaoAdicionalMinutos deve ser > 0');
  }

  const r = calcularComTrechos(entrada, saida, {
    ...tarifa,
    regras: tarifa.regras ?? [],
  });
  return {
    valor: r.valor,
    duracaoMinutos: r.duracaoMinutos,
    motivo: r.motivo,
    trechos: r.trechos,
  };
}

/** Namespace para casar com a chamada do Dart (`TarifaEngine.calcular`). */
export const TarifaEngine = { calcular } as const;
