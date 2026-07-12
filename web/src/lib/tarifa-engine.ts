/**
 * Porte FIEL do TarifaEngine do app (lib/features/tarifa/domain/tarifa_engine.dart)
 * para o simulador do painel. Precedência:
 *  1. Tolerância  → R$ 0
 *  2. Pernoite    → pernoite_valor (só se > 0; janela D hh_ini → D+1 hh_fim)
 *  3. Frações     → inicial + ceil(restante/adicional) × valor_adicional
 *  4. Teto diária → substitui quando excedido (só se > 0)
 * Qualquer mudança de regra deve ser feita NOS DOIS lugares.
 */

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
};

export type MotivoSim = "tolerancia" | "pernoite" | "normal" | "tetoDiaria";

export type ResultadoSim = {
  valor: number;
  duracaoMinutos: number;
  motivo: MotivoSim;
  /** Frações adicionais cobradas (motivo normal/teto). */
  fracoesAdicionais: number;
  /** Valor por tempo antes do teto (motivo tetoDiaria). */
  valorSemTeto: number;
};

export function calcularTarifa(
  entrada: Date,
  saida: Date,
  t: TarifaSim,
): ResultadoSim {
  // Dart usa Duration.inMinutes (trunca) — floor mantém a paridade.
  const duracaoMinutos = Math.floor(
    (saida.getTime() - entrada.getTime()) / 60000,
  );

  // 1. Tolerância
  if (duracaoMinutos <= t.tolerancia_minutos) {
    return {
      valor: 0,
      duracaoMinutos,
      motivo: "tolerancia",
      fracoesAdicionais: 0,
      valorSemTeto: 0,
    };
  }

  // 2. Pernoite (0 = desligado)
  if (t.pernoite_valor > 0 && isPernoite(entrada, saida, t)) {
    return {
      valor: t.pernoite_valor,
      duracaoMinutos,
      motivo: "pernoite",
      fracoesAdicionais: 0,
      valorSemTeto: 0,
    };
  }

  // 3. Frações
  let valorNormal: number;
  let fracoes = 0;
  if (duracaoMinutos <= t.fracao_inicial_minutos) {
    valorNormal = t.fracao_inicial_valor;
  } else {
    fracoes = Math.ceil(
      (duracaoMinutos - t.fracao_inicial_minutos) / t.fracao_adicional_minutos,
    );
    valorNormal = t.fracao_inicial_valor + fracoes * t.fracao_adicional_valor;
  }

  // 4. Teto (0 = desligado)
  if (t.teto_diaria > 0 && valorNormal >= t.teto_diaria) {
    return {
      valor: t.teto_diaria,
      duracaoMinutos,
      motivo: "tetoDiaria",
      fracoesAdicionais: fracoes,
      valorSemTeto: valorNormal,
    };
  }

  return {
    valor: valorNormal,
    duracaoMinutos,
    motivo: "normal",
    fracoesAdicionais: fracoes,
    valorSemTeto: valorNormal,
  };
}

/** Janela de pernoite: de hh_ini:00 do dia D até hh_fim:00 de D+1 —
 *  true se a estadia abrange (entrada ≤ início E saída ≥ fim) alguma janela. */
function isPernoite(entrada: Date, saida: Date, t: TarifaSim): boolean {
  let dia = new Date(
    entrada.getFullYear(),
    entrada.getMonth(),
    entrada.getDate(),
  );
  const diaFim = new Date(
    saida.getFullYear(),
    saida.getMonth(),
    saida.getDate(),
  );

  while (dia.getTime() <= diaFim.getTime()) {
    const inicioJanela = new Date(
      dia.getTime() + t.pernoite_hora_inicio * 3_600_000,
    );
    const fimJanela = new Date(
      dia.getTime() + (t.pernoite_hora_fim + 24) * 3_600_000,
    );
    if (
      entrada.getTime() <= inicioJanela.getTime() &&
      saida.getTime() >= fimJanela.getTime()
    ) {
      return true;
    }
    dia = new Date(dia.getTime() + 24 * 3_600_000);
  }
  return false;
}
