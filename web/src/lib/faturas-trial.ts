import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * Geração da "próxima fatura" para assinaturas em TRIAL.
 *
 * O motor mensal (`fn_gerar_faturas_mes`) exclui trials de propósito — não se
 * cobra quem está no teste. Mas o cliente pode querer PAGAR antecipado e já
 * ativar a assinatura. Para isso a primeira fatura precisa existir (linha real),
 * para aparecer nos dois painéis e receber a cobrança do Asaas.
 *
 * Regra: competência = mês em que o trial expira (primeiro mês pago);
 * vencimento = dia configurado nesse mês, nunca antes do fim do teste;
 * valor = valor_por_patio × pátios ativos. Idempotente por (tenant, competência).
 * Só gera quando há valor a cobrar (valor_por_patio > 0 e ≥ 1 pátio ativo).
 */

type Admin = ReturnType<typeof createAdminClient>;

type AssinaturaTrial = {
  tenant_id: string;
  estado: string;
  valor_por_patio: number;
  dia_vencimento: number | null;
  trial_expira_em: string | null;
};

export function competenciaEVencimento(trialExpiraEm: string, diaVenc: number) {
  const fim = new Date(trialExpiraEm);
  const ano = fim.getUTCFullYear();
  const mes = fim.getUTCMonth() + 1; // 1-based
  const dia = Math.min(28, Math.max(1, diaVenc || 10));
  const competencia = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const vencDia = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  const fimData = trialExpiraEm.slice(0, 10); // yyyy-mm-dd do fim do trial
  // vencimento nunca antes do fim do teste (comparação de strings ISO funciona)
  const vencimento = vencDia >= fimData ? vencDia : fimData;
  return { competencia, vencimento };
}

/**
 * Garante a fatura de um tenant em trial. Retorna true se criou agora.
 * Silencioso: qualquer condição que não gere fatura retorna false.
 */
export async function garantirFaturaTrial(
  sb: Admin,
  tenantId: string,
): Promise<boolean> {
  const { data: assinatura } = await sb
    .from("assinaturas")
    .select("tenant_id, estado, valor_por_patio, dia_vencimento, trial_expira_em")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const a = assinatura as AssinaturaTrial | null;
  if (!a || a.estado !== "trial" || !a.trial_expira_em) return false;

  const valorPorPatio = Number(a.valor_por_patio) || 0;
  if (valorPorPatio <= 0) return false;

  const { count } = await sb
    .from("patios")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("ativo", true);
  const qtd = count ?? 0;
  if (qtd <= 0) return false;

  const { competencia, vencimento } = competenciaEVencimento(
    a.trial_expira_em,
    a.dia_vencimento ?? 10,
  );

  // idempotência por unique (tenant_id, competencia)
  const { data: existente } = await sb
    .from("faturas")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("competencia", competencia)
    .maybeSingle();
  if (existente) return false;

  const { error } = await sb.from("faturas").insert({
    tenant_id: tenantId,
    competencia,
    vencimento,
    valor: valorPorPatio * qtd,
    valor_por_patio: valorPorPatio,
    qtd_patios: qtd,
  });
  return !error;
}

/**
 * Varre todas as assinaturas em trial e garante a fatura de cada uma.
 * Uso oportunista no painel master (backfill de trials existentes).
 */
export async function garantirFaturasTrials(sb: Admin): Promise<number> {
  const { data: trials } = await sb
    .from("assinaturas")
    .select("tenant_id")
    .eq("estado", "trial");

  let criadas = 0;
  for (const t of (trials as { tenant_id: string }[] | null) ?? []) {
    if (await garantirFaturaTrial(sb, t.tenant_id)) criadas++;
  }
  return criadas;
}
