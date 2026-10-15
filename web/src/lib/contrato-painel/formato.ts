/**
 * Formatos do editor de contrato: o que o gestor digita (reais com vírgula,
 * horas "H:MM") ↔ o que o motor usa (centavos e minutos inteiros).
 *
 * Aqui só se confere a FORMA. Limites de negócio (23:59, 999:00, faixas em
 * ordem) são do `validar` do motor, para o painel e o servidor darem o mesmo
 * erro.
 */

/** Teto do painel por campo de valor: R$ 99.999,99. */
export const MAX_CENTAVOS = 9_999_999;

export type LeituraValor =
  | { ok: true; centavos: number }
  | { ok: false; codigo: 'valor_vazio' | 'formato_valor' | 'valor_negativo' | 'valor_maximo' };

export type LeituraHora =
  | { ok: true; minutos: number }
  | { ok: false; codigo: 'hora_vazia' | 'formato_hora' | 'hora_do_dia' };

/**
 * "10,50" → 1050. Aceita milhar com ponto ("1.000,00") e, sem vírgula, ponto
 * com 1–2 casas como decimal ("5.00", o padrão do formulário avulso); "1.000"
 * sem vírgula é milhar.
 */
export function textoParaCentavos(texto: string): LeituraValor {
  let t = texto.replace(/^\s*R\$\s*/, '').trim();
  if (t === '') return { ok: false, codigo: 'valor_vazio' };
  const negativo = t.startsWith('-');
  if (negativo) t = t.slice(1).trim();

  let inteiro: string;
  let decimal = '';
  if (t.includes(',')) {
    const m = /^(\d{1,3}(?:\.\d{3})+|\d+),(\d{1,2})$/.exec(t);
    if (!m) return { ok: false, codigo: 'formato_valor' };
    inteiro = m[1]!.replace(/\./g, '');
    decimal = m[2]!;
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(t)) {
    inteiro = t.replace(/\./g, '');
  } else {
    const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(t);
    if (!m) return { ok: false, codigo: 'formato_valor' };
    inteiro = m[1]!;
    decimal = m[2] ?? '';
  }

  const centavos = Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'));
  if (negativo && centavos > 0) return { ok: false, codigo: 'valor_negativo' };
  if (centavos > MAX_CENTAVOS) return { ok: false, codigo: 'valor_maximo' };
  return { ok: true, centavos };
}

/** 1050 → "10,50" (o texto do campo; o "R$" fica fora). */
export function centavosParaTexto(centavos: number): string {
  const reais = Math.trunc(centavos / 100);
  const resto = Math.abs(centavos % 100);
  return `${reais},${String(resto).padStart(2, '0')}`;
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 1050 → "R$ 10,50" (para leitura; espaço comum, não o NBSP do Intl). */
export function brl(centavos: number): string {
  return moeda.format(centavos / 100).replace(/\u00a0/g, ' ');
}

/** "0:15", "00:15", "48:00" → minutos. Até 3 dígitos de hora. */
export function horaParaMinutos(texto: string): LeituraHora {
  const t = texto.trim();
  if (t === '') return { ok: false, codigo: 'hora_vazia' };
  const m = /^(\d{1,3}):(\d{2})$/.exec(t);
  if (!m) return { ok: false, codigo: 'formato_hora' };
  const min = Number(m[2]);
  if (min > 59) return { ok: false, codigo: 'formato_hora' };
  return { ok: true, minutos: Number(m[1]) * 60 + min };
}

/** Hora do relógio para a janela de uma regra: 00:00 a 23:59. */
export function horaDoDia(texto: string): LeituraHora {
  const r = horaParaMinutos(texto);
  if (r.ok && r.minutos > 1439) return { ok: false, codigo: 'hora_do_dia' };
  return r;
}

/** 15 → "0:15"; 2880 → "48:00". */
export function minutosParaHora(minutos: number): string {
  return `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`;
}

/** Minuto do dia → "06:00" (sempre com dois dígitos, como no relógio). */
export function horaRelogio(minutoDoDia: number): string {
  const h = Math.floor(minutoDoDia / 60);
  return `${String(h).padStart(2, '0')}:${String(minutoDoDia % 60).padStart(2, '0')}`;
}

/** Duração para leitura: "45 min", "2h30", "2 dias 1h00". */
export function duracaoTexto(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const hm = (m: number) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
  if (minutos <= 1440) return hm(minutos);
  const dias = Math.floor(minutos / 1440);
  return `${dias} ${dias === 1 ? 'dia' : 'dias'} ${hm(minutos % 1440)}`;
}
