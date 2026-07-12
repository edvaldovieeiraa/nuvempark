"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

/**
 * Limpeza de Pátio — soft-delete em lote dos tickets "No Pátio"
 * (status='aberto' AND saida IS NULL) por intervalo de DATA DE ENTRADA.
 *
 * Roda SEMPRE via sessão do gestor (RLS ativa) — nunca service_role.
 * Escopado ao pátio selecionado no menu lateral. Nunca DELETE físico.
 */

export type EscopoLimpeza = {
  patioId: string;
  /** Limite inferior do intervalo de ENTRADA (ISO, borda inicial do dia local). */
  inicioIso: string;
  /** Limite superior do intervalo de ENTRADA (ISO, borda final do dia local). */
  fimIso: string;
  /** true = inclui origem='plano' (mensalistas). false = só origem='avulso'. */
  incluirMensalistas: boolean;
};

async function contexto() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return {
    sb,
    user,
    tenantId: (user?.app_metadata as { tenant_id?: string })?.tenant_id,
  };
}

/** Aplica o escopo (pátio, status, saída nula, intervalo, origem) numa query. */
function aplicarEscopo<
  Q extends {
    eq: (col: string, val: string) => Q;
    is: (col: string, val: null) => Q;
    gte: (col: string, val: string) => Q;
    lte: (col: string, val: string) => Q;
  },
>(query: Q, e: EscopoLimpeza): Q {
  let q = query
    .eq("patio_id", e.patioId)
    .eq("status", "aberto")
    .is("saida", null)
    .gte("entrada", e.inicioIso)
    .lte("entrada", e.fimIso);
  if (!e.incluirMensalistas) q = q.eq("origem", "avulso");
  return q;
}

/** Prévia obrigatória: quantos tickets o escopo atual removeria. */
export async function preverLimpeza(
  e: EscopoLimpeza,
): Promise<{ count: number }> {
  const { sb } = await contexto();
  const query = sb.from("tickets").select("id", { count: "exact", head: true });
  const { count, error } = await aplicarEscopo(query, e);
  if (error) return { count: 0 };
  return { count: count ?? 0 };
}

export type ResultadoLimpeza = {
  ok: boolean;
  removidos: number;
  msg: string;
};

/** Executa o soft-delete em lote + registra no audit_log. */
export async function executarLimpeza(
  e: EscopoLimpeza & { motivo: string },
): Promise<ResultadoLimpeza> {
  const { sb, user, tenantId } = await contexto();
  if (!user || !tenantId)
    return { ok: false, removidos: 0, msg: "Sessão sem rede vinculada." };

  const motivo = e.motivo.trim();
  if (!motivo)
    return { ok: false, removidos: 0, msg: "Informe o motivo da limpeza." };

  const nome =
    (user.user_metadata as { nome?: string } | undefined)?.nome ??
    user.email ??
    "gestor";

  const query = sb.from("tickets").update({
    status: "removido",
    removido_em: new Date().toISOString(),
    removido_por: user.id,
    removido_por_nome: nome,
    remocao_motivo: motivo,
  });
  const { data, error } = await aplicarEscopo(query, e).select("id");

  if (error)
    return { ok: false, removidos: 0, msg: "Não foi possível concluir a limpeza." };

  const removidos = data?.length ?? 0;

  // Auditoria — não bloqueia nem quebra a operação (helper captura erro).
  const dia = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
  await registrarAuditoria({
    modulo: "operacao",
    acao: "limpeza_patio",
    patioId: e.patioId,
    descricao: `Limpeza de pátio: ${removidos} ticket(s) removido(s) (${dia(e.inicioIso)}–${dia(e.fimIso)}). Motivo: ${motivo}`,
    dados: {
      intervalo: { inicio: e.inicioIso, fim: e.fimIso },
      escopo: { incluirMensalistas: e.incluirMensalistas },
      quantidade: removidos,
      motivo,
    },
  });

  revalidatePath("/painel/patio");
  revalidatePath("/painel/removidos");
  return {
    ok: true,
    removidos,
    msg: `${removidos} ${removidos === 1 ? "ticket removido" : "tickets removidos"} do pátio.`,
  };
}
