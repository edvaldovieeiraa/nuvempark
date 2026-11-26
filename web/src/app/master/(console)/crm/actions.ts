"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessaoMasterAtiva } from "@/lib/master-auth";
import { podeExcluirComoSpam, podeMoverPara, type DestinoManual } from "@/lib/crm/regras";
import type {
  Estagio,
  EstadoAssinatura,
  Fonte,
  InteracaoCrm,
  MotivoPerda,
  TipoInteracaoManual,
} from "@/lib/crm/tipos";
import {
  validarInteracao,
  validarLeadManual,
  validarMovimento,
  validarProximaAcao,
  validarContatoLead,
  type EntradaLeadManual,
} from "@/lib/crm/validacao";

/**
 * Server actions do CRM (db/47).
 *
 * Tudo roda com service_role, então CADA action revalida a sessão master antes
 * de tocar no banco: uma server action é um endpoint HTTP como qualquer outro.
 * Escrita em mais de uma tabela passa pelas funções `fn_crm_*`, que são
 * atômicas; a matriz de estágio é conferida aqui (`lib/crm/regras.ts`).
 */

export type Resultado = { ok: true; msg: string } | { ok: false; msg: string };

export type Duplicado = {
  id: string;
  nome: string;
  empresa: string | null;
  status: Estagio;
  casouPor: "email" | "telefone" | "ambos";
};

export type ResultadoLeadManual =
  | { ok: true; msg: string; id: string }
  | { ok: false; msg: string; duplicados?: Duplicado[] };

const ROTA = "/master/crm";
const SESSAO_EXPIRADA = { ok: false, msg: "Sessão master expirada." } as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Admin = ReturnType<typeof createAdminClient>;
type LeadParaAcao = {
  status: Estagio;
  tenantId: string | null;
  assinaturaEstado: EstadoAssinatura | null;
  fonte: Fonte;
  temInteracaoHumana: boolean;
};

async function lerLead(sb: Admin, id: string): Promise<LeadParaAcao | null> {
  if (!UUID.test(id)) return null;
  const { data } = await sb
    .from("crm_leads_v")
    .select("status, tenant_id, assinatura_estado, fonte, tem_interacao_humana")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const d = data as {
    status: Estagio;
    tenant_id: string | null;
    assinatura_estado: EstadoAssinatura | null;
    fonte: Fonte;
    tem_interacao_humana: boolean;
  };
  return {
    status: d.status,
    tenantId: d.tenant_id,
    assinaturaEstado: d.assinatura_estado,
    fonte: d.fonte,
    temInteracaoHumana: d.tem_interacao_humana,
  };
}

function mensagemDoMover(res: string | null): Resultado | null {
  if (res === "ok") return null;
  if (res === "mudou")
    return { ok: false, msg: "O lead mudou de estágio enquanto a tela estava aberta. Recarregue." };
  if (res === "nao_encontrado") return { ok: false, msg: "Lead não encontrado." };
  return { ok: false, msg: "Não foi possível mudar o estágio." };
}

const ROTULO_DESTINO: Record<Exclude<DestinoManual, "trial">, string> = {
  novo: "de volta para Novo",
  em_contato: "em Em contato",
  perdido: "em Perdido",
};

/** Muda o estágio pela matriz (Revisão 1). Trial não é destino aqui: é "Reabrir". */
export async function moverEstagio(entrada: {
  id: string;
  de: Estagio;
  para: Exclude<DestinoManual, "trial">;
  motivoPerda?: MotivoPerda | null;
  texto?: string | null;
}): Promise<Resultado> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  if (!["novo", "em_contato", "perdido"].includes(entrada.para))
    return { ok: false, msg: "Estágio inválido." };

  const sb = createAdminClient();
  const lead = await lerLead(sb, entrada.id);
  if (!lead) return { ok: false, msg: "Lead não encontrado." };

  const v = validarMovimento(lead, entrada);
  if (!v.ok) return v;

  const { data, error } = await sb.rpc("fn_crm_mover", {
    p_id: entrada.id,
    p_de: entrada.de,
    p_para: entrada.para,
    p_motivo_perda: entrada.para === "perdido" ? entrada.motivoPerda : null,
    p_texto: entrada.para === "perdido" ? (entrada.texto ?? "").trim() || null : null,
  });
  if (error) {
    console.error("[master/crm] mover:", error.message);
    return { ok: false, msg: "Não foi possível mudar o estágio." };
  }
  const falha = mensagemDoMover(data as string | null);
  if (falha) return falha;

  revalidatePath(ROTA);
  return { ok: true, msg: `Lead ${ROTULO_DESTINO[entrada.para]}.` };
}

/** Perdido com rede ligada e assinatura ainda em trial → volta a Trial. */
export async function reabrirLead(id: string): Promise<Resultado> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  const sb = createAdminClient();
  const lead = await lerLead(sb, id);
  if (!lead) return { ok: false, msg: "Lead não encontrado." };
  if (!podeMoverPara(lead, "trial"))
    return { ok: false, msg: "Só dá para reabrir um lead perdido cuja rede ainda está em trial." };

  const { data, error } = await sb.rpc("fn_crm_mover", {
    p_id: id,
    p_de: "perdido",
    p_para: "trial",
    p_motivo_perda: null,
    p_texto: null,
  });
  if (error) {
    console.error("[master/crm] reabrir:", error.message);
    return { ok: false, msg: "Não foi possível reabrir o lead." };
  }
  const falha = mensagemDoMover(data as string | null);
  if (falha) return falha;

  revalidatePath(ROTA);
  return { ok: true, msg: "Lead reaberto em Trial." };
}

export async function registrarInteracao(entrada: {
  leadId: string;
  tipo: TipoInteracaoManual;
  texto: string;
  concluirProximaAcao?: boolean;
}): Promise<Resultado> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  if (!UUID.test(entrada.leadId)) return { ok: false, msg: "Lead não encontrado." };
  const v = validarInteracao(entrada);
  if (!v.ok) return v;

  const sb = createAdminClient();
  const { data, error } = await sb.rpc("fn_crm_registrar_interacao", {
    p_lead_id: entrada.leadId,
    p_tipo: v.tipo,
    p_texto: v.texto,
    p_concluir: !!entrada.concluirProximaAcao,
  });
  if (error) {
    console.error("[master/crm] interação:", error.message);
    return { ok: false, msg: "Não foi possível registrar a interação." };
  }
  if (!data) return { ok: false, msg: "Lead não encontrado." };

  revalidatePath(ROTA);
  return {
    ok: true,
    msg: entrada.concluirProximaAcao ? "Interação registrada e próxima ação concluída." : "Interação registrada.",
  };
}

/** Define ou reagenda a próxima ação; `null` limpa (concluir). */
export async function definirProximaAcao(
  leadId: string,
  acao: { proximaAcao: string; proximaAcaoEm: string } | null,
): Promise<Resultado> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  if (!UUID.test(leadId)) return { ok: false, msg: "Lead não encontrado." };
  const v = validarProximaAcao(acao);
  if (!v.ok) return v;

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("leads_site")
    .update({ proxima_acao: v.proximaAcao, proxima_acao_em: v.proximaAcaoEm })
    .eq("id", leadId)
    .select("id");
  if (error) {
    console.error("[master/crm] próxima ação:", error.message);
    return { ok: false, msg: "Não foi possível salvar a próxima ação." };
  }
  if (!data?.length) return { ok: false, msg: "Lead não encontrado." };

  revalidatePath(ROTA);
  return { ok: true, msg: acao ? "Próxima ação salva." : "Próxima ação concluída." };
}

const POR_PAGINA = 20;

/**
 * Linha do tempo, 20 por vez, da mais nova para a mais antiga. A página
 * seguinte começa depois do último item (`criado_em`, `id`): várias interações
 * têm o mesmo `criado_em` (o trigger e a RPC gravam no mesmo `now()`), então
 * cortar só por data pularia itens na virada da página.
 */
export async function carregarLinhaDoTempo(
  leadId: string,
  depoisDe?: { criadoEm: string; id: string } | null,
): Promise<{ ok: true; itens: InteracaoCrm[]; temMais: boolean } | { ok: false; msg: string }> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  if (!UUID.test(leadId)) return { ok: false, msg: "Lead não encontrado." };

  const sb = createAdminClient();
  let q = sb
    .from("lead_interacoes")
    .select("id, tipo, texto, criado_em")
    .eq("lead_id", leadId)
    .order("criado_em", { ascending: false })
    .order("id", { ascending: false })
    .limit(POR_PAGINA + 1);
  if (depoisDe) {
    if (Number.isNaN(Date.parse(depoisDe.criadoEm)) || !UUID.test(depoisDe.id))
      return { ok: false, msg: "Não foi possível carregar a linha do tempo." };
    // O valor do banco como veio: `toISOString()` cortaria os microssegundos
    // e o `eq` nunca casaria. Só passa texto de data (sem vírgula nem parêntese).
    if (!/^[0-9T:.+\- Z]+$/.test(depoisDe.criadoEm))
      return { ok: false, msg: "Não foi possível carregar a linha do tempo." };
    const c = depoisDe.criadoEm;
    q = q.or(`criado_em.lt.${c},and(criado_em.eq.${c},id.lt.${depoisDe.id})`);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[master/crm] linha do tempo:", error.message);
    return { ok: false, msg: "Não foi possível carregar a linha do tempo." };
  }
  const linhas = (data ?? []) as { id: string; tipo: InteracaoCrm["tipo"]; texto: string; criado_em: string }[];
  return {
    ok: true,
    temMais: linhas.length > POR_PAGINA,
    itens: linhas.slice(0, POR_PAGINA).map((l) => ({
      id: l.id,
      tipo: l.tipo,
      texto: l.texto,
      criadoEm: l.criado_em,
    })),
  };
}

type DuplicadoBanco = { id: string; nome: string; empresa: string | null; status: Estagio; casou_por: Duplicado["casouPor"] };

/** Cria um lead à mão (req. 18). Duplicado não é criado: devolve os que casaram (req. 19). */
export async function criarLeadManual(entrada: EntradaLeadManual): Promise<ResultadoLeadManual> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  const v = validarLeadManual(entrada);
  if (!v.ok) return v;
  const d = v.dados;

  const sb = createAdminClient();
  const { data, error } = await sb.rpc("fn_crm_criar_lead_manual", {
    p_nome: d.nome,
    p_empresa: d.empresa,
    p_email: d.email,
    p_telefone: d.telefone,
    p_status: d.status,
    p_nota: d.nota,
    p_proxima_acao: d.proximaAcao,
    p_proxima_acao_em: d.proximaAcaoEm,
  });
  if (error) {
    console.error("[master/crm] lead manual:", error.message);
    return { ok: false, msg: "Não foi possível criar o lead." };
  }
  const r = data as { ok: boolean; id?: string; duplicados?: DuplicadoBanco[] };
  if (!r.ok) {
    return {
      ok: false,
      msg: "Lead não criado: esse contato já está no CRM.",
      duplicados: (r.duplicados ?? []).map((x) => ({
        id: x.id,
        nome: x.nome,
        empresa: x.empresa,
        status: x.status,
        casouPor: x.casou_por,
      })),
    };
  }

  revalidatePath(ROTA);
  return { ok: true, msg: "Lead criado.", id: r.id as string };
}

/** Edita nome, empresa e contatos. Pelo menos um contato; duplicado é checado ao salvar. */
export async function editarContatoLead(entrada: {
  id: string;
  nome: string;
  empresa?: string | null;
  telefone?: string | null;
  email?: string | null;
}): Promise<ResultadoLeadManual> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  if (!UUID.test(entrada.id)) return { ok: false, msg: "Lead não encontrado." };
  const v = validarContatoLead(entrada);
  if (!v.ok) return v;

  // Checagem de duplicado e gravação na mesma função, sob o mesmo lock.
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("fn_crm_editar_contato", {
    p_id: entrada.id,
    p_nome: v.dados.nome,
    p_empresa: v.dados.empresa,
    p_email: v.dados.email,
    p_telefone: v.dados.telefone,
  });
  if (error) {
    console.error("[master/crm] editar:", error.message);
    return { ok: false, msg: "Não foi possível salvar o contato." };
  }
  const r = data as { ok: boolean; nao_encontrado?: boolean; duplicados?: DuplicadoBanco[] };
  if (r.nao_encontrado) return { ok: false, msg: "Lead não encontrado." };
  if (!r.ok) {
    return {
      ok: false,
      msg: "Contato não salvo: esse e-mail ou telefone já está em outro lead.",
      duplicados: (r.duplicados ?? []).map((x) => ({
        id: x.id,
        nome: x.nome,
        empresa: x.empresa,
        status: x.status,
        casouPor: x.casou_por,
      })),
    };
  }

  revalidatePath(ROTA);
  return { ok: true, msg: "Contato salvo.", id: entrada.id };
}

/** Apaga de vez um spam do formulário (Revisão 3). O resto vai para Perdido. */
export async function excluirLeadSpam(id: string): Promise<Resultado> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  const sb = createAdminClient();
  const lead = await lerLead(sb, id);
  if (!lead) return { ok: false, msg: "Lead não encontrado." };
  if (!podeExcluirComoSpam(lead))
    return {
      ok: false,
      msg: "Só dá para excluir lead do formulário sem rede e sem interação. Use Perdido, que guarda o histórico.",
    };

  const { data, error } = await sb.rpc("fn_crm_excluir_spam", { p_id: id });
  if (error) {
    console.error("[master/crm] excluir spam:", error.message);
    return { ok: false, msg: "Não foi possível excluir." };
  }
  if (!data) return { ok: false, msg: "O lead mudou e não pode mais ser excluído. Recarregue." };

  revalidatePath(ROTA);
  return { ok: true, msg: "Lead excluído." };
}
