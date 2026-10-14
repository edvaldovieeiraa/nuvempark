import type { Contrato, Fatia, ResultadoContrato } from './modelo';
import { fatiar, type Fatiamento } from './fatias';
import { precoDaTabela } from './tabela';
import { validar, type ErroContrato } from './validar';

const MS_MINUTO = 60_000;
const MINUTOS_DIA = 24 * 60;

export class ContratoInvalido extends Error {
  constructor(public readonly erros: ErroContrato[]) {
    super(`contrato inválido: ${erros.map((e) => `${e.caminho} ${e.codigo}`).join(', ')}`);
    this.name = 'ContratoInvalido';
  }
}

/**
 * Valor da estadia pelo contrato. A duração é medida em minutos inteiros,
 * truncando os segundos (como o motor v1); as janelas são calculadas a partir
 * da entrada truncada ao minuto.
 */
export function calcular(params: {
  entrada: Date;
  saida: Date;
  contrato: Contrato;
  fuso: string;
}): ResultadoContrato {
  const { entrada, saida, contrato, fuso } = params;
  if (saida.getTime() < entrada.getTime()) {
    throw new Error('saida deve ser igual ou posterior à entrada');
  }
  const erros = validar(contrato);
  if (erros.length > 0) throw new ContratoInvalido(erros);

  const minutos = Math.floor((saida.getTime() - entrada.getTime()) / MS_MINUTO);
  const e = Math.floor(entrada.getTime() / MS_MINUTO) * MS_MINUTO;
  const s = e + minutos * MS_MINUTO;

  let escolhido: Fatiamento;
  if (contrato.diariaCentavos !== null) {
    escolhido = comDiaria(e, minutos, contrato, contrato.diariaCentavos);
  } else {
    escolhido = fatiar(e, s, contrato.regras, fuso);
    if (contrato.cobrarMenorValor) {
      // Menor valor entre todas as regras e só a Padrão (S33–S37). Empate fica
      // com todas as regras.
      const soPadrao = fatiar(e, s, contrato.regras.slice(0, 1), fuso);
      if (total(soPadrao.fatias) < total(escolhido.fatias)) escolhido = soPadrao;
    }
  }

  return {
    totalCentavos: total(escolhido.fatias),
    minutosRestantes: (escolhido.pagoAte - s) / MS_MINUTO,
    pagoAte: new Date(escolhido.pagoAte),
    fatias: escolhido.fatias,
  };
}

/**
 * Diária a cada 24 h corridas desde a entrada (S10–S16): até 24 h, o menor
 * entre a diária e a tabela; acima disso, diárias cheias + o menor entre a
 * diária e a tabela aplicada à sobra. Empate fica com a diária, que cobre
 * mais tempo pelo mesmo preço. `validar` garante que só há a Padrão.
 */
function comDiaria(e: number, minutos: number, contrato: Contrato, diaria: number): Fatiamento {
  const padrao = contrato.regras[0];
  if (!padrao) throw new Error('contrato sem regras');
  const cheias = minutos <= MINUTOS_DIA ? 0 : Math.floor((minutos - 1) / MINUTOS_DIA);
  const sobra = minutos - cheias * MINUTOS_DIA;
  const inicioSobra = e + cheias * MINUTOS_DIA * MS_MINUTO;
  const preco = precoDaTabela(padrao, sobra);

  const diarias = (quantidade: number): Fatia => ({
    tipo: 'diarias',
    quantidade,
    inicio: new Date(e),
    fim: new Date(e + quantidade * MINUTOS_DIA * MS_MINUTO),
    valorCentavos: quantidade * diaria,
  });

  if (preco.valorCentavos >= diaria) {
    const f = diarias(cheias + 1);
    return { fatias: [f], pagoAte: f.fim.getTime() };
  }
  const fim = inicioSobra + preco.cobertoMinutos * MS_MINUTO;
  const tabela: Fatia = {
    tipo: 'regra',
    regra: padrao.nome,
    inicio: new Date(inicioSobra),
    fim: new Date(fim),
    minutos: sobra,
    cobranca: preco.cobranca,
    valorCentavos: preco.valorCentavos,
  };
  return { fatias: cheias > 0 ? [diarias(cheias), tabela] : [tabela], pagoAte: fim };
}

function total(fatias: Fatia[]): number {
  return fatias.reduce((soma, f) => soma + f.valorCentavos, 0);
}
