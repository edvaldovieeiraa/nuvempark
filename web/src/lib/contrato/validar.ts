import type { Contrato, Regra } from './modelo';

/**
 * Regras de negócio do contrato (spec, requisito 14). O mesmo conjunto roda
 * no formulário do painel (Feature 2), na gravação e antes de cada cálculo:
 * `calcular` recusa o que `validar` recusar.
 */
export interface ErroContrato {
  /** Caminho no JSON (snake_case), ex.: `regras[1].faixas[0].ate_minutos`. */
  caminho: string;
  codigo: string;
}

/** "Até 23:59". */
export const LIMITE_MINUTOS = 23 * 60 + 59;
/** "Até 999 h", com "regras com mais de 24 horas". */
export const LIMITE_MINUTOS_MAIS_24H = 999 * 60;

const MINUTOS_SEMANA = 7 * 24 * 60;

export function validar(c: Contrato): ErroContrato[] {
  const erros: ErroContrato[] = [];
  const erro = (caminho: string, codigo: string) => erros.push({ caminho, codigo });

  if (c.regras.length === 0) {
    erro('regras', 'sem_regras');
    return erros;
  }

  const limite = c.maisDe24h ? LIMITE_MINUTOS_MAIS_24H : LIMITE_MINUTOS;
  const nomes = new Set<string>();

  c.regras.forEach((r, i) => {
    const p = `regras[${i}]`;
    if (i === 0) {
      if (r.nome !== 'Padrão') erro(`${p}.nome`, 'padrao_nome');
      if (r.inicio !== null || r.fim !== null || r.dias !== null) erro(p, 'padrao_com_horario');
      if (r.usarMinutosPagos) erro(`${p}.usar_minutos_pagos`, 'padrao_usar_minutos_pagos');
    } else {
      const nome = r.nome.trim();
      if (nome === '') erro(`${p}.nome`, 'nome_vazio');
      else if (nome === 'Padrão') erro(`${p}.nome`, 'nome_padrao_repetido');
      else if (nomes.has(nome)) erro(`${p}.nome`, 'nome_repetido');
      nomes.add(nome);

      if (r.inicio === null || r.fim === null) erro(p, 'janela_incompleta');
      else if (r.inicio === r.fim) erro(p, 'janela_vazia');
      if (r.dias === null || r.dias.length === 0) erro(`${p}.dias`, 'sem_dias');
      else if (r.dias.some((d) => d < 1 || d > 7) || new Set(r.dias).size !== r.dias.length) {
        erro(`${p}.dias`, 'dia_invalido');
      }

      // Combinações que os casos do CloudPark não provam (plano, Fase 0).
      if (r.recomecarTabela) erro(`${p}.recomecar_tabela`, 'nao_provado_recomeco_em_regra');
      if (r.usarMinutosPagos && c.regras.length > 2) {
        erro(`${p}.usar_minutos_pagos`, 'nao_provado_minutos_pagos_com_regras');
      }
    }
    validarTabela(r, p, limite, erro);
  });

  validarSobreposicao(c.regras, erro);

  if (c.maisDe24h) {
    if (c.diariaCentavos !== null) erro('diaria_centavos', 'mais_de_24h_com_diaria');
    if (c.regras.length > 1) erro('regras', 'mais_de_24h_com_regras');
  }
  if (c.diariaCentavos !== null) {
    if (c.diariaCentavos <= 0) erro('diaria_centavos', 'diaria_invalida');
    else if (c.regras.length > 1) erro('diaria_centavos', 'nao_provado_diaria_com_regras');
  }
  if (c.cobrarMenorValor && c.regras.length < 2) {
    erro('cobrar_menor_valor', 'menor_valor_sem_regras');
  }
  return erros;
}

function validarTabela(
  r: Regra,
  p: string,
  limite: number,
  erro: (caminho: string, codigo: string) => void,
): void {
  if (r.faixas.length === 0) {
    erro(`${p}.faixas`, 'sem_faixas');
  }
  r.faixas.forEach((f, j) => {
    const q = `${p}.faixas[${j}]`;
    const anterior = j > 0 ? r.faixas[j - 1] : undefined;
    if (f.ateMinutos < 1) erro(`${q}.ate_minutos`, 'faixa_minimo');
    else if (f.ateMinutos > limite) erro(`${q}.ate_minutos`, 'acima_do_limite');
    else if (anterior && f.ateMinutos <= anterior.ateMinutos) {
      erro(`${q}.ate_minutos`, 'faixa_fora_de_ordem');
    }
    if (f.valorCentavos < 0) erro(`${q}.valor_centavos`, 'valor_negativo');
    else if (anterior && f.valorCentavos < anterior.valorCentavos) {
      erro(`${q}.valor_centavos`, 'valor_menor_que_anterior');
    }
  });

  if (r.recomecarTabela) {
    if (r.fracao !== null) erro(`${p}.fracao`, 'recomeco_com_fracao');
    return;
  }
  if (r.fracao === null) {
    erro(`${p}.fracao`, 'sem_fracao_nem_recomeco');
    return;
  }
  if (r.fracao.minutos < 1) erro(`${p}.fracao.minutos`, 'fracao_minimo');
  else if (r.fracao.minutos > limite) erro(`${p}.fracao.minutos`, 'acima_do_limite');
  if (r.fracao.valorCentavos < 0) erro(`${p}.fracao.valor_centavos`, 'valor_negativo');
}

/**
 * Duas regras não podem cobrir o mesmo minuto da semana. Cada janela vira um
 * intervalo em minutos da semana (segunda 00:00 = 0); a que cruza a meia-noite
 * avança no dia seguinte, e a de domingo que cruza volta para segunda.
 */
function validarSobreposicao(
  regras: Regra[],
  erro: (caminho: string, codigo: string) => void,
): void {
  const intervalos: Array<{ regra: number; de: number; ate: number }> = [];
  regras.forEach((r, i) => {
    if (i === 0 || r.inicio === null || r.fim === null || r.inicio === r.fim || !r.dias) return;
    const duracao = r.fim > r.inicio ? r.fim - r.inicio : r.fim + 1440 - r.inicio;
    for (const d of new Set(r.dias)) {
      if (d < 1 || d > 7) continue;
      const de = (d - 1) * 1440 + r.inicio;
      const ate = de + duracao;
      if (ate <= MINUTOS_SEMANA) {
        intervalos.push({ regra: i, de, ate });
      } else {
        intervalos.push({ regra: i, de, ate: MINUTOS_SEMANA });
        intervalos.push({ regra: i, de: 0, ate: ate - MINUTOS_SEMANA });
      }
    }
  });

  const comErro = new Set<number>();
  for (let a = 0; a < intervalos.length; a++) {
    for (let b = a + 1; b < intervalos.length; b++) {
      const x = intervalos[a]!;
      const y = intervalos[b]!;
      if (x.regra === y.regra) continue;
      if (x.de < y.ate && y.de < x.ate) comErro.add(Math.max(x.regra, y.regra));
    }
  }
  for (const i of [...comErro].sort((m, n) => m - n)) erro(`regras[${i}]`, 'sobreposicao');
}
