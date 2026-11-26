import { cortarCaminho, limparTexto, utmParaLead, type Origem } from "@/lib/crm/origem";

/**
 * Decisão pura do enriquecimento do lead depois do cadastro (req. 13 e 20).
 * Quem grava é `lib/crm/enriquecer.ts` (server-only); aqui fica só o "o quê",
 * para o vitest provar as regras sem banco.
 *
 * - `nome`: só quando o lead nasceu do vínculo (`vinculo_criou_lead`) e ainda
 *   tem o nome da rede (`nome = empresa`, gravado pelo trigger da db/48). Lead
 *   de contato já tem o nome que a pessoa digitou — não se troca.
 * - `utm_*`: só onde ainda está nulo. Nunca sobrescreve.
 * - `origem` (caminho de entrada): só no lead do vínculo. Lead de contato
 *   guarda a página do formulário, que é informação diferente.
 */

const NOME_MIN = 2;
const NOME_MAX = 120; // mesmo limite das funções do CRM (db/47)

export type LeadParaEnriquecer = {
  nome: string;
  empresa: string | null;
  origem: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  vinculo_criou_lead: boolean;
};

export type PatchEnriquecimento = Partial<{
  nome: string;
  origem: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
}>;

function nomeLimpo(nome: string | null | undefined): string | null {
  const limpo = limparTexto(nome, NOME_MAX);
  return limpo && Array.from(limpo).length >= NOME_MIN ? limpo : null;
}

export function decidirEnriquecimento(
  lead: LeadParaEnriquecer,
  dados: { nomeResponsavel: string | null | undefined; origem: Origem | null },
): PatchEnriquecimento {
  const patch: PatchEnriquecimento = {};

  const nome = nomeLimpo(dados.nomeResponsavel);
  if (lead.vinculo_criou_lead && lead.nome === lead.empresa && nome && nome !== lead.nome) {
    patch.nome = nome;
  }

  const utm = utmParaLead(dados.origem);
  if (lead.utm_source === null && utm.utm_source) patch.utm_source = utm.utm_source;
  if (lead.utm_medium === null && utm.utm_medium) patch.utm_medium = utm.utm_medium;
  if (lead.utm_campaign === null && utm.utm_campaign) patch.utm_campaign = utm.utm_campaign;

  const caminho = cortarCaminho(dados.origem?.caminho);
  if (lead.vinculo_criou_lead && caminho && caminho !== lead.origem) patch.origem = caminho;

  return patch;
}
