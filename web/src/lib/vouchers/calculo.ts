import { calcularTarifa, type TarifaSim } from "@/lib/tarifa-engine";

/**
 * Voucher aplicado sobre a tarifa — ESPELHO DE EXIBIÇÃO.
 *
 * ⚠️ Este arquivo NÃO decide valor cobrado. Quem cobra é o app, em Dart
 * (`app/lib/features/vouchers/domain/voucher_engine.dart`), no momento da
 * saída, e é de lá que sai o `valor_abatido` gravado em `liberacoes`. Aqui
 * existe só para a tela do lojista mostrar uma ESTIMATIVA — "se o carro saísse
 * agora, o cliente pagaria ~R$ 14,00" — e para a prévia de fechamento.
 *
 * A estimativa é, por natureza, provisória: o carro ainda está no pátio e o
 * valor real só existe quando ele sair. Toda tela que usar isto tem de rotular
 * como estimativa, nunca como valor.
 *
 * Mesma regra que já vale para `tarifa-engine.ts`: mudança de regra é feita
 * NOS DOIS lugares, aqui e no Dart.
 */

export type RegraVoucher = {
  nome: string;
  abater_minutos: number;
  desconto_percentual: number;
  desconto_valor: number;
};

export type EstimativaVoucher = {
  /** O que seria cobrado sem o voucher. */
  valorOriginal: number;
  /** O que o cliente pagaria. */
  valorFinal: number;
  /** Quanto o parceiro custearia — a diferença, não o tamanho da regra. */
  valorAbatido: number;
  /** Duração REAL da estadia, não a efetiva depois do abatimento. */
  duracaoMinutos: number;
};

/** Regra sem efeito. O banco recusa cadastrar uma (`voucher_regras_faz_algo`). */
function neutra(r: RegraVoucher): boolean {
  return (
    r.abater_minutos <= 0 &&
    r.desconto_percentual <= 0 &&
    r.desconto_valor <= 0
  );
}

/** Dinheiro não tem terceira casa — ver o mesmo cuidado no `VoucherEngine`. */
function emCentavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function estimarComVoucher(
  entrada: Date,
  saida: Date,
  tarifa: TarifaSim,
  regra: RegraVoucher,
): EstimativaVoucher {
  const semVoucher = calcularTarifa(entrada, saida, tarifa);

  if (neutra(regra)) {
    return {
      valorOriginal: semVoucher.valor,
      valorFinal: semVoucher.valor,
      valorAbatido: 0,
      duracaoMinutos: semVoucher.duracaoMinutos,
    };
  }

  // Abater mais que a estadia inteira é o caso comum (isenção de 24h num carro
  // de 20 minutos). Travar em `saida` mantém o intervalo válido.
  const efetivaMs = entrada.getTime() + regra.abater_minutos * 60_000;
  const entradaEfetiva = new Date(Math.min(efetivaMs, saida.getTime()));
  const comAbatimento = calcularTarifa(entradaEfetiva, saida, tarifa);

  let valor = comAbatimento.valor;
  if (regra.desconto_percentual > 0) {
    valor = (valor * (100 - regra.desconto_percentual)) / 100;
  }
  if (regra.desconto_valor > 0) {
    valor = valor - regra.desconto_valor;
  }
  const valorFinal = emCentavos(valor < 0 ? 0 : valor);

  return {
    valorOriginal: semVoucher.valor,
    valorFinal,
    valorAbatido: emCentavos(semVoucher.valor - valorFinal),
    // Sempre do cálculo SEM voucher: a estadia real é 3h mesmo que 2h sejam
    // abatidas, e o lojista precisa ver o tempo de verdade.
    duracaoMinutos: semVoucher.duracaoMinutos,
  };
}

/** Descreve a regra em palavras, para a tela do lojista. */
export function descreverRegra(r: RegraVoucher): string {
  const partes: string[] = [];
  if (r.abater_minutos > 0) {
    const h = Math.floor(r.abater_minutos / 60);
    const m = r.abater_minutos % 60;
    const tempo = h > 0 ? (m > 0 ? `${h}h${m}` : `${h}h`) : `${m} min`;
    partes.push(`${tempo} sem cobrança`);
  }
  if (r.desconto_percentual >= 100) partes.push("isenção total");
  else if (r.desconto_percentual > 0) {
    partes.push(`${r.desconto_percentual}% de desconto`);
  }
  if (r.desconto_valor > 0) {
    partes.push(`R$ ${r.desconto_valor.toFixed(2).replace(".", ",")} de abatimento`);
  }
  return partes.join(" + ") || "sem efeito";
}
