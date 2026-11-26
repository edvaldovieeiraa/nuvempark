import "server-only";
import { cookies } from "next/headers";
import type { createAdminClient } from "@/lib/supabase/admin";
import { decidirEnriquecimento, type LeadParaEnriquecer } from "@/lib/crm/enriquecimento";
import { COOKIE_ORIGEM, lerOrigem, type Origem } from "@/lib/crm/origem";

/**
 * Enriquecimento do lead da rede depois de um cadastro bem-sucedido (req. 13).
 *
 * O trigger das assinaturas (db/48) já ligou ou criou o lead com
 * `tenant_id = tenantId` dentro de `criarTenantComTrial`. Aqui só acrescentamos
 * o nome do responsável e a origem/UTM de primeiro toque — as regras de quando
 * cada campo entra estão em `lib/crm/enriquecimento.ts`.
 *
 * ⚠️ NUNCA lança e nunca faz o cadastro falhar: lead ausente, erro de banco ou
 * cookie ruim viram só `console.error`. O cliente admin chega por parâmetro —
 * é o mesmo que a action do cadastro já usa para criar o tenant; este módulo
 * não cria um uso novo do service_role. Ele não passa pela policy anônima,
 * então os valores são cortados aqui (mesmos limites da policy).
 */

type Admin = ReturnType<typeof createAdminClient>;

/** `np_origem` da requisição atual; qualquer problema → null. */
export async function origemDoCadastro(): Promise<Origem | null> {
  try {
    const loja = await cookies();
    return lerOrigem(loja.get(COOKIE_ORIGEM)?.value);
  } catch (e) {
    console.error("[crm] leitura do cookie de origem falhou:", e);
    return null;
  }
}

export async function enriquecerLeadDoCadastro(
  sb: Admin,
  params: { tenantId: string; nomeResponsavel: string | null | undefined; origem: Origem | null },
): Promise<void> {
  try {
    const { data, error } = await sb
      .from("leads_site")
      .select("id, nome, empresa, origem, utm_source, utm_medium, utm_campaign, vinculo_criou_lead")
      .eq("tenant_id", params.tenantId)
      .maybeSingle();
    if (error) {
      console.error("[crm] enriquecimento: leitura do lead falhou:", error);
      return;
    }
    if (!data) {
      console.error("[crm] enriquecimento: nenhum lead ligado ao tenant", params.tenantId);
      return;
    }

    const lead = data as LeadParaEnriquecer & { id: string };
    const patch = decidirEnriquecimento(lead, {
      nomeResponsavel: params.nomeResponsavel,
      origem: params.origem,
    });
    if (Object.keys(patch).length === 0) return;

    const { error: erroUpdate } = await sb
      .from("leads_site")
      .update(patch)
      .eq("id", lead.id)
      .eq("tenant_id", params.tenantId);
    if (erroUpdate) console.error("[crm] enriquecimento: update do lead falhou:", erroUpdate);
  } catch (e) {
    console.error("[crm] enriquecimento falhou:", e);
  }
}
