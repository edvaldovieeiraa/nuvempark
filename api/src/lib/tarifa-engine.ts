/**
 * Motor de cálculo de tarifa — PORT do Dart (`app/lib/features/tarifa/domain/
 * tarifa_engine.dart`). Função pura, sem I/O.
 *
 * O app cobra na saída física; esta cópia cobra na página pública de pagamento
 * online. As duas TÊM de dar o mesmo número — se divergirem, o cliente paga um
 * valor no QR e o operador vê outro na catraca. Por isso o port é literal:
 * mesma ordem de precedência, mesmos comparadores inclusivos, mesmo
 * arredondamento. Não "melhore" nada aqui sem mudar o Dart junto.
 *
 * Regras (em ordem de precedência):
 *  1. Tolerância  → R$ 0,00
 *  2. Pernoite    → tarifa.pernoiteValor
 *  3. Normal      → fração inicial + frações adicionais (arredondadas PRA CIMA)
 *  4. Teto diária → substitui o normal quando excedido
 *
 * DATAS: `Date` (não epoch-ms). Duração medida em minutos inteiros, truncando —
 * igual ao `Duration.inMinutes` do Dart.
 *
 * DINHEIRO: `number` (double), como no Dart. Não converte para centavos: fazer
 * isso aqui e não lá faria as duas engines divergirem em casos de arredondamento.
 */

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
}

export type FareMotivo = 'tolerancia' | 'normal' | 'tetoDiaria' | 'pernoite';

export interface FareResult {
  valor: number;
  duracaoMinutos: number;
  motivo: FareMotivo;
}

const MS_POR_SEGUNDO = 1_000;
const MS_POR_MINUTO = 60_000;
const MS_POR_HORA = 3_600_000;
const MS_POR_DIA = 86_400_000;

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

  const ms = saida.getTime() - entrada.getTime();
  // Trunca, como o `Duration.inSeconds`/`inMinutes` do Dart.
  const duracaoSegundos = Math.floor(ms / MS_POR_SEGUNDO);
  // Frações/pernoite/teto seguem em MINUTOS (regra original inalterada).
  const duracaoMinutos = Math.floor(ms / MS_POR_MINUTO);

  // ── 1. Tolerância ─────────────────────────────────────────────────────────
  // Tolerância comparada em SEGUNDOS (fix 2026-07: estadia < 1min com tolerância
  // 0 saía grátis pelo floor de minutos — o Pix liberava só após 1 min, sem bater
  // com o app). Mantém o `<=` inclusivo. Espelha o Dart `tarifa_engine.dart`.
  if (duracaoSegundos <= tarifa.toleranciaMinutos * 60) {
    return { valor: 0, duracaoMinutos, motivo: 'tolerancia' };
  }

  // ── 2. Pernoite ───────────────────────────────────────────────────────────
  // valor 0 = regra DESLIGADA (sem isto, atravessar a madrugada sairia grátis)
  if (tarifa.pernoiteValor > 0 && isPernoite(entrada, saida, tarifa)) {
    return { valor: tarifa.pernoiteValor, duracaoMinutos, motivo: 'pernoite' };
  }

  // ── 3. Tarifa normal ──────────────────────────────────────────────────────
  let valorNormal: number;
  if (duracaoMinutos <= tarifa.fracaoInicialMinutos) {
    valorNormal = tarifa.fracaoInicialValor;
  } else {
    const minutosAdicionais = duracaoMinutos - tarifa.fracaoInicialMinutos;
    const fracoesAdicionais = Math.ceil(
      minutosAdicionais / tarifa.fracaoAdicionalMinutos,
    );
    valorNormal =
      tarifa.fracaoInicialValor + fracoesAdicionais * tarifa.fracaoAdicionalValor;
  }

  // ── 4. Teto diária ────────────────────────────────────────────────────────
  // teto 0 = regra DESLIGADA (sem isto, TODA cobrança viraria R$ 0)
  if (tarifa.tetoDiaria > 0 && valorNormal >= tarifa.tetoDiaria) {
    return { valor: tarifa.tetoDiaria, duracaoMinutos, motivo: 'tetoDiaria' };
  }

  return { valor: valorNormal, duracaoMinutos, motivo: 'normal' };
}

/**
 * True se a estadia abrangeu INTEIRA ao menos uma janela de pernoite.
 *
 * Janela: das `pernoiteHoraInicio`:00 do dia D até as `pernoiteHoraFim`:00 do
 * dia D+1 (daí o `+ 24` nas horas do fim). Comparadores inclusivos nos dois
 * lados, como no Dart: entrada <= início E saída >= fim.
 */
function isPernoite(entrada: Date, saida: Date, tarifa: TarifaConfig): boolean {
  // Meia-noite LOCAL do dia da entrada — o Dart usa DateTime(y, m, d), local.
  let dia = new Date(
    entrada.getFullYear(),
    entrada.getMonth(),
    entrada.getDate(),
  ).getTime();
  const diaFim = new Date(
    saida.getFullYear(),
    saida.getMonth(),
    saida.getDate(),
  ).getTime();

  while (dia <= diaFim) {
    const inicioJanela = dia + tarifa.pernoiteHoraInicio * MS_POR_HORA;
    const fimJanela = dia + (tarifa.pernoiteHoraFim + 24) * MS_POR_HORA;

    if (entrada.getTime() <= inicioJanela && saida.getTime() >= fimJanela) {
      return true;
    }
    dia += MS_POR_DIA;
  }
  return false;
}

/** Namespace para casar com a chamada do Dart (`TarifaEngine.calcular`). */
export const TarifaEngine = { calcular } as const;
