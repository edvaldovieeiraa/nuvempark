import type { createAdminClient } from "@/lib/supabase/admin";
import { localizacaoPorTelefone } from "@/lib/ddd";
import type { EstadoAssinatura, Estagio, Fonte, LeadCrm, MotivoPerda } from "@/lib/crm/tipos";

/**
 * Leitura do CRM: `crm_leads_v` (db/47), só service_role.
 *
 * Ganho e Perdido vêm só dos últimos 30 dias pela data do estágio (req. 22),
 * a não ser que a lista peça um desses estágios inteiro. A linha do tempo não
 * vem aqui: é carregada ao abrir o lead.
 *
 * Sem `import "server-only"` de propósito: `montarLead` é testada no vitest.
 * O cliente admin só chega aqui como parâmetro, vindo de um server component.
 */

type Admin = ReturnType<typeof createAdminClient>;

export type LinhaCrm = {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  assunto: string | null;
  origem: string | null;
  status: Estagio;
  fonte: Fonte;
  motivo_perda: MotivoPerda | null;
  proxima_acao: string | null;
  proxima_acao_em: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  tenant_id: string | null;
  vinculo_criou_lead: boolean;
  atendido_em: string | null;
  estagio_em: string;
  criado_em: string;
  atualizado_em: string;
  tenant_codigo: string | null;
  tenant_nome: string | null;
  assinatura_estado: EstadoAssinatura | null;
  trial_expira_em: string | null;
  tem_interacao_humana: boolean;
};

const COLUNAS =
  "id, nome, empresa, email, telefone, assunto, origem, status, fonte, motivo_perda, " +
  "proxima_acao, proxima_acao_em, utm_source, utm_medium, utm_campaign, tenant_id, " +
  "vinculo_criou_lead, atendido_em, estagio_em, criado_em, atualizado_em, tenant_codigo, " +
  "tenant_nome, assinatura_estado, trial_expira_em, tem_interacao_humana";

export const DIAS_JANELA = 30;

export function inicioJanela(agora: Date): string {
  return new Date(agora.getTime() - DIAS_JANELA * 24 * 60 * 60 * 1000).toISOString();
}

export function montarLead(l: LinhaCrm): LeadCrm {
  const local = localizacaoPorTelefone(l.telefone);
  return {
    id: l.id,
    nome: l.nome,
    empresa: l.empresa,
    email: l.email,
    telefone: l.telefone,
    assunto: l.assunto,
    origem: l.origem,
    status: l.status,
    fonte: l.fonte,
    motivoPerda: l.motivo_perda,
    proximaAcao: l.proxima_acao,
    proximaAcaoEm: l.proxima_acao_em,
    utmSource: l.utm_source,
    utmMedium: l.utm_medium,
    utmCampaign: l.utm_campaign,
    tenantId: l.tenant_id,
    tenantCodigo: l.tenant_codigo,
    tenantNome: l.tenant_nome,
    assinaturaEstado: l.assinatura_estado,
    trialExpiraEm: l.trial_expira_em,
    vinculoCriouLead: l.vinculo_criou_lead,
    atendidoEm: l.atendido_em,
    estagioEm: l.estagio_em,
    criadoEm: l.criado_em,
    temInteracaoHumana: l.tem_interacao_humana,
    praca: local ? `${local.praca} · ${local.uf}` : null,
    semResponsavel:
      !!l.tenant_nome && l.nome === l.empresa && l.empresa === l.tenant_nome,
  };
}

/**
 * O PostgREST do Supabase devolve no máximo 1000 linhas por pedido
 * (`max-rows`), e um `.limit()` maior é cortado em silêncio. Por isso a
 * leitura pagina de 1000 em 1000 até uma página vir incompleta.
 */
const POR_PAGINA = 1000;
const MAX_PAGINAS = 50;

export async function carregarCrm(
  sb: Admin,
  opcoes: { estagio?: "ganho" | "perdido" | null; agora?: Date } = {},
): Promise<{ leads: LeadCrm[]; erro: boolean }> {
  const desde = inicioJanela(opcoes.agora ?? new Date());
  const linhas: LinhaCrm[] = [];

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    let q = sb.from("crm_leads_v").select(COLUNAS);
    q = opcoes.estagio
      ? q.eq("status", opcoes.estagio)
      : q.or(`status.in.(novo,em_contato,trial),estagio_em.gte.${desde}`);
    const de = pagina * POR_PAGINA;
    const { data, error } = await q
      .order("criado_em", { ascending: false })
      .order("id", { ascending: false })
      .range(de, de + POR_PAGINA - 1);
    if (error) {
      console.error("[master/crm] select:", error.message);
      return { leads: [], erro: true };
    }
    const pag = (data as unknown as LinhaCrm[] | null) ?? [];
    linhas.push(...pag);
    if (pag.length < POR_PAGINA) break;
    if (pagina === MAX_PAGINAS - 1)
      console.warn(`[master/crm] mais de ${MAX_PAGINAS * POR_PAGINA} leads: a lista foi cortada`);
  }
  return { leads: linhas.map(montarLead), erro: false };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Um lead pelo id, fora da janela: o `?lead=` de um "Abrir" de duplicado ou
 * de um recarregar pode apontar para um Ganho ou Perdido antigo.
 */
export async function carregarLead(sb: Admin, id: string): Promise<LeadCrm | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await sb.from("crm_leads_v").select(COLUNAS).eq("id", id).maybeSingle();
  if (error) {
    console.error("[master/crm] select lead:", error.message);
    return null;
  }
  return data ? montarLead(data as unknown as LinhaCrm) : null;
}
