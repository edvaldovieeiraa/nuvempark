import { LIMITE_MINUTOS } from '../contrato/validar';
import type { Contrato, Faixa } from '../contrato';
import type { TarifaSim } from '../tarifa-engine';
import { brl, horaRelogio, minutosParaHora } from './formato';

export interface AvisoConversao {
  /** `info` = azul; `atencao` = âmbar (muda o que se cobra). */
  tom: 'info' | 'atencao';
  texto: string;
}

export interface Conversao {
  contrato: Contrato;
  avisos: AvisoConversao[];
  /** Caminho no contrato → etiqueta de origem ("veio do teto"). */
  origem: Record<string, string>;
}

const centavos = (reais: number) => Math.round(Number(reais) * 100);

/**
 * Tarifa avulsa (motor v1) → contrato, como ponto de partida editável (spec,
 * requisito 15). A tarifa original não muda.
 *
 * Para minutos inteiros, sem pernoite e até 24 h, o contrato cobra o mesmo que
 * a tarifa (teste de equivalência em `converter.test.ts`):
 *  - tolerância T > 0 → faixa "até T = R$ 0";
 *  - fração inicial FI → faixa "até FI = valor inicial"; se FI não passa de T,
 *    a primeira faixa paga é o primeiro limite FI + k·FA acima de T, com o
 *    valor que o v1 cobra nele (o v1 já soma as frações adicionais de FI até lá);
 *  - frações adicionais → fração;
 *  - teto → diária (o v1 troca pelo teto quando a tabela o alcança; a diária idem).
 */
export function contratoDeTarifa(t: TarifaSim): Conversao {
  const tol = Math.max(0, Math.trunc(Number(t.tolerancia_minutos)));
  const fi = Math.max(0, Math.trunc(Number(t.fracao_inicial_minutos)));
  const fa = Math.trunc(Number(t.fracao_adicional_minutos));
  const fiv = centavos(t.fracao_inicial_valor);
  const fav = centavos(t.fracao_adicional_valor);
  const teto = centavos(t.teto_diaria);

  const avisos: AvisoConversao[] = [];
  const origem: Record<string, string> = {};
  const faixas: Faixa[] = [];

  if (tol > 0) {
    origem[`regras[0].faixas[${faixas.length}]`] = 'veio da tolerância';
    faixas.push({ ateMinutos: tol, valorCentavos: 0 });
  }

  origem[`regras[0].faixas[${faixas.length}]`] = 'veio da fração inicial';
  if (fi > tol) {
    faixas.push({ ateMinutos: fi, valorCentavos: fiv });
  } else {
    // Menor k ≥ 1 com FI + k·FA > T. Com FA inválida (≤ 0) fica k = 1 e o
    // `validar` aponta a fração no editor.
    const k = fa > 0 ? Math.floor((tol - fi) / fa) + 1 : 1;
    const ate = fi + k * Math.max(fa, 0);
    const valor = fiv + k * fav;
    faixas.push({ ateMinutos: ate, valorCentavos: valor });
    if (tol > 0) {
      avisos.push({
        tom: 'atencao',
        texto: `A fração inicial (${minutosParaHora(fi)}) não passa da tolerância (${minutosParaHora(tol)}): a primeira faixa paga virou “até ${minutosParaHora(ate)}” (${brl(valor)}), para cobrar o mesmo que hoje. Confira no Simular.`,
      });
    }
  }
  origem['regras[0].fracao'] = 'veio das frações adicionais';

  const diariaCentavos = teto > 0 ? teto : null;
  if (diariaCentavos !== null) origem.diaria_centavos = 'veio do teto';

  const maiorMinuto = Math.max(fa, ...faixas.map((f) => f.ateMinutos));
  const contrato: Contrato = {
    versao: 1,
    maisDe24h: diariaCentavos === null && maiorMinuto > LIMITE_MINUTOS,
    diariaCentavos,
    cobrarMenorValor: false,
    regras: [
      {
        nome: 'Padrão',
        inicio: null,
        fim: null,
        dias: null,
        usarMinutosPagos: false,
        recomecarTabela: false,
        faixas,
        fracao: { minutos: fa, valorCentavos: fav },
      },
    ],
  };

  if (Number(t.pernoite_valor) > 0) {
    const janela = `das ${horaRelogio((Number(t.pernoite_hora_inicio) % 24) * 60)} às ${horaRelogio((Number(t.pernoite_hora_fim) % 24) * 60)}`;
    const como =
      diariaCentavos !== null
        ? 'desligue a diária e adicione uma regra por horário (diária junto com regra por horário ainda não é suportada).'
        : 'adicione uma regra por horário.';
    avisos.unshift({
      tom: 'atencao',
      texto: `A pernoite não foi convertida. A tarifa cobra ${brl(centavos(t.pernoite_valor))} de quem fica ${janela}. Para cobrar a noite à parte, ${como}`,
    });
  }

  if (tol > 0) {
    avisos.push({
      tom: 'info',
      texto: `A tolerância de ${tol} min virou a faixa grátis “até ${minutosParaHora(tol)}”. Ela passa a contar minutos inteiros: ${tol} min 59 s continua grátis (hoje já cobra).`,
    });
  } else {
    avisos.push({
      tom: 'atencao',
      texto: `Sem tolerância, não há faixa grátis: entrada e saída no mesmo instante passam a cobrar a primeira faixa (${brl(faixas[0]!.valorCentavos)}). Hoje saem grátis.`,
    });
  }

  return { contrato, avisos, origem };
}
