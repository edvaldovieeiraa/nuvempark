/**
 * Motor de tarifa do painel (simulador e vouchers). O algoritmo mora em
 * `tarifa-trechos.ts`, cópia idêntica da API e port literal do Dart
 * (`app/lib/features/tarifa/domain/tarifa_engine.dart`). Os três motores rodam
 * `testdata/tarifa-casos.json`. Sem imports `@/`: o vitest da API importa este
 * arquivo pelo caminho relativo.
 *
 * Precedência:
 *  1. Tolerância  → R$ 0
 *  2. Pernoite    → pernoite_valor (só se > 0; janela em Brasília)
 *  3. Trechos     → regra de horário em vigor ou preço base (inicial + adicionais)
 *  4. Teto diária → sobre a soma dos trechos (só se > 0)
 */
import {
  calcularComTrechos,
  regrasDoJson,
  type TrechoCobranca,
} from "./tarifa-trechos";

export type { TrechoCobranca } from "./tarifa-trechos";

export type TarifaSim = {
  tolerancia_minutos: number;
  fracao_inicial_minutos: number;
  fracao_inicial_valor: number;
  fracao_adicional_minutos: number;
  fracao_adicional_valor: number;
  teto_diaria: number;
  pernoite_valor: number;
  pernoite_hora_inicio: number;
  pernoite_hora_fim: number;
  /** JSON da coluna `regras_horario` (lista, texto ou nulo). Ausente = sem regras. */
  regras_horario?: unknown;
};

export type MotivoSim = "tolerancia" | "pernoite" | "normal" | "tetoDiaria";

export type ResultadoSim = {
  valor: number;
  duracaoMinutos: number;
  motivo: MotivoSim;
  /** Frações adicionais do preço base (só quando há um trecho só, de preço base). */
  fracoesAdicionais: number;
  /** Soma dos trechos antes do teto (motivo normal/teto). */
  valorSemTeto: number;
  /** Trechos cobrados (vazio na tolerância e no pernoite). */
  trechos: TrechoCobranca[];
};

export function calcularTarifa(
  entrada: Date,
  saida: Date,
  t: TarifaSim,
): ResultadoSim {
  const r = calcularComTrechos(entrada, saida, {
    toleranciaMinutos: t.tolerancia_minutos,
    fracaoInicialMinutos: t.fracao_inicial_minutos,
    fracaoInicialValor: t.fracao_inicial_valor,
    fracaoAdicionalMinutos: t.fracao_adicional_minutos,
    fracaoAdicionalValor: t.fracao_adicional_valor,
    tetoDiaria: t.teto_diaria,
    pernoiteValor: t.pernoite_valor,
    pernoiteHoraInicio: t.pernoite_hora_inicio,
    pernoiteHoraFim: t.pernoite_hora_fim,
    regras: regrasDoJson(t.regras_horario),
  });

  const unico = r.trechos.length === 1 ? r.trechos[0] : undefined;
  const fracoesAdicionais =
    unico && unico.regraId === null && unico.minutos > t.fracao_inicial_minutos
      ? Math.ceil(
          (unico.minutos - t.fracao_inicial_minutos) / t.fracao_adicional_minutos,
        )
      : 0;

  return {
    valor: r.valor,
    duracaoMinutos: r.duracaoMinutos,
    motivo: r.motivo,
    fracoesAdicionais,
    valorSemTeto: r.centavosSemTeto / 100,
    trechos: r.trechos,
  };
}
