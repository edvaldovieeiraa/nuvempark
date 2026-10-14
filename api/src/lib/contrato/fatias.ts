import type { Fatia, Regra } from './modelo.js';
import { instanteLocal, partesLocais, somarDias } from './fuso.js';
import { precoDaTabela } from './tabela.js';

const MS_MINUTO = 60_000;

/** Uma ocorrência concreta da janela de uma regra. */
interface Janela {
  regra: Regra;
  de: number;
  ate: number;
}

export interface Fatiamento {
  fatias: Fatia[];
  pagoAte: number;
}

/**
 * Corta a estadia [e, s] (ms, minuto cheio) pelas janelas das regras
 * (golden S23–S40). A Padrão cobre o que nenhuma janela cobre. Cada fatia
 * recomeça a tabela da sua regra.
 *
 * - Fatia de regra: a tabela é aplicada ao tempo dentro da janela, e a fatia
 *   fica paga até o menor entre o fim da faixa/fração e o fim da janela. Com
 *   "usar minutos pagos", vale a faixa inteira, mesmo depois da janela (S31).
 * - Fatia da Padrão: vai até a próxima janela ou a saída; fica paga até o fim
 *   da faixa, mas nunca além do começo da próxima janela.
 *
 * Escolhas que o CloudPark não mostrou (spec, tabela a–f): os minutos pagos
 * também param no começo da próxima janela; uma fatia da Padrão curta antes
 * de uma janela não empurra o começo da regra.
 */
export function fatiar(e: number, s: number, regras: Regra[], fuso: string): Fatiamento {
  const padrao = regras[0];
  if (!padrao) throw new Error('contrato sem regras');
  const janelas = gerarJanelas(regras.slice(1), e, s, fuso);

  const fatias: Fatia[] = [];
  let cursor = e;
  // As janelas não se sobrepõem (`validar`) e o cursor só avança: um ponteiro
  // para a primeira janela que ainda não terminou basta.
  let i = 0;
  for (;;) {
    while (i < janelas.length && janelas[i]!.ate <= cursor) i++;
    const atual = janelas[i];
    const janela = atual && atual.de <= cursor ? atual : undefined;
    const proxima = janela ? janelas[i + 1] : atual;
    const proximoInicio = proxima ? proxima.de : Number.POSITIVE_INFINITY;
    const regra = janela ? janela.regra : padrao;
    const limite = janela ? janela.ate : proximoInicio;
    const minutos = (Math.min(s, limite) - cursor) / MS_MINUTO;
    const preco = precoDaTabela(regra, minutos);
    const cobertoAte = cursor + preco.cobertoMinutos * MS_MINUTO;
    const fim =
      janela && regra.usarMinutosPagos
        ? Math.min(cobertoAte, proximoInicio)
        : Math.min(cobertoAte, limite);

    fatias.push({
      tipo: 'regra',
      regra: regra.nome,
      inicio: new Date(cursor),
      fim: new Date(fim),
      minutos,
      cobranca: preco.cobranca,
      valorCentavos: preco.valorCentavos,
    });
    if (s <= fim) return { fatias, pagoAte: fim };
    cursor = fim;
  }
}

/**
 * Janelas de cada regra entre a véspera da entrada (a janela que cruza a
 * meia-noite começa no dia anterior) e dois dias depois da saída (a Padrão e
 * os minutos pagos olham a próxima janela). Ordenadas pelo início.
 */
function gerarJanelas(regras: Regra[], e: number, s: number, fuso: string): Janela[] {
  const janelas: Janela[] = [];
  const primeiro = partesLocais(new Date(e), fuso);
  const ultimo = partesLocais(new Date(s), fuso);
  const dias = Math.round(
    (Date.UTC(ultimo.ano, ultimo.mes - 1, ultimo.dia) -
      Date.UTC(primeiro.ano, primeiro.mes - 1, primeiro.dia)) /
      86_400_000,
  );
  for (let k = -1; k <= dias + 2; k++) {
    const d = somarDias(primeiro.ano, primeiro.mes, primeiro.dia, k);
    const diaSemana = new Date(Date.UTC(d.ano, d.mes - 1, d.dia)).getUTCDay() || 7;
    for (const regra of regras) {
      if (regra.inicio === null || regra.fim === null || !regra.dias?.includes(diaSemana)) continue;
      const de = instanteLocal(d.ano, d.mes, d.dia, regra.inicio, fuso).getTime();
      const fimDia = regra.fim > regra.inicio ? d : somarDias(d.ano, d.mes, d.dia, 1);
      const ate = instanteLocal(fimDia.ano, fimDia.mes, fimDia.dia, regra.fim, fuso).getTime();
      janelas.push({ regra, de, ate });
    }
  }
  return janelas.sort((a, b) => a.de - b.de);
}
