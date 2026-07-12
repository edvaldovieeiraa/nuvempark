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
