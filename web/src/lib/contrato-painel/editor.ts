import { validar, type Contrato, type ErroContrato, type Regra } from '../contrato';
import { ajustar, disponibilidade } from './exclusoes';
import {
  brl,
  centavosParaTexto,
  horaDoDia,
  horaParaMinutos,
  horaRelogio,
  minutosParaHora,
  textoParaCentavos,
} from './formato';
import { mensagem } from './mensagens';

/**
 * Modelo do formulário do contrato: o que o gestor digita, em texto. Fica
 * separado do `Contrato` do motor porque um campo pode estar no meio da
 * digitação ("1:") e o resto do formulário continua precisando de validação.
 */
export interface FaixaForm {
  /** Chave estável para o React e para as etiquetas de origem; não vai para o banco. */
  id: string;
  ate: string;
  valor: string;
}

export interface RegraForm {
  /** Chave estável para o React; não vai para o banco. */
  id: string;
  nome: string;
  inicio: string;
  fim: string;
  dias: number[];
  usarMinutosPagos: boolean;
  recomecarTabela: boolean;
  faixas: FaixaForm[];
  fracaoMinutos: string;
  fracaoValor: string;
}

export interface ContratoForm {
  maisDe24h: boolean;
  diariaLigada: boolean;
  diaria: string;
  cobrarMenorValor: boolean;
  /** A primeira é a Padrão. */
  regras: RegraForm[];
}

export interface ErroCampo extends ErroContrato {
  /** `id` do campo na tela (links do resumo, `aria-describedby`). */
  campo: string;
  mensagem: string;
}

export const DIAS_NOME = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
export const TODOS_OS_DIAS = [1, 2, 3, 4, 5, 6, 7];

let ultimoId = 0;
const novoId = () => `regra-${++ultimoId}`;

export function novaFaixa(ate = '', valor = ''): FaixaForm {
  return { id: `faixa-${++ultimoId}`, ate, valor };
}

export function formVazio(): ContratoForm {
  return {
    maisDe24h: false,
    diariaLigada: false,
    diaria: '',
    cobrarMenorValor: false,
    regras: [
      {
        id: novoId(),
        nome: 'Padrão',
        inicio: '',
        fim: '',
        dias: [],
        usarMinutosPagos: false,
        recomecarTabela: false,
        faixas: [novaFaixa('1:00', '10,00')],
        fracaoMinutos: '1:00',
        fracaoValor: '5,00',
      },
    ],
  };
}

export function formDeContrato(c: Contrato): ContratoForm {
  return {
    maisDe24h: c.maisDe24h,
    diariaLigada: c.diariaCentavos !== null,
    diaria: c.diariaCentavos === null ? '' : centavosParaTexto(c.diariaCentavos),
    cobrarMenorValor: c.cobrarMenorValor,
    regras: c.regras.map((r) => ({
      id: novoId(),
      nome: r.nome,
      inicio: r.inicio === null ? '' : horaRelogio(r.inicio),
      fim: r.fim === null ? '' : horaRelogio(r.fim),
      dias: r.dias ? [...r.dias] : [],
      usarMinutosPagos: r.usarMinutosPagos,
      recomecarTabela: r.recomecarTabela,
      faixas: r.faixas.map((f) =>
        novaFaixa(minutosParaHora(f.ateMinutos), centavosParaTexto(f.valorCentavos)),
      ),
      fracaoMinutos: r.fracao ? minutosParaHora(r.fracao.minutos) : '1:00',
      fracaoValor: r.fracao ? centavosParaTexto(r.fracao.valorCentavos) : '',
    })),
  };
}

/**
 * Lê o formulário: erros de formato do painel + erros do `validar` do motor,
 * cada um com o campo e a mensagem. `contrato` só vem quando não há erro.
 * Campo ilegível vira NaN, que nenhuma comparação do `validar` acusa — assim
 * ele não gera erro falso nos vizinhos.
 */
export function lerForm(f: ContratoForm): { contrato: Contrato | null; erros: ErroCampo[] } {
  const formato: ErroContrato[] = [];
  const valor = (texto: string, caminho: string) => {
    const r = textoParaCentavos(texto);
    if (r.ok) return r.centavos;
    formato.push({ caminho, codigo: r.codigo });
    return Number.NaN;
  };
  const duracao = (texto: string, caminho: string) => {
    const r = horaParaMinutos(texto);
    if (r.ok) return r.minutos;
    formato.push({ caminho, codigo: r.codigo });
    return Number.NaN;
  };
  const relogio = (texto: string, caminho: string): number | null => {
    if (texto.trim() === '') return null;
    const r = horaDoDia(texto);
    if (r.ok) return r.minutos;
    formato.push({ caminho, codigo: r.codigo });
    return Number.NaN;
  };

  const c: Contrato = {
    versao: 1,
    maisDe24h: f.maisDe24h,
    diariaCentavos: f.diariaLigada ? valor(f.diaria, 'diaria_centavos') : null,
    cobrarMenorValor: f.cobrarMenorValor,
    regras: f.regras.map((r, i): Regra => {
      const p = `regras[${i}]`;
      const padrao = i === 0;
      return {
        nome: padrao ? r.nome : r.nome.trim(),
        inicio: padrao ? null : relogio(r.inicio, `${p}.inicio`),
        fim: padrao ? null : relogio(r.fim, `${p}.fim`),
        dias: padrao ? null : [...r.dias].sort((a, b) => a - b),
        usarMinutosPagos: padrao ? false : r.usarMinutosPagos,
        recomecarTabela: r.recomecarTabela,
        faixas: r.faixas.map((x, j) => ({
          ateMinutos: duracao(x.ate, `${p}.faixas[${j}].ate_minutos`),
          valorCentavos: valor(x.valor, `${p}.faixas[${j}].valor_centavos`),
        })),
        fracao: r.recomecarTabela
          ? null
          : {
              minutos: duracao(r.fracaoMinutos, `${p}.fracao.minutos`),
              valorCentavos: valor(r.fracaoValor, `${p}.fracao.valor_centavos`),
            },
      };
    }),
  };

  const brutos = [...formato, ...validar(c)];
  const pares = sobreposicoes(c.regras);
  const erros = brutos.map((e): ErroCampo => ({
    ...e,
    campo: idCampo(e.caminho),
    mensagem: mensagemDoErro(e, c, pares),
  }));
  return { contrato: erros.length > 0 ? null : c, erros };
}

function mensagemDoErro(e: ErroContrato, c: Contrato, pares: Map<number, ParSobreposicao>): string {
  const idx = [...e.caminho.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
  const regra = idx[0] !== undefined ? c.regras[idx[0]] : undefined;
  const anterior = regra && idx[1] !== undefined ? regra.faixas[idx[1] - 1] : undefined;
  switch (e.codigo) {
    case 'faixa_fora_de_ordem':
      return mensagem(e.codigo, anterior ? { anterior: minutosParaHora(anterior.ateMinutos) } : {});
    case 'valor_menor_que_anterior':
      return mensagem(e.codigo, anterior ? { anterior: brl(anterior.valorCentavos) } : {});
    case 'acima_do_limite':
      return mensagem(c.maisDe24h ? 'acima_do_limite_mais_24h' : e.codigo);
    case 'sobreposicao': {
      const par = idx[0] !== undefined ? pares.get(idx[0]) : undefined;
      const outra = par ? c.regras[par.outra] : undefined;
      if (!par || !outra || outra.inicio === null || outra.fim === null) return mensagem(e.codigo);
      return mensagem(e.codigo, {
        outra: outra.nome,
        diaOutra: DIAS_NOME[par.diaOutra - 1]!,
        inicioOutra: horaRelogio(outra.inicio),
        fimOutra: horaRelogio(outra.fim),
        quando: par.quando,
        hora: horaRelogio(par.hora),
        dia: DIAS_NOME[par.dia - 1]!,
      });
    }
    default:
      return mensagem(e.codigo);
  }
}

/** Caminho do erro (snake_case do JSON) → `id` do campo na tela. */
export function idCampo(caminho: string): string {
  const m = /^regras\[(\d+)\](.*)$/.exec(caminho);
  if (!m) {
    if (caminho === 'diaria_centavos') return 'ct-diaria';
    if (caminho === 'cobrar_menor_valor') return 'ct-menor';
    if (caminho === 'mais_de_24h') return 'ct-mais24';
    return 'ct-regras';
  }
  const r = `ct-r${m[1]}`;
  const resto = m[2]!;
  const faixa = /^\.faixas\[(\d+)\]\.(ate_minutos|valor_centavos)$/.exec(resto);
  if (faixa) return `${r}-f${faixa[1]}-${faixa[2] === 'ate_minutos' ? 'ate' : 'valor'}`;
  switch (resto) {
    case '.nome':
      return `${r}-nome`;
    case '.fim':
      return `${r}-fim`;
    case '.dias':
      return `${r}-dias`;
    case '.faixas':
      return `${r}-faixas`;
    case '.fracao':
    case '.recomecar_tabela':
      return `${r}-depois`;
    case '.fracao.minutos':
      return `${r}-fracao-min`;
    case '.fracao.valor_centavos':
      return `${r}-fracao-valor`;
    case '.usar_minutos_pagos':
      return `${r}-pagos`;
    default:
      // '', '.inicio': a janela inteira aponta para o "De".
      return `${r}-inicio`;
  }
}

export function adicionarRegra(f: ContratoForm): { form: ContratoForm; avisos: string[] } {
  if (disponibilidade(f).adicionarRegra) return { form: f, avisos: [] };
  const usados = new Set(f.regras.map((r) => r.nome.trim()));
  let n = f.regras.length;
  while (usados.has(`Regra ${n}`)) n++;
  const nova: RegraForm = {
    id: novoId(),
    nome: `Regra ${n}`,
    inicio: '',
    fim: '',
    dias: [...TODOS_OS_DIAS],
    usarMinutosPagos: false,
    recomecarTabela: false,
    faixas: [novaFaixa('1:00')],
    fracaoMinutos: '1:00',
    fracaoValor: '',
  };
  const { estado, avisos } = ajustar({ ...f, regras: [...f.regras, nova] });
  return { form: estado, avisos };
}

export function removerRegra(f: ContratoForm, indice: number): { form: ContratoForm; avisos: string[] } {
  if (indice <= 0 || indice >= f.regras.length) return { form: f, avisos: [] };
  const { estado, avisos } = ajustar({ ...f, regras: f.regras.filter((_, i) => i !== indice) });
  return { form: estado, avisos };
}

export interface ParSobreposicao {
  /** Índice da outra regra (anterior na lista). */
  outra: number;
  /** Dia ISO em que a ocorrência da outra regra começa. */
  diaOutra: number;
  /** Onde as duas passam a valer juntas. */
  dia: number;
  hora: number;
  quando: 'ainda vale' | 'também vale';
}

const MINUTOS_SEMANA = 7 * 1440;

/**
 * O par de cada regra que o `validar` marca com `sobreposicao` (ele só diz
 * QUAL regra, sem a outra). Mesma conta do `validar` — minutos da semana,
 * segunda 00:00 = 0 —, reimplementada aqui porque `lib/contrato` é cópia
 * literal da API. Um teste compara as duas decisões.
 */
export function sobreposicoes(regras: Regra[]): Map<number, ParSobreposicao> {
  type Intervalo = { regra: number; de: number; ate: number; dia: number; continuacao: boolean };
  const intervalos: Intervalo[] = [];
  regras.forEach((r, i) => {
    if (i === 0 || r.inicio === null || r.fim === null || r.inicio === r.fim || !r.dias) return;
    const duracao = r.fim > r.inicio ? r.fim - r.inicio : r.fim + 1440 - r.inicio;
    for (const d of new Set(r.dias)) {
      if (d < 1 || d > 7) continue;
      const de = (d - 1) * 1440 + r.inicio;
      const ate = de + duracao;
      if (ate <= MINUTOS_SEMANA) {
        intervalos.push({ regra: i, de, ate, dia: d, continuacao: false });
      } else {
        intervalos.push({ regra: i, de, ate: MINUTOS_SEMANA, dia: d, continuacao: false });
        intervalos.push({ regra: i, de: 0, ate: ate - MINUTOS_SEMANA, dia: d, continuacao: true });
      }
    }
  });

  const pares = new Map<number, ParSobreposicao>();
  for (let a = 0; a < intervalos.length; a++) {
    for (let b = a + 1; b < intervalos.length; b++) {
      const x = intervalos[a]!;
      const y = intervalos[b]!;
      if (x.regra === y.regra || !(x.de < y.ate && y.de < x.ate)) continue;
      const [esta, outra] = x.regra > y.regra ? [x, y] : [y, x];
      const atual = pares.get(esta.regra);
      if (atual && atual.outra <= outra.regra) continue;
      const juntas = Math.max(esta.de, outra.de);
      pares.set(esta.regra, {
        outra: outra.regra,
        diaOutra: outra.dia,
        dia: Math.floor(juntas / 1440) + 1,
        hora: juntas % 1440,
        quando: outra.continuacao || outra.de < esta.de ? 'ainda vale' : 'também vale',
      });
    }
  }
  return pares;
}
