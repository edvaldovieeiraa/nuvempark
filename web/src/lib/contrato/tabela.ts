import type { Cobranca, Regra } from './modelo';

/** Preço de uma regra para uma duração, e até onde esse preço cobre. */
export interface Preco {
  valorCentavos: number;
  /** Minutos pagos a partir do início da fatia (≥ a duração pedida). */
  cobertoMinutos: number;
  cobranca: Cobranca;
}

/**
 * A tabela de uma regra aplicada a `minutos` (comportamento confirmado no
 * simulador do CloudPark, golden S01–S22 e S50–S54):
 *  - a faixa vale até o limite INCLUSIVO; o preço é acumulado, não somado;
 *  - depois da última faixa, cada fração começada é cobrada inteira;
 *  - com "recomeçar", cada ciclo completo da tabela soma o maior valor e a
 *    tabela recomeça do início no que sobra.
 * A regra precisa ter passado em `validar` (faixas em ordem, fração ou recomeço).
 */
export function precoDaTabela(regra: Regra, minutos: number): Preco {
  const faixas = regra.faixas;
  const ultima = faixas[faixas.length - 1];
  if (!ultima) throw new Error(`regra "${regra.nome}" sem faixas`);

  const faixa = faixas.find((f) => minutos <= f.ateMinutos);
  if (faixa) {
    return {
      valorCentavos: faixa.valorCentavos,
      cobertoMinutos: faixa.ateMinutos,
      cobranca: { tipo: 'faixa', ateMinutos: faixa.ateMinutos },
    };
  }

  if (regra.recomecarTabela) {
    const ciclos = Math.floor(minutos / ultima.ateMinutos);
    const sobra = minutos - ciclos * ultima.ateMinutos;
    const base = ciclos * ultima.valorCentavos;
    const cobertoCiclos = ciclos * ultima.ateMinutos;
    if (sobra === 0) {
      return {
        valorCentavos: base,
        cobertoMinutos: cobertoCiclos,
        cobranca: { tipo: 'ciclos', ciclos, resto: null },
      };
    }
    const resto = precoDaTabela(regra, sobra);
    return {
      valorCentavos: base + resto.valorCentavos,
      cobertoMinutos: cobertoCiclos + resto.cobertoMinutos,
      cobranca: { tipo: 'ciclos', ciclos, resto: resto.cobranca },
    };
  }

  const fracao = regra.fracao;
  if (!fracao) throw new Error(`regra "${regra.nome}" sem fração nem recomeço`);
  const fracoes = Math.ceil((minutos - ultima.ateMinutos) / fracao.minutos);
  return {
    valorCentavos: ultima.valorCentavos + fracoes * fracao.valorCentavos,
    cobertoMinutos: ultima.ateMinutos + fracoes * fracao.minutos,
    cobranca: { tipo: 'fracao', ateMinutos: ultima.ateMinutos, fracoes },
  };
}
