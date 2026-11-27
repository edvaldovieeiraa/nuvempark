"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessaoMasterAtiva } from "@/lib/master-auth";
import type { DestinoManual } from "@/lib/crm/regras";
import { LIMITE_PRINTS, caminhoDoLead } from "@/lib/crm/anexos";
import {
  apagarPrint,
  assinarPrints,
  conferirPrints,
  descartarOrfaos,
  subirPrint,
} from "@/lib/crm/anexos-servidor";
import { validarTemperatura } from "@/lib/crm/temperatura";
import {
  ESTAGIOS,
  type Estagio,
  EstadoAssinatura,
  Fonte,
  InteracaoCrm,
  MotivoPerda,
  Temperatura,
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
 * Server actions do CRM (db/47 e db/54).
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
  /** Excluído do CRM: o aviso oferece "Restaurar e abrir" (db/54). */
  excluido: boolean;
  excluidoEm: string | null;
};

export type ResultadoLeadManual =
  | { ok: true; msg: string; id: string }
  | { ok: false; msg: string; duplicados?: Duplicado[] };

const ROTA = "/master/crm";
const SESSAO_EXPIRADA = { ok: false, msg: "Sessão master expirada." } as const;
const LEAD_EXCLUIDO = { ok: false, msg: "Este lead foi excluído. Recarregue." } as const;
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
  if (res === "excluido") return LEAD_EXCLUIDO;
  return { ok: false, msg: "Não foi possível mudar o estágio." };
}

const ROTULO_DESTINO: Record<DestinoManual, string> = {
  novo: "em Novo",
  em_contato: "em Em contato",
  trial: "em Trial",
  ganho: "em Ganho",
  perdido: "em Perdido",
};

/** Muda o estágio (movimento livre; ver `lib/crm/regras.ts`). Perdido exige o motivo. */
export async function moverEstagio(entrada: {
  id: string;
  de: Estagio;
  para: DestinoManual;
  motivoPerda?: MotivoPerda | null;
  texto?: string | null;
}): Promise<Resultado> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  if (!(ESTAGIOS as readonly string[]).includes(entrada.para))
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

/**
 * Registra uma interação. Os prints (até 5) já foram enviados um a um por
 * `enviarAnexoCrm`; aqui chegam só os caminhos. Tipo, tamanho e dimensões são
 * lidos de novo no Storage. Se a gravação falhar, os arquivos que não são de
 * nenhuma nota são apagados.
 */
export async function registrarInteracao(entrada: {
  leadId: string;
  tipo: TipoInteracaoManual;
  texto: string;
  concluirProximaAcao?: boolean;
  anexos?: string[];
}): Promise<Resultado> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  if (!UUID.test(entrada.leadId)) return { ok: false, msg: "Lead não encontrado." };
  const caminhos = Array.isArray(entrada.anexos) ? entrada.anexos.map(String) : [];
  if (caminhos.length > LIMITE_PRINTS) return { ok: false, msg: `Até ${LIMITE_PRINTS} prints por nota.` };
  if (new Set(caminhos).size !== caminhos.length || !caminhos.every((c) => caminhoDoLead(entrada.leadId, c)))
    return { ok: false, msg: "Print inválido. Cole de novo." };
  const v = validarInteracao({ ...entrada, temPrint: caminhos.length > 0 });
  if (!v.ok) return v;

  const sb = createAdminClient();
  const conferidos = await conferirPrints(sb, entrada.leadId, caminhos);
  if (!conferidos) {
    await descartarOrfaos(sb, entrada.leadId, caminhos);
    return { ok: false, msg: "Um dos prints não chegou ao servidor. Cole de novo." };
  }

  const { data, error } = await sb.rpc("fn_crm_registrar_interacao", {
    p_lead_id: entrada.leadId,
    p_tipo: v.tipo,
    p_texto: v.texto,
    p_concluir: !!entrada.concluirProximaAcao,
    p_anexos: conferidos,
  });
  if (error || !data) {
    await descartarOrfaos(sb, entrada.leadId, caminhos);
    if (error?.code === "55000") return LEAD_EXCLUIDO;
    if (error) {
      console.error("[master/crm] interação:", error.message);
      return { ok: false, msg: "Não foi possível registrar a interação." };
    }
    return { ok: false, msg: "Lead não encontrado." };
  }

  revalidatePath(ROTA);
  return {
    ok: true,
    msg: entrada.concluirProximaAcao ? "Interação registrada e próxima ação concluída." : "Interação registrada.",
  };
}

/**
 * Sobe UM print (cada envio cabe no limite de 6 MB das server actions).
 * Devolve o caminho, que o navegador repassa ao `registrarInteracao`.
 */
export async function enviarAnexoCrm(
  form: FormData,
): Promise<{ ok: true; caminho: string } | { ok: false; msg: string }> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  const leadId = String(form.get("leadId") ?? "");
  const arquivo = form.get("arquivo");
  if (!UUID.test(leadId)) return { ok: false, msg: "Lead não encontrado." };
  if (!(arquivo instanceof Blob)) return { ok: false, msg: "Print vazio." };

  const sb = createAdminClient();
  const { data: lead } = await sb.from("leads_site").select("id, excluido_em").eq("id", leadId).maybeSingle();
  if (!lead) return { ok: false, msg: "Lead não encontrado." };
  if ((lead as { excluido_em: string | null }).excluido_em) return LEAD_EXCLUIDO;

  return subirPrint(sb, leadId, new Uint8Array(await arquivo.arrayBuffer()));
}

/** Um envio seguinte falhou: apaga os prints já enviados que não são de nota nenhuma. */
export async function descartarAnexosCrm(entrada: { leadId: string; caminhos: string[] }): Promise<Resultado> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  if (!UUID.test(entrada.leadId) || !Array.isArray(entrada.caminhos)) return { ok: false, msg: "Pedido inválido." };
  await descartarOrfaos(createAdminClient(), entrada.leadId, entrada.caminhos.map(String).slice(0, LIMITE_PRINTS));
  return { ok: true, msg: "Prints descartados." };
}

/**
 * Remove um print salvo (spec, req. 25a): confere o lead, apaga o arquivo e só
 * então a linha. Se a linha falhar depois do arquivo, "Remover" pode ser
 * repetido (o arquivo já não existe, e remover de novo não dá erro).
 */
export async function removerAnexoCrm(anexoId: string): Promise<Resultado> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  if (!UUID.test(anexoId)) return { ok: false, msg: "Print não encontrado." };

  const sb = createAdminClient();
  const { data: anexo } = await sb
    .from("lead_anexos")
    .select("caminho, interacao_id")
    .eq("id", anexoId)
    .maybeSingle();
  const a = anexo as { caminho: string; interacao_id: string } | null;
  if (!a) return { ok: false, msg: "Print não encontrado. Recarregue." };
  const { data: inter } = await sb.from("lead_interacoes").select("lead_id").eq("id", a.interacao_id).maybeSingle();
  const leadId = (inter as { lead_id: string } | null)?.lead_id;
  if (!leadId) return { ok: false, msg: "Print não encontrado. Recarregue." };
  const { data: lead } = await sb.from("leads_site").select("excluido_em").eq("id", leadId).maybeSingle();
  if (!lead) return { ok: false, msg: "Lead não encontrado." };
  if ((lead as { excluido_em: string | null }).excluido_em) return LEAD_EXCLUIDO;

  if (!(await apagarPrint(sb, a.caminho))) return { ok: false, msg: "Não foi possível remover. Tente de novo." };
  const { data, error } = await sb.rpc("fn_crm_remover_anexo", { p_anexo_id: anexoId });
  if (error || !data) {
    if (error) console.error("[master/crm] remover print (linha):", error.message);
    return { ok: false, msg: "Não foi possível remover. Tente de novo." };
  }

  revalidatePath(ROTA);
  return { ok: true, msg: "Print removido." };
}

/** Marca ou tira a temperatura, com compare-and-set (`de` = o que a tela leu). */
export async function definirTemperatura(entrada: {
  id: string;
  de: Temperatura | null;
  para: Temperatura | null;
}): Promise<Resultado> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  if (!UUID.test(entrada.id)) return { ok: false, msg: "Lead não encontrado." };
  const v = validarTemperatura(entrada);
  if (!v.ok) return v;

  const sb = createAdminClient();
  const { data, error } = await sb.rpc("fn_crm_definir_temperatura", {
    p_id: entrada.id,
    p_de: v.de,
    p_para: v.para,
  });
  if (error) {
    console.error("[master/crm] temperatura:", error.message);
    return { ok: false, msg: "Não foi possível salvar a temperatura." };
  }
  if (data === "mudou") return { ok: false, msg: "A temperatura mudou em outra tela. Recarregue." };
  if (data === "excluido") return LEAD_EXCLUIDO;
  if (data !== "ok") return { ok: false, msg: "Lead não encontrado." };

  revalidatePath(ROTA);
  return { ok: true, msg: "Temperatura salva." };
}

/** Tira o lead do quadro (guarda o histórico). Volta pela visão "Excluídos". */
export async function excluirLead(id: string): Promise<Resultado> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  if (!UUID.test(id)) return { ok: false, msg: "Lead não encontrado." };
  const { data, error } = await createAdminClient().rpc("fn_crm_excluir", { p_id: id });
  if (error) {
    console.error("[master/crm] excluir:", error.message);
    return { ok: false, msg: "Não foi possível excluir." };
  }
  if (!data) return { ok: false, msg: "O lead já estava excluído ou não existe. Recarregue." };
  revalidatePath(ROTA);
  return { ok: true, msg: "Lead excluído. Está em Excluídos." };
}

/** Devolve ao quadro, no estágio em que estava. */
export async function restaurarLead(id: string): Promise<Resultado> {
  if (!(await sessaoMasterAtiva())) return SESSAO_EXPIRADA;
  if (!UUID.test(id)) return { ok: false, msg: "Lead não encontrado." };
  const { data, error } = await createAdminClient().rpc("fn_crm_restaurar", { p_id: id });
  if (error) {
    console.error("[master/crm] restaurar:", error.message);
    return { ok: false, msg: "Não foi possível restaurar." };
  }
  if (!data) return { ok: false, msg: "O lead não estava excluído. Recarregue." };
  revalidatePath(ROTA);
  return { ok: true, msg: "Lead restaurado." };
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
    .is("excluido_em", null)
    .select("id");
  if (error) {
    console.error("[master/crm] próxima ação:", error.message);
    return { ok: false, msg: "Não foi possível salvar a próxima ação." };
  }
  if (!data?.length) return { ok: false, msg: "Lead não encontrado ou excluído. Recarregue." };

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
    .select("id, tipo, texto, criado_em, anexos_removidos, lead_anexos(id, caminho, largura, altura, bytes, ordem)")
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
  type LinhaAnexo = { id: string; caminho: string; largura: number | null; altura: number | null; bytes: number; ordem: number };
  const linhas = ((data ?? []) as unknown as {
    id: string;
    tipo: InteracaoCrm["tipo"];
    texto: string;
    criado_em: string;
    anexos_removidos: number | null;
    lead_anexos: LinhaAnexo[] | null;
  }[]).slice(0, POR_PAGINA);
  const urls = await assinarPrints(
    sb,
    linhas.flatMap((l) => (l.lead_anexos ?? []).map((a) => a.caminho)),
  );
  return {
    ok: true,
    temMais: (data ?? []).length > POR_PAGINA,
    itens: linhas.map((l) => ({
      id: l.id,
      tipo: l.tipo,
      texto: l.texto,
      criadoEm: l.criado_em,
      anexosRemovidos: l.anexos_removidos ?? 0,
      anexos: [...(l.lead_anexos ?? [])]
        .sort((a, b) => a.ordem - b.ordem)
        .map((a) => ({ id: a.id, url: urls.get(a.caminho) ?? "", largura: a.largura, altura: a.altura, bytes: a.bytes })),
    })),
  };
}

type DuplicadoBanco = {
  id: string;
  nome: string;
  empresa: string | null;
  status: Estagio;
  casou_por: Duplicado["casouPor"];
  excluido?: boolean;
  excluido_em?: string | null;
};

function montarDuplicados(lista: DuplicadoBanco[] | undefined): Duplicado[] {
  return (lista ?? []).map((x) => ({
    id: x.id,
    nome: x.nome,
    empresa: x.empresa,
    status: x.status,
    casouPor: x.casou_por,
    excluido: !!x.excluido,
    excluidoEm: x.excluido_em ?? null,
  }));
}

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
      duplicados: montarDuplicados(r.duplicados),
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
  const r = data as { ok: boolean; nao_encontrado?: boolean; excluido?: boolean; duplicados?: DuplicadoBanco[] };
  if (r.nao_encontrado) return { ok: false, msg: "Lead não encontrado." };
  if (r.excluido) return LEAD_EXCLUIDO;
  if (!r.ok) {
    return {
      ok: false,
      msg: "Contato não salvo: esse e-mail ou telefone já está em outro lead.",
      duplicados: montarDuplicados(r.duplicados),
    };
  }

  revalidatePath(ROTA);
  return { ok: true, msg: "Contato salvo.", id: entrada.id };
}
