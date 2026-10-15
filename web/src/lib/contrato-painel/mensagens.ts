/**
 * Código de erro (do `validar` do motor, do formato do painel ou do servidor)
 * → texto em pt-BR. Textos do design (`.planning/designs/tarifa-contrato-painel.md`,
 * "Mensagens por código"). Um teste lê `../contrato/validar.ts` e falha se
 * algum código ficar sem mensagem.
 */

const PADRAO_FORA = 'A regra Padrão foi alterada fora do painel: recomece o contrato.';
const MOTIVO_MAIS_24H_COM_REGRAS =
  'Regras por horário não combinam com faixas de mais de 24 horas.';
const MOTIVO_MAIS_24H_COM_DIARIA = 'Não combina com faixas de mais de 24 horas.';

export const MENSAGENS: Record<string, string> = {
  // validar — estrutura
  sem_regras: 'O contrato precisa da regra Padrão.',
  regras_demais: 'Máximo de 20 regras.',
  padrao_nome: PADRAO_FORA,
  padrao_com_horario: PADRAO_FORA,
  padrao_usar_minutos_pagos: PADRAO_FORA,
  // validar — regra por horário
  nome_vazio: 'Dê um nome à regra.',
  nome_padrao_repetido: '“Padrão” é o nome da regra geral. Escolha outro.',
  nome_repetido: 'Já existe uma regra com esse nome.',
  janela_incompleta: 'Informe o horário de início e de fim.',
  janela_vazia: 'Início e fim iguais: a regra não teria duração.',
  sem_dias: 'Escolha pelo menos um dia.',
  dia_invalido: 'Dias inválidos: escolha de novo.',
  sobreposicao:
    'O {outra} de {diaOutra} ({inicioOutra}–{fimOutra}) {quando} às {hora} de {dia}. Duas regras não podem cobrir o mesmo horário.',
  // validar — tabela
  sem_faixas: 'Adicione pelo menos uma faixa.',
  faixas_demais: 'Máximo de 50 faixas.',
  faixa_minimo: 'A faixa precisa ter pelo menos 0:01.',
  faixa_fora_de_ordem: 'As faixas precisam crescer: esta tem que passar de {anterior}.',
  acima_do_limite:
    'Máximo 23:59. Para passar de 24 h, ligue “Faixas com mais de 24 horas” (só com a Padrão e sem diária).',
  acima_do_limite_mais_24h: 'Máximo 999:00.',
  valor_negativo: 'O valor não pode ser negativo.',
  valor_menor_que_anterior:
    'O valor é o total até aqui: não pode ser menor que o da faixa anterior ({anterior}).',
  recomeco_com_fracao: 'Escolha fração ou recomeçar, não os dois.',
  sem_fracao_nem_recomeco:
    'Diga o que cobrar depois da última faixa: fração ou recomeçar a tabela.',
  fracao_minimo: 'A fração precisa ter pelo menos 0:01.',
  // validar — opções do contrato
  mais_de_24h_com_diaria: MOTIVO_MAIS_24H_COM_DIARIA,
  mais_de_24h_com_regras: MOTIVO_MAIS_24H_COM_REGRAS,
  diaria_invalida: 'A diária precisa ser maior que R$ 0,00.',
  menor_valor_sem_regras: 'Precisa de pelo menos uma regra por horário para comparar.',
  // validar — combinações que o CloudPark não provou
  nao_provado_diaria_com_regras:
    'Diária junto com regra por horário ainda não é suportada. Desligue a diária ou remova as regras por horário.',
  nao_provado_recomeco_em_regra:
    'Recomeçar a tabela numa regra por horário ainda não é suportado. Use “Cobrar fração” nesta regra, ou recomeçar só na Padrão.',
  nao_provado_minutos_pagos_com_regras:
    '“Usar todos os minutos pagos” ainda não é suportado com mais de uma regra por horário. Desmarque a opção ou deixe uma regra só.',
  // formato (painel)
  valor_vazio: 'Informe o valor.',
  formato_valor: 'Use reais com vírgula, ex.: 10,50.',
  valor_maximo: 'Máximo R$ 99.999,99.',
  hora_vazia: 'Informe o horário.',
  formato_hora: 'Use horas e minutos, ex.: 0:15 ou 1:30.',
  hora_do_dia: 'Use um horário do relógio, de 00:00 a 23:59.',
  // servidor
  json_invalido: 'O contrato enviado não é um JSON válido.',
  malformado: 'O contrato enviado não tem a forma esperada.',
  contrato_grande: 'O contrato é grande demais.',
};

/** Usadas quando a mensagem tem parâmetros e eles não vieram. */
const SEM_PARAMETRO: Record<string, string> = {
  sobreposicao:
    'Esta regra cobre um horário que outra regra já cobre. Duas regras não podem cobrir o mesmo horário.',
  faixa_fora_de_ordem: 'As faixas precisam crescer: esta tem que passar da anterior.',
  valor_menor_que_anterior:
    'O valor é o total até aqui: não pode ser menor que o da faixa anterior.',
};

export function mensagem(codigo: string, params: Record<string, string> = {}): string {
  const modelo = MENSAGENS[codigo];
  if (!modelo) return 'Valor inválido.';
  let faltou = false;
  const texto = modelo.replace(/\{(\w+)\}/g, (_, chave: string) => {
    const v = params[chave];
    if (v === undefined) faltou = true;
    return v ?? '';
  });
  return faltou ? (SEM_PARAMETRO[codigo] ?? texto) : texto;
}

/** Combinação que o motor recusa por não estar provada no CloudPark (bloco âmbar). */
export function naoSuportado(codigo: string): boolean {
  return codigo.startsWith('nao_provado_');
}
