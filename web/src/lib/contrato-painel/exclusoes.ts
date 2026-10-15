import { MAX_FAIXAS, MAX_REGRAS } from '../contrato/validar';

/**
 * Exclusões mútuas do editor (design, tabela "Exclusões mútuas"). Opção
 * indisponível fica desabilitada COM o motivo, nunca escondida. `tom`:
 * `regra` = regra do contrato (cinza); `nao_suportado` = combinação que o
 * CloudPark não provou e o motor recusa (âmbar).
 *
 * Trabalha só com a estrutura (quantas regras, o que está ligado), que o
 * formulário tem mesmo quando algum valor ainda não foi digitado direito.
 */
export interface Estrutura {
  maisDe24h: boolean;
  diariaLigada: boolean;
  cobrarMenorValor: boolean;
  /** A primeira é a Padrão. */
  regras: ReadonlyArray<{ usarMinutosPagos: boolean; recomecarTabela: boolean }>;
}

export interface Indisponivel {
  motivo: string;
  tom: 'regra' | 'nao_suportado';
}

export interface Disponibilidade {
  /** Para LIGAR a diária (desligar é sempre possível). */
  diaria: Indisponivel | null;
  maisDe24h: Indisponivel | null;
  menorValor: Indisponivel | null;
  adicionarRegra: Indisponivel | null;
  recomecar(regra: number): Indisponivel | null;
  /** `ausente`: a opção não existe na Padrão. */
  minutosPagos(regra: number): Indisponivel | null | 'ausente';
}

const regra = (motivo: string): Indisponivel => ({ motivo, tom: 'regra' });
const naoSuportado = (motivo: string): Indisponivel => ({ motivo, tom: 'nao_suportado' });

export function disponibilidade(e: Estrutura): Disponibilidade {
  const comHorario = e.regras.length > 1;
  const horarios = e.regras.length - 1;
  return {
    diaria: comHorario
      ? naoSuportado('Indisponível com regra por horário: ainda não suportado.')
      : e.maisDe24h
        ? regra('Não combina com faixas de mais de 24 horas.')
        : null,
    maisDe24h:
      comHorario || e.diariaLigada ? regra('Só com a regra Padrão e sem diária.') : null,
    menorValor: comHorario
      ? null
      : regra('Precisa de pelo menos uma regra por horário para comparar.'),
    adicionarRegra: e.diariaLigada
      ? naoSuportado(
          'Desligue a diária para adicionar regra por horário: os dois juntos ainda não são suportados.',
        )
      : e.maisDe24h
        ? regra('Regras por horário não combinam com faixas de mais de 24 horas.')
        : e.regras.length >= MAX_REGRAS
          ? regra('Máximo de 20 regras.')
          : null,
    recomecar: (i) =>
      i === 0
        ? null
        : naoSuportado('Recomeçar a tabela numa regra por horário ainda não é suportado.'),
    minutosPagos: (i) =>
      i === 0
        ? 'ausente'
        : horarios >= 2
          ? naoSuportado('Ainda não suportado com mais de uma regra por horário.')
          : null,
  };
}

export function adicionarFaixa(faixasNaRegra: number): Indisponivel | null {
  return faixasNaRegra >= MAX_FAIXAS ? regra('Máximo de 50 faixas.') : null;
}

/**
 * Depois de adicionar ou remover uma regra: desliga o que deixou de ser
 * possível e diz o porquê (o editor mostra num toast).
 */
export function ajustar<
  R extends { usarMinutosPagos: boolean },
  T extends { cobrarMenorValor: boolean; regras: R[] },
>(e: T): { estado: T; avisos: string[] } {
  let estado = e;
  const avisos: string[] = [];
  if (estado.cobrarMenorValor && estado.regras.length < 2) {
    estado = { ...estado, cobrarMenorValor: false };
    avisos.push('Cobrar o menor valor foi desligado: não há regra para comparar.');
  }
  if (estado.regras.length > 2 && estado.regras.some((r) => r.usarMinutosPagos)) {
    estado = {
      ...estado,
      regras: estado.regras.map((r) => (r.usarMinutosPagos ? { ...r, usarMinutosPagos: false } : r)),
    };
    avisos.push(
      '“Usar todos os minutos pagos” foi desmarcado: ainda não é suportado com mais de uma regra por horário.',
    );
  }
  return { estado, avisos };
}
