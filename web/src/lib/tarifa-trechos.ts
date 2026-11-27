/**
 * Núcleo do cálculo de tarifa com regras de horário — função pura, sem imports.
 *
 * CÓPIA IDÊNTICA em `api/src/lib/tarifa-trechos.ts` e
 * `web/src/lib/tarifa-trechos.ts` (o teste `tarifa-paridade.test.ts` da API
 * confere byte a byte). Port LITERAL do Dart
 * `app/lib/features/tarifa/domain/tarifa_engine.dart` + `regra_horario.dart`.
 * Os três motores rodam `testdata/tarifa-casos.json`: mudou a regra aqui, mude
 * no Dart, na outra cópia e no arquivo de casos.
 *
 * Precedência (spec regras-horario-tarifa, req. 4):
 *  1. Tolerância  → R$ 0,00 (sobre a estadia inteira, em segundos)
 *  2. Pernoite    → pernoite_valor (janela no relógio de Brasília)
 *  3. Trechos     → cada trecho pela regra em vigor ou pelo preço base
 *  4. Teto diária → sobre a SOMA dos trechos
 *
 * Horários SEMPRE no relógio de Brasília (UTC−3 fixo, sem horário de verão
 * desde 2019), qualquer que seja o fuso do servidor ou do navegador. Dinheiro
 * em centavos inteiros.
 */

/** Versão das regras que este código entende (token `regras_horario_v1`). */
export const REGRAS_HORARIO_VERSAO_SUPORTADA = 1;

/** "Até `ateMinutos` minutos, cobrar `centavos`". */
export interface DegrauPreco {
  ateMinutos: number;
  centavos: number;
}

/** Uma regra de horário (coluna `tarifas.regras_horario`). */
export interface RegraHorario {
  id: string;
  nome: string;
  /** Dias ISO: 1 = segunda … 7 = domingo. */
  dias: number[];
  /** Minutos desde 00:00. Fim < início = vira o dia; fim == início = dia todo. */
  inicioMinutos: number;
  fimMinutos: number;
  /** Entrada dentro desta regra → ela cobra a estadia inteira. */
  cobrarDoInicio: boolean;
  /** Ordenados por `ateMinutos`. */
  degraus: DegrauPreco[];
  adicionalMinutos: number;
  adicionalCentavos: number;
  /** Versão mínima do app/motor que sabe cobrar esta regra. */
  requer: number;
}

export type MotivoCalculo = 'tolerancia' | 'normal' | 'tetoDiaria' | 'pernoite';

export interface TrechoCobranca {
  inicio: Date;
  fim: Date;
  minutos: number;
  centavos: number;
  /** null = preço base. */
  regraId: string | null;
  regraNome: string | null;
}

export interface ConfigCalculo {
  toleranciaMinutos: number;
  fracaoInicialMinutos: number;
  fracaoInicialValor: number;
  fracaoAdicionalMinutos: number;
  fracaoAdicionalValor: number;
  /** 0 = desligado. */
  tetoDiaria: number;
  /** 0 = desligado. */
  pernoiteValor: number;
  pernoiteHoraInicio: number;
  pernoiteHoraFim: number;
  regras: RegraHorario[];
}

export interface ResultadoCalculo {
  /** Em reais, como hoje (centavos / 100; no pernoite, o valor da tabela). */
  valor: number;
  centavos: number;
  duracaoMinutos: number;
  motivo: MotivoCalculo;
  /** Vazio na tolerância e no pernoite. */
  trechos: TrechoCobranca[];
  /** Soma dos trechos antes do teto (0 na tolerância e no pernoite). */
  centavosSemTeto: number;
}

const SEGUNDO = 1_000;
const MINUTO = 60_000;
const HORA = 3_600_000;
const DIA = 86_400_000;
const BRASILIA = 3 * HORA;

// ── parse do JSON ───────────────────────────────────────────────────────────

/**
 * Aceita a lista já decodificada, o texto JSON ou nulo. Nulo, vazio ou
 * inválido → lista vazia (tabela sem regras = cobrança de hoje). Uma regra com
 * tipo inesperado some sozinha, sem derrubar as outras.
 */
export function regrasDoJson(raw: unknown): RegraHorario[] {
  let valor: unknown = raw;
  if (typeof valor === 'string') {
    if (valor.trim() === '') return [];
    try {
      valor = JSON.parse(valor);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(valor)) return [];
  const out: RegraHorario[] = [];
  for (const item of valor) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) continue;
    try {
      const regra = deMapa(item as Record<string, unknown>);
      if (regra) out.push(regra);
    } catch {
      // regra malformada: só ela some
    }
  }
  return out;
}

/** `as num?` do Dart: ausente/nulo → null; outro tipo → erro (descarta a regra). */
function numOpcional(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('tipo');
  return v;
}

/** `as List?` do Dart: ausente/nulo → []; outro tipo → erro. */
function listaOpcional(v: unknown): unknown[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new Error('tipo');
  return v;
}

function deMapa(m: Record<string, unknown>): RegraHorario | null {
  // `requer` PRIMEIRO: uma regra de versão futura pode ter outro formato, e
  // descartá-la faria a tabela ser cobrada pelo preço base. Ela entra como
  // marcador (sem dias, nunca casa com um horário).
  const requer = Math.trunc(numOpcional(m.requer) ?? 1);
  const id = `${m.id ?? ''}`;
  const nome = `${m.nome ?? 'Regra'}`;
  if (requer > REGRAS_HORARIO_VERSAO_SUPORTADA) {
    return {
      id,
      nome,
      dias: [],
      inicioMinutos: 0,
      fimMinutos: 0,
      cobrarDoInicio: false,
      degraus: [{ ateMinutos: 0, centavos: 0 }],
      adicionalMinutos: 0,
      adicionalCentavos: 0,
      requer,
    };
  }
  const inicio = minutosDoHorario(m.hora_inicio);
  const fim = minutosDoHorario(m.hora_fim);
  const degraus: DegrauPreco[] = [];
  for (const d of listaOpcional(m.degraus)) {
    if (d === null || typeof d !== 'object') continue;
    const x = d as Record<string, unknown>;
    if (typeof x.ate_minutos !== 'number' || typeof x.valor !== 'number') continue;
    degraus.push({ ateMinutos: Math.trunc(x.ate_minutos), centavos: centavos(x.valor) });
  }
  degraus.sort((a, b) => a.ateMinutos - b.ateMinutos);
  const dias = new Set<number>();
  for (const d of listaOpcional(m.dias)) {
    if (typeof d === 'number' && d >= 1 && d <= 7) dias.add(Math.trunc(d));
  }
  if (inicio === null || fim === null || degraus.length === 0 || dias.size === 0) {
    return null;
  }
  return {
    id,
    nome,
    dias: [...dias].sort((a, b) => a - b),
    inicioMinutos: inicio,
    fimMinutos: fim,
    cobrarDoInicio: m.cobrar_do_inicio === true,
    degraus,
    adicionalMinutos: Math.trunc(numOpcional(m.adicional_minutos) ?? 0),
    adicionalCentavos: centavos(numOpcional(m.adicional_valor) ?? 0),
    requer,
  };
}

/** "HH:MM" → minutos desde 00:00. Só "24:00" é aceito com hora 24 (= 0). */
function minutosDoHorario(hhmm: unknown): number | null {
  if (typeof hhmm !== 'string') return null;
  const p = hhmm.split(':');
  if (p.length !== 2) return null;
  const [hs, ms] = p as [string, string];
  if (!/^[+-]?\d+$/.test(hs) || !/^[+-]?\d+$/.test(ms)) return null;
  const h = Number(hs);
  const mi = Number(ms);
  if (h < 0 || h > 24 || mi < 0 || mi > 59) return null;
  if (h === 24 && mi !== 0) return null;
  return (h * 60 + mi) % (24 * 60);
}

/** A tabela tem regra feita para um motor mais novo (não pode ser cobrada aqui). */
export function exigeMotorNovo(regras: RegraHorario[]): boolean {
  return regras.some((r) => r.requer > REGRAS_HORARIO_VERSAO_SUPORTADA);
}

export function centavos(reais: number): number {
  return Math.round(reais * 100);
}

// ── relógio de Brasília ─────────────────────────────────────────────────────
// Um "relógio" é um número de ms cujos campos UTC são a hora de Brasília.
// Usar SÓ para ler hora/dia; nunca comparar com instantes reais.

export function paraBrasilia(t: Date): number {
  return t.getTime() - BRASILIA;
}

export function deBrasilia(relogio: number): Date {
  return new Date(relogio + BRASILIA);
}

/** Dia da semana ISO (1 = segunda … 7 = domingo) de um relógio de Brasília. */
export function diaIso(relogio: number): number {
  const d = new Date(relogio).getUTCDay();
  return d === 0 ? 7 : d;
}

function dia(t: number): number {
  return Math.floor(t / DIA) * DIA;
}

// ── cálculo ─────────────────────────────────────────────────────────────────

interface Bloco {
  inicio: number;
  fim: number;
  regra: RegraHorario | null;
}

export function calcularComTrechos(
  entrada: Date,
  saida: Date,
  tarifa: ConfigCalculo,
): ResultadoCalculo {
  const ms = saida.getTime() - entrada.getTime();
  const duracaoSegundos = Math.floor(ms / SEGUNDO);
  const duracaoMinutos = Math.floor(ms / MINUTO);

  // ── 1. Tolerância ─────────────────────────────────────────────────────────
  // Em segundos (fix 2026-07). `<=` inclusivo.
  if (duracaoSegundos <= tarifa.toleranciaMinutos * 60) {
    return { valor: 0, centavos: 0, duracaoMinutos, motivo: 'tolerancia', trechos: [], centavosSemTeto: 0 };
  }

  const e = paraBrasilia(entrada);
  const s = paraBrasilia(saida);

  // ── 2. Pernoite ───────────────────────────────────────────────────────────
  // valor 0 = regra DESLIGADA
  if (tarifa.pernoiteValor > 0 && isPernoite(e, s, tarifa)) {
    return {
      valor: tarifa.pernoiteValor,
      centavos: centavos(tarifa.pernoiteValor),
      duracaoMinutos,
      motivo: 'pernoite',
      trechos: [],
      centavosSemTeto: 0,
    };
  }

  // ── 3. Trechos ────────────────────────────────────────────────────────────
  const todos = blocos(e, s, tarifa.regras);
  // Trecho com menos de 60 s não cobra (spec req. 8). Se nenhum chega a 1 min,
  // a estadia vira um trecho só pelo bloco da entrada.
  let validos = todos.filter((b) => Math.floor((b.fim - b.inicio) / SEGUNDO) >= 60);
  if (validos.length === 0) {
    validos = [{ inicio: e, fim: s, regra: todos[0]?.regra ?? null }];
  }

  const baseDegraus: DegrauPreco[] = [
    { ateMinutos: tarifa.fracaoInicialMinutos, centavos: centavos(tarifa.fracaoInicialValor) },
  ];
  const baseAdicional = centavos(tarifa.fracaoAdicionalValor);

  const trechos: TrechoCobranca[] = [];
  let total = 0;
  for (const b of validos) {
    const minutos = Math.floor(Math.floor((b.fim - b.inicio) / SEGUNDO) / 60);
    const r = b.regra;
    const c = r === null
      ? preco(baseDegraus, tarifa.fracaoAdicionalMinutos, baseAdicional, minutos)
      : preco(r.degraus, r.adicionalMinutos, r.adicionalCentavos, minutos);
    total += c;
    trechos.push({
      inicio: deBrasilia(b.inicio),
      fim: deBrasilia(b.fim),
      minutos,
      centavos: c,
      regraId: r?.id ?? null,
      regraNome: r?.nome ?? null,
    });
  }

  // ── 4. Teto diária ────────────────────────────────────────────────────────
  // teto 0 = regra DESLIGADA
  const teto = centavos(tarifa.tetoDiaria);
  if (teto > 0 && total >= teto) {
    return { valor: teto / 100, centavos: teto, duracaoMinutos, motivo: 'tetoDiaria', trechos, centavosSemTeto: total };
  }
  return { valor: total / 100, centavos: total, duracaoMinutos, motivo: 'normal', trechos, centavosSemTeto: total };
}

/** Corta [e, s) (relógio de Brasília) em blocos de regra ou de preço base. */
function blocos(e: number, s: number, regras: RegraHorario[]): Bloco[] {
  const out: Bloco[] = [];
  let cursor = e;
  let primeiro = true;
  // O limite só protege contra laço infinito com regra malformada.
  for (let guarda = 0; cursor < s && guarda < 5000; guarda++) {
    const regra = regraEm(cursor, regras);
    let fim: number;
    if (regra !== null) {
      if (primeiro && regra.cobrarDoInicio) {
        out.push({ inicio: cursor, fim: s, regra });
        cursor = s;
        break;
      }
      fim = fimDaRegra(regra, cursor, s);
    } else {
      fim = proximoInicio(cursor, regras) ?? s;
    }
    if (fim >= s) fim = s;
    out.push({ inicio: cursor, fim, regra });
    cursor = fim;
    primeiro = false;
  }
  // Guarda estourou: o resto da estadia NUNCA sai de graça.
  if (cursor < s) out.push({ inicio: cursor, fim: s, regra: regraEm(cursor, regras) });
  return out;
}

/** Ocorrência da regra que começa no dia `d` (ou null se o dia não vale). */
function ocorrencia(regra: RegraHorario, d: number): [number, number] | null {
  if (!regra.dias.includes(diaIso(d))) return null;
  const ini = d + regra.inicioMinutos * MINUTO;
  let fim: number;
  if (regra.inicioMinutos === regra.fimMinutos) {
    fim = ini + DIA;
  } else if (regra.fimMinutos > regra.inicioMinutos) {
    fim = d + regra.fimMinutos * MINUTO;
  } else {
    fim = d + DIA + regra.fimMinutos * MINUTO;
  }
  return [ini, fim];
}

/** Ocorrência da regra que contém `t`, se houver. */
function ocorrenciaEm(regra: RegraHorario, t: number): [number, number] | null {
  const hoje = dia(t);
  for (const d of [hoje - DIA, hoje]) {
    const o = ocorrencia(regra, d);
    if (o !== null && t >= o[0] && t < o[1]) return o;
  }
  return null;
}

function regraEm(t: number, regras: RegraHorario[]): RegraHorario | null {
  for (const r of regras) {
    if (ocorrenciaEm(r, t) !== null) return r;
  }
  return null;
}

/** Fim da regra a partir de `t`, juntando ocorrências seguidas. */
function fimDaRegra(regra: RegraHorario, t: number, s: number): number {
  const atual = ocorrenciaEm(regra, t);
  if (atual === null) return t; // não acontece: `regraEm` acabou de achar
  let fim = atual[1];
  for (let i = 0; i < 4000 && fim < s; i++) {
    const seguinte = ocorrenciaEm(regra, fim);
    if (seguinte === null) break;
    fim = seguinte[1];
  }
  return fim;
}

/** Primeiro início de regra depois de `t` (fim de um bloco de preço base). */
function proximoInicio(t: number, regras: RegraHorario[]): number | null {
  let melhor: number | null = null;
  const hoje = dia(t);
  for (const r of regras) {
    for (let k = 0; k <= 8; k++) {
      const o = ocorrencia(r, hoje + k * DIA);
      if (o === null || o[0] <= t) continue;
      if (melhor === null || o[0] < melhor) melhor = o[0];
      break;
    }
  }
  return melhor;
}

/** Degraus + adicional. O preço base é um degrau só. */
export function preco(
  degraus: DegrauPreco[],
  adicionalMinutos: number,
  adicionalCentavos: number,
  minutos: number,
): number {
  for (const d of degraus) {
    if (minutos <= d.ateMinutos) return d.centavos;
  }
  const ultimo = degraus[degraus.length - 1];
  if (ultimo === undefined) return 0;
  if (adicionalCentavos <= 0 || adicionalMinutos <= 0) return ultimo.centavos;
  const excedente = minutos - ultimo.ateMinutos;
  return ultimo.centavos + Math.ceil(excedente / adicionalMinutos) * adicionalCentavos;
}

/**
 * Janela de pernoite: das `pernoiteHoraInicio`:00 do dia D até as
 * `pernoiteHoraFim`:00 de D+1, no relógio de Brasília. Vale se a estadia cobriu
 * a janela INTEIRA.
 */
function isPernoite(e: number, s: number, tarifa: ConfigCalculo): boolean {
  let d = dia(e);
  const diaFim = dia(s);
  while (d <= diaFim) {
    const inicioJanela = d + tarifa.pernoiteHoraInicio * HORA;
    const fimJanela = d + (tarifa.pernoiteHoraFim + 24) * HORA;
    if (e <= inicioJanela && s >= fimJanela) return true;
    d += DIA;
  }
  return false;
}
