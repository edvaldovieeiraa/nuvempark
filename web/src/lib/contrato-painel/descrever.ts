import {
  calcular,
  ContratoInvalido,
  type Cobranca,
  type Contrato,
  type Fatia,
  type Regra,
  type ResultadoContrato,
} from '../contrato';
import { instanteLocal, partesLocais } from '../contrato/fuso';
import { precoDaTabela } from '../contrato/tabela';
import { brl, duracaoTexto, horaRelogio, minutosParaHora } from './formato';

/**
 * Textos do simulador do contrato (design, "Memória de cálculo: textos"): uma
 * linha por fatia, o selo de motivo e os avisos de menor valor e de diária.
 */
export interface LinhaMemoria {
  titulo: string;
  valorCentavos: number;
  detalhe: string;
}

export interface Memoria {
  motivo: string;
  avisos: string[];
  linhas: LinhaMemoria[];
  permanencia: string;
  /** "ter 20/10 06:00". */
  pagoAte: string;
  restam: string;
}

export type Simulacao =
  | { ok: true; resultado: ResultadoContrato; memoria: Memoria }
  | { ok: false; mensagem: string };

const MS_MINUTO = 60_000;
const MAX_MINUTOS_ESTADIA = 10 * 366 * 1440;
const DIA_CURTO = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

/** Calcula e descreve; nunca lança para entrada ruim (spec, requisito 14). */
export function simular(params: {
  entrada: Date;
  saida: Date;
  contrato: Contrato;
  fuso: string;
}): Simulacao {
  const { entrada, saida } = params;
  if (!Number.isFinite(entrada.getTime()) || !Number.isFinite(saida.getTime())) {
    return { ok: false, mensagem: 'Informe a data e a hora de entrada e de saída.' };
  }
  if (saida.getTime() < entrada.getTime()) {
    return { ok: false, mensagem: 'A saída não pode ser antes da entrada.' };
  }
  if ((saida.getTime() - entrada.getTime()) / MS_MINUTO > MAX_MINUTOS_ESTADIA) {
    return { ok: false, mensagem: 'A estadia passa de 10 anos: confira as datas.' };
  }
  let resultado: ResultadoContrato;
  try {
    resultado = calcular(params);
  } catch (e) {
    if (e instanceof ContratoInvalido) {
      return { ok: false, mensagem: 'O contrato tem erros: corrija antes de simular.' };
    }
    throw e;
  }
  return { ok: true, resultado, memoria: descrever({ ...params, resultado }) };
}

export function descrever(params: {
  entrada: Date;
  saida: Date;
  contrato: Contrato;
  fuso: string;
  resultado: ResultadoContrato;
}): Memoria {
  const { entrada, saida, contrato, fuso, resultado } = params;
  const minutos = Math.floor((saida.getTime() - entrada.getTime()) / MS_MINUTO);
  const avisos: string[] = [];

  let motivo: string;
  const diarias = resultado.fatias.find((f) => f.tipo === 'diarias');
  if (diarias) {
    motivo = 'Diária';
    const avisoDiaria = avisoDaDiaria(contrato, minutos, diarias.quantidade);
    if (avisoDiaria) avisos.push(avisoDiaria);
  } else if (contrato.regras.length === 1) {
    motivo = 'Só a Padrão';
  } else {
    const comRegras = contrato.cobrarMenorValor
      ? calcular({ entrada, saida, contrato: { ...contrato, cobrarMenorValor: false }, fuso })
      : resultado;
    if (comRegras.totalCentavos > resultado.totalCentavos) {
      motivo = 'Menor valor: só pela Padrão';
      avisos.push(
        `Ficou com a cobrança só pela Padrão (${brl(resultado.totalCentavos)}), menor que com as regras (${brl(comRegras.totalCentavos)}).`,
      );
    } else if (resultado.fatias.every((f) => f.tipo === 'regra' && f.regra === 'Padrão')) {
      motivo = 'Só a Padrão';
    } else {
      const n = resultado.fatias.length;
      motivo = `Por regras de horário · ${n} ${n === 1 ? 'fatia' : 'fatias'}`;
    }
  }

  return {
    motivo,
    avisos,
    linhas: resultado.fatias.map((f) => linha(f, contrato, fuso)),
    permanencia: duracaoTexto(minutos),
    pagoAte: quando(resultado.pagoAte, fuso, true),
    restam: duracaoTexto(resultado.minutosRestantes),
  };
}

/** A diária só aparece quando a tabela da sobra a alcança: diz quanto daria. */
function avisoDaDiaria(c: Contrato, minutos: number, quantidade: number): string | null {
  const padrao = c.regras[0];
  if (!padrao || c.diariaCentavos === null) return null;
  const cheias = minutos <= 1440 ? 0 : Math.floor((minutos - 1) / 1440);
  if (quantidade !== cheias + 1) return null;
  const tabela = precoDaTabela(padrao, minutos - cheias * 1440).valorCentavos;
  return `A diária (${brl(c.diariaCentavos)}) não sai mais cara que a tabela (${brl(tabela)}) e cobre mais tempo.`;
}

function linha(f: Fatia, c: Contrato, fuso: string): LinhaMemoria {
  const periodo = `${quando(f.inicio, fuso)} → ${quandoFim(f.inicio, f.fim, fuso)}`;
  if (f.tipo === 'diarias') {
    const um = f.quantidade === 1;
    return {
      titulo: um ? 'Diária' : 'Diárias',
      valorCentavos: f.valorCentavos,
      detalhe: `${periodo} · ${f.quantidade} ${um ? 'diária' : 'diárias'} de ${brl(c.diariaCentavos ?? 0)} (24 h corridas desde a entrada)`,
    };
  }
  const regra = c.regras.find((r) => r.nome === f.regra);
  return {
    titulo: f.regra,
    valorCentavos: f.valorCentavos,
    detalhe: `${periodo} · ${comoSaiu(f.minutos, f.cobranca, regra)}${corte(f, regra, c, fuso)}`,
  };
}

function comoSaiu(minutos: number, cobranca: Cobranca, regra: Regra | undefined): string {
  const dur = duracaoTexto(minutos);
  switch (cobranca.tipo) {
    case 'faixa':
      return `${dur} na faixa “até ${minutosParaHora(cobranca.ateMinutos)}”`;
    case 'fracao': {
      const n = cobranca.fracoes;
      const tamanho = regra?.fracao ? ` de ${minutosParaHora(regra.fracao.minutos)}` : '';
      return `${dur} · última faixa “até ${minutosParaHora(cobranca.ateMinutos)}” + ${n} ${n === 1 ? 'fração' : 'frações'}${tamanho}`;
    }
    case 'ciclos': {
      const n = cobranca.ciclos;
      const ultima = regra?.faixas[regra.faixas.length - 1];
      const valor = ultima ? ` (${brl(n * ultima.valorCentavos)})` : '';
      const resto = cobranca.resto ? ` + ${restoTexto(cobranca.resto)}` : '';
      return `${dur} · ${n} ${n === 1 ? 'ciclo' : 'ciclos'} da tabela${valor}${resto}`;
    }
  }
}

function restoTexto(c: Cobranca): string {
  if (c.tipo === 'faixa') return `faixa “até ${minutosParaHora(c.ateMinutos)}”`;
  if (c.tipo === 'fracao') return `última faixa “até ${minutosParaHora(c.ateMinutos)}” + ${c.fracoes} fração(ões)`;
  return `${c.ciclos} ciclo(s)`;
}

/**
 * Por que a fatia ficou paga até onde ficou. Compara o fim com o que a tabela
 * cobriria sozinha: se o fim veio antes, a fatia foi cortada — pelo começo de
 * outra regra ou pelo fim da própria janela.
 */
function corte(
  f: Extract<Fatia, { tipo: 'regra' }>,
  regra: Regra | undefined,
  c: Contrato,
  fuso: string,
): string {
  if (!regra) return '';
  const coberto = f.inicio.getTime() + precoDaTabela(regra, f.minutos).cobertoMinutos * MS_MINUTO;
  const fim = horaRelogio(partesLocais(f.fim, fuso).minutoDoDia);
  const horario = regra.inicio !== null;
  if (f.fim.getTime() < coberto) {
    const seguinte = regraQueComeca(f.fim, c, fuso);
    if (seguinte && (!horario || regra.usarMinutosPagos)) {
      return `, paga até o começo do ${seguinte.nome} (${fim})`;
    }
    if (horario) return `, paga até o fim da janela (${fim})`;
    return seguinte ? `, paga até o começo do ${seguinte.nome} (${fim})` : '';
  }
  if (horario && regra.usarMinutosPagos) return `, paga até ${fim} (usa todos os minutos pagos)`;
  return '';
}

function regraQueComeca(instante: Date, c: Contrato, fuso: string): Regra | undefined {
  const p = partesLocais(instante, fuso);
  return c.regras.find(
    (r, i) => i > 0 && r.inicio === p.minutoDoDia && (r.dias ?? []).includes(p.diaSemana),
  );
}

/** "seg 19:00"; com data: "seg 19/10 19:00". */
function quando(d: Date, fuso: string, comData = false): string {
  const p = partesLocais(d, fuso);
  const data = comData ? ` ${String(p.dia).padStart(2, '0')}/${String(p.mes).padStart(2, '0')}` : '';
  return `${DIA_CURTO[p.diaSemana - 1]}${data} ${horaRelogio(p.minutoDoDia)}`;
}

/** Fim do período: só a hora no mesmo dia; dia da semana em outro; data se passar de 6 dias. */
function quandoFim(inicio: Date, fim: Date, fuso: string): string {
  const a = partesLocais(inicio, fuso);
  const b = partesLocais(fim, fuso);
  if (a.ano === b.ano && a.mes === b.mes && a.dia === b.dia) return horaRelogio(b.minutoDoDia);
  return quando(fim, fuso, fim.getTime() - inicio.getTime() > 6 * 86_400_000);
}

/** Valor de `<input type="datetime-local">` lido no fuso do pátio, não no do navegador. */
export function instanteDoCampo(valor: string, fuso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valor);
  if (!m) return null;
  const [ano, mes, dia, h, min] = m.slice(1).map(Number) as [number, number, number, number, number];
  const conferido = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    conferido.getUTCMonth() !== mes - 1 ||
    conferido.getUTCDate() !== dia ||
    h > 23 ||
    min > 59
  ) {
    return null;
  }
  return instanteLocal(ano, mes, dia, h * 60 + min, fuso);
}

export function campoDoInstante(d: Date, fuso: string): string {
  const p = partesLocais(d, fuso);
  const z = (n: number) => String(n).padStart(2, '0');
  return `${p.ano}-${z(p.mes)}-${z(p.dia)}T${horaRelogio(p.minutoDoDia)}`;
}

/**
 * Exemplo calculado ao vivo embaixo da regra ("2h30 = R$ 20,00"). Sem
 * exemplo enquanto a tabela estiver incompleta.
 */
export function exemploDaRegra(regra: Regra): string | null {
  const faixas = regra.faixas;
  const primeira = faixas[0];
  const ultima = faixas[faixas.length - 1];
  if (!primeira || !ultima) return null;
  const numeros = [
    ...faixas.flatMap((f) => [f.ateMinutos, f.valorCentavos]),
    ...(regra.fracao ? [regra.fracao.minutos, regra.fracao.valorCentavos] : []),
  ];
  if (numeros.some((n) => !Number.isFinite(n))) return null;

  if (regra.recomecarTabela) {
    const minutos = ultima.ateMinutos + primeira.ateMinutos;
    const total = precoDaTabela(regra, minutos).valorCentavos;
    return `${duracaoTexto(minutos)} = 1 ciclo ${brl(ultima.valorCentavos)} + até ${minutosParaHora(primeira.ateMinutos)} ${brl(primeira.valorCentavos)} = ${brl(total)}`;
  }
  if (!regra.fracao || regra.fracao.minutos < 1) return null;
  const minutos = ultima.ateMinutos + regra.fracao.minutos + Math.floor(regra.fracao.minutos / 2);
  return `${duracaoTexto(minutos)} = ${brl(precoDaTabela(regra, minutos).valorCentavos)}`;
}
