/**
 * Modelo do contrato do motor de tarifa v2 (spec `tarifa-contrato`).
 *
 * O contrato chega como JSON em snake_case (coluna `tarifas.contrato`, golden)
 * e vira tipos camelCase aqui. Dinheiro em CENTAVOS inteiros, tempo em MINUTOS
 * inteiros. Mesmos nomes em `web/src/lib/contrato/` e no Dart
 * (`app/lib/features/tarifa/domain/contrato/`): mudou aqui, muda lá.
 */

export interface Faixa {
  /** Limite inclusivo, em minutos desde o início da fatia. */
  ateMinutos: number;
  /** Preço ACUMULADO até este limite. */
  valorCentavos: number;
}

export interface Fracao {
  minutos: number;
  valorCentavos: number;
}

export interface Regra {
  nome: string;
  /** Minuto do dia (0–1439) em que a janela começa. Nulo na Padrão. */
  inicio: number | null;
  /** Minuto do dia em que a janela termina; menor que `inicio` = cruza a meia-noite. */
  fim: number | null;
  /** Dias ISO (1 = segunda … 7 = domingo) em que a janela COMEÇA. Nulo na Padrão. */
  dias: number[] | null;
  usarMinutosPagos: boolean;
  recomecarTabela: boolean;
  faixas: Faixa[];
  fracao: Fracao | null;
}

export interface Contrato {
  versao: 1;
  maisDe24h: boolean;
  diariaCentavos: number | null;
  cobrarMenorValor: boolean;
  /** A primeira é sempre a "Padrão". */
  regras: Regra[];
}

/** Como o valor de uma fatia saiu da tabela da regra. */
export type Cobranca =
  | { tipo: 'faixa'; ateMinutos: number }
  | { tipo: 'fracao'; ateMinutos: number; fracoes: number }
  | { tipo: 'ciclos'; ciclos: number; resto: Cobranca | null };

export type Fatia =
  | {
      tipo: 'regra';
      regra: string;
      inicio: Date;
      /** Até onde a fatia está paga. */
      fim: Date;
      /** Minutos cobrados nesta fatia (entrada da tabela). */
      minutos: number;
      cobranca: Cobranca;
      valorCentavos: number;
    }
  | {
      tipo: 'diarias';
      quantidade: number;
      inicio: Date;
      fim: Date;
      valorCentavos: number;
    };

export interface ResultadoContrato {
  totalCentavos: number;
  /** Minutos já pagos depois da saída. */
  minutosRestantes: number;
  pagoAte: Date;
  fatias: Fatia[];
}

/** Erro de leitura: o JSON não tem a forma de um contrato. */
export class ContratoMalformado extends Error {
  constructor(public readonly caminho: string) {
    super(`contrato malformado em ${caminho}`);
    this.name = 'ContratoMalformado';
  }
}

type Json = Record<string, unknown>;

/**
 * Lê o JSON do contrato. Só confere a FORMA (tipos dos campos); as regras de
 * negócio ficam em `validar`.
 */
export function lerContrato(json: unknown): Contrato {
  const c = objeto(json, 'contrato');
  if (c.versao !== 1) throw new ContratoMalformado('versao');
  const regras = c.regras;
  if (!Array.isArray(regras)) throw new ContratoMalformado('regras');
  return {
    versao: 1,
    maisDe24h: bool(c.mais_de_24h, 'mais_de_24h'),
    diariaCentavos: inteiroOuNulo(c.diaria_centavos, 'diaria_centavos'),
    cobrarMenorValor: bool(c.cobrar_menor_valor, 'cobrar_menor_valor'),
    regras: regras.map((r, i) => lerRegra(r, `regras[${i}]`)),
  };
}

function lerRegra(json: unknown, caminho: string): Regra {
  const r = objeto(json, caminho);
  const faixas = r.faixas;
  if (!Array.isArray(faixas)) throw new ContratoMalformado(`${caminho}.faixas`);
  const dias = r.dias;
  if (dias !== null && dias !== undefined && !Array.isArray(dias)) {
    throw new ContratoMalformado(`${caminho}.dias`);
  }
  return {
    nome: texto(r.nome, `${caminho}.nome`),
    inicio: horaOuNulo(r.inicio, `${caminho}.inicio`),
    fim: horaOuNulo(r.fim, `${caminho}.fim`),
    dias: Array.isArray(dias)
      ? dias.map((d, i) => inteiro(d, `${caminho}.dias[${i}]`))
      : null,
    usarMinutosPagos: bool(r.usar_minutos_pagos, `${caminho}.usar_minutos_pagos`),
    recomecarTabela: bool(r.recomecar_tabela, `${caminho}.recomecar_tabela`),
    faixas: faixas.map((f, i) => {
      const o = objeto(f, `${caminho}.faixas[${i}]`);
      return {
        ateMinutos: inteiro(o.ate_minutos, `${caminho}.faixas[${i}].ate_minutos`),
        valorCentavos: inteiro(o.valor_centavos, `${caminho}.faixas[${i}].valor_centavos`),
      };
    }),
    fracao:
      r.fracao === null || r.fracao === undefined
        ? null
        : (() => {
            const o = objeto(r.fracao, `${caminho}.fracao`);
            return {
              minutos: inteiro(o.minutos, `${caminho}.fracao.minutos`),
              valorCentavos: inteiro(o.valor_centavos, `${caminho}.fracao.valor_centavos`),
            };
          })(),
  };
}

function objeto(v: unknown, caminho: string): Json {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new ContratoMalformado(caminho);
  }
  return v as Json;
}

function bool(v: unknown, caminho: string): boolean {
  if (typeof v !== 'boolean') throw new ContratoMalformado(caminho);
  return v;
}

function texto(v: unknown, caminho: string): string {
  if (typeof v !== 'string') throw new ContratoMalformado(caminho);
  return v;
}

function inteiro(v: unknown, caminho: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v)) throw new ContratoMalformado(caminho);
  return v;
}

function inteiroOuNulo(v: unknown, caminho: string): number | null {
  return v === null || v === undefined ? null : inteiro(v, caminho);
}

/** "HH:MM" → minuto do dia. */
function horaOuNulo(v: unknown, caminho: string): number | null {
  if (v === null || v === undefined) return null;
  const m = typeof v === 'string' ? /^(\d{2}):(\d{2})$/.exec(v) : null;
  if (!m) throw new ContratoMalformado(caminho);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) throw new ContratoMalformado(caminho);
  return h * 60 + min;
}
