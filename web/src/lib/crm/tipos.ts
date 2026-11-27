/**
 * Tipos do CRM do console master (db/47 e db/48).
 * Nomes em camelCase; o banco usa snake_case (`crm_leads_v`).
 */

export const ESTAGIOS = ["novo", "em_contato", "trial", "ganho", "perdido"] as const;
export type Estagio = (typeof ESTAGIOS)[number];

export const FONTES = ["contato", "trial", "master", "manual", "importacao"] as const;
export type Fonte = (typeof FONTES)[number];

export const MOTIVOS_PERDA = [
  "preco",
  "sem_retorno",
  "concorrente",
  "sem_perfil",
  "desistiu",
  "outro",
  "cancelou",
] as const;
export type MotivoPerda = (typeof MOTIVOS_PERDA)[number];

/** Marcada à mão no CRM (db/54). Null no lead = sem marca. */
export const TEMPERATURAS = ["quente", "morno", "frio"] as const;
export type Temperatura = (typeof TEMPERATURAS)[number];

export const ESTADOS_ASSINATURA = ["trial", "ativa", "atrasada", "suspensa", "cancelada"] as const;
export type EstadoAssinatura = (typeof ESTADOS_ASSINATURA)[number];

export const TIPOS_INTERACAO = ["nota", "ligacao", "whatsapp", "email", "reuniao", "sistema"] as const;
export type TipoInteracao = (typeof TIPOS_INTERACAO)[number];
/** O que o master registra à mão: tudo menos `sistema`. */
export type TipoInteracaoManual = Exclude<TipoInteracao, "sistema">;
export const TIPOS_INTERACAO_MANUAL: readonly TipoInteracaoManual[] = [
  "nota",
  "ligacao",
  "whatsapp",
  "email",
  "reuniao",
];

/** Um card do CRM, montado a partir de uma linha de `crm_leads_v`. */
export type LeadCrm = {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  /** Mensagem do primeiro contato do site; null em manual, trial e importado. */
  assunto: string | null;
  /** Caminho da página que exibiu o formulário. */
  origem: string | null;
  status: Estagio;
  fonte: Fonte;
  motivoPerda: MotivoPerda | null;
  proximaAcao: string | null;
  proximaAcaoEm: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  tenantId: string | null;
  tenantCodigo: string | null;
  tenantNome: string | null;
  assinaturaEstado: EstadoAssinatura | null;
  trialExpiraEm: string | null;
  vinculoCriouLead: boolean;
  atendidoEm: string | null;
  estagioEm: string;
  criadoEm: string;
  temInteracaoHumana: boolean;
  /** "Recife · PE", pelo DDD do telefone (lib/ddd). */
  praca: string | null;
  /** Lead criado pelo vínculo que ainda tem o nome da rede como nome (Revisão 10). */
  semResponsavel: boolean;
  temperatura: Temperatura | null;
  /** Excluído do CRM (some do quadro, o histórico fica). Null = no quadro. */
  excluidoEm: string | null;
};

/** Print de uma nota, com link assinado de 1 h. */
export type AnexoCrm = {
  id: string;
  url: string;
  largura: number | null;
  altura: number | null;
  bytes: number;
};

export type InteracaoCrm = {
  id: string;
  tipo: TipoInteracao;
  texto: string;
  criadoEm: string;
  anexos: AnexoCrm[];
  /** Quantos prints desta nota foram removidos (só o contador fica). */
  anexosRemovidos: number;
};
