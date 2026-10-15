import {
  ContratoMalformado,
  lerContrato,
  validar,
  type Contrato,
  type ErroContrato,
} from '../contrato';
import { horaRelogio, MAX_CENTAVOS } from './formato';

/** O contrato vai inteiro num campo do formulário; 20 regras × 50 faixas cabem com folga. */
export const MAX_JSON = 64 * 1024;

/** Formato gravado em `tarifas.contrato` (snake_case, igual ao golden). */
export interface ContratoJson {
  versao: 1;
  mais_de_24h: boolean;
  diaria_centavos: number | null;
  cobrar_menor_valor: boolean;
  regras: Array<{
    nome: string;
    inicio: string | null;
    fim: string | null;
    dias: number[] | null;
    usar_minutos_pagos: boolean;
    recomecar_tabela: boolean;
    faixas: Array<{ ate_minutos: number; valor_centavos: number }>;
    fracao: { minutos: number; valor_centavos: number } | null;
  }>;
}

export type Preparo =
  | { ok: true; contrato: Contrato; json: ContratoJson }
  | { ok: false; erros: ErroContrato[] };

export function contratoParaJson(c: Contrato): ContratoJson {
  return {
    versao: 1,
    mais_de_24h: c.maisDe24h,
    diaria_centavos: c.diariaCentavos,
    cobrar_menor_valor: c.cobrarMenorValor,
    regras: c.regras.map((r) => ({
      nome: r.nome,
      inicio: r.inicio === null ? null : horaRelogio(r.inicio),
      fim: r.fim === null ? null : horaRelogio(r.fim),
      dias: r.dias === null ? null : [...r.dias],
      usar_minutos_pagos: r.usarMinutosPagos,
      recomecar_tabela: r.recomecarTabela,
      faixas: r.faixas.map((f) => ({ ate_minutos: f.ateMinutos, valor_centavos: f.valorCentavos })),
      fracao:
        r.fracao === null
          ? null
          : { minutos: r.fracao.minutos, valor_centavos: r.fracao.valorCentavos },
    })),
  };
}

/**
 * O que as server actions rodam antes de gravar (spec, requisito 7): nunca
 * confiam no navegador. Lê a forma, roda o `validar` do motor e os limites do
 * painel, e devolve o JSON normalizado (sem chaves desconhecidas).
 */
export function prepararContrato(texto: unknown): Preparo {
  const falha = (codigo: string, caminho = 'contrato'): Preparo => ({
    ok: false,
    erros: [{ caminho, codigo }],
  });
  if (typeof texto !== 'string') return falha('json_invalido');
  if (texto.length > MAX_JSON) return falha('contrato_grande');

  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return falha('json_invalido');
  }

  let contrato: Contrato;
  try {
    contrato = lerContrato(bruto);
  } catch (e) {
    if (e instanceof ContratoMalformado) return falha('malformado', e.caminho);
    throw e;
  }

  const erros = [...validar(contrato), ...acimaDoMaximo(contrato)];
  if (erros.length > 0) return { ok: false, erros };
  return { ok: true, contrato, json: contratoParaJson(contrato) };
}

/** Teto do painel: R$ 99.999,99 por campo de valor. */
function acimaDoMaximo(c: Contrato): ErroContrato[] {
  const erros: ErroContrato[] = [];
  c.regras.forEach((r, i) => {
    r.faixas.forEach((f, j) => {
      if (f.valorCentavos > MAX_CENTAVOS) {
        erros.push({ caminho: `regras[${i}].faixas[${j}].valor_centavos`, codigo: 'valor_maximo' });
      }
    });
    if (r.fracao && r.fracao.valorCentavos > MAX_CENTAVOS) {
      erros.push({ caminho: `regras[${i}].fracao.valor_centavos`, codigo: 'valor_maximo' });
    }
  });
  if (c.diariaCentavos !== null && c.diariaCentavos > MAX_CENTAVOS) {
    erros.push({ caminho: 'diaria_centavos', codigo: 'valor_maximo' });
  }
  return erros;
}
