import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Registra uma linha no audit_log usando a SESSÃO do usuário (RLS resolve o
 * tenant). NUNCA usa service_role. Nasce na Entrega 2 (Limpeza de Pátio) e é
 * reusado nas próximas entregas (tarifas, operadores, config, mensalistas…).
 *
 * ⚠️ Falhar aqui NÃO pode quebrar a operação principal: qualquer erro é
 * capturado e apenas logado. O chamador não precisa tratar o retorno.
 */
export async function registrarAuditoria(input: {
  modulo: string;
  acao: string;
  descricao: string;
  dados?: Record<string, unknown>;
  patioId?: string | null;
}): Promise<void> {
  try {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    const tenantId = (user?.app_metadata as { tenant_id?: string })?.tenant_id;
    if (!user || !tenantId) return; // sem sessão/tenant → não registra, não quebra

    const nome =
      (user.user_metadata as { nome?: string } | undefined)?.nome ??
      user.email ??
      null;

    const { error } = await sb.from("audit_log").insert({
      tenant_id: tenantId,
      patio_id: input.patioId ?? null,
      usuario_id: user.id,
      usuario_email: user.email ?? null,
      usuario_nome: nome,
      modulo: input.modulo,
      acao: input.acao,
      descricao: input.descricao,
      dados: input.dados ?? {},
    });
    if (error) console.error("[auditoria] insert falhou (ignorado):", error.message);
  } catch (e) {
    console.error("[auditoria] exceção ao registrar (ignorado):", e);
  }
}

type Formatador = (v: unknown) => string;

/**
 * Compara dois conjuntos de campos e devolve um resumo humano
 * ("rótulo antes → depois; …") + os objetos { antes, depois } só com o que mudou.
 * Comparação tolerante por String() (números vindos de form vs banco batem).
 */
export function diffCampos(
  antes: Record<string, unknown>,
  depois: Record<string, unknown>,
  rotulos: Record<string, string>,
  fmt: Record<string, Formatador> = {},
): {
  mudou: boolean;
  resumo: string;
  antes: Record<string, unknown>;
  depois: Record<string, unknown>;
} {
  const a: Record<string, unknown> = {};
  const d: Record<string, unknown> = {};
  const frases: string[] = [];
  for (const chave of Object.keys(rotulos)) {
    const va = antes[chave];
    const vd = depois[chave];
    if (String(va ?? "") !== String(vd ?? "")) {
      a[chave] = va ?? null;
      d[chave] = vd ?? null;
      const f = fmt[chave] ?? ((v: unknown) => String(v ?? "—"));
      frases.push(`${rotulos[chave]} ${f(va)} → ${f(vd)}`);
    }
  }
  return {
    mudou: frases.length > 0,
    resumo: frases.join("; "),
    antes: a,
    depois: d,
  };
}

/** Formata moeda BRL para descrições de auditoria. */
export function brl(v: unknown): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(v) || 0);
}
