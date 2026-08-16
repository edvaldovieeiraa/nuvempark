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
 *
 * ## Por que isto virou uma casca fina
 *
 * A regra acima vive HOJE em `fn_garantir_faturas_trials` (db/37), em SQL.
 * Antes ela vivia aqui, num laço `for...of` com `await` dentro: para cada rede
 * em teste eram TRÊS consultas em série (reler a assinatura, contar os pátios,
 * procurar a fatura). Com 20 trials, 60 idas e voltas ao Supabase antes do
 * primeiro byte de /master/assinaturas — o motivo de a tela demorar.
 *
 * Agora é uma chamada só, e a idempotência é do `on conflict` em vez de um
 * SELECT-antes-do-INSERT que abria corrida entre duas abas.
 *
 * ⚠️ Se mudar a regra de competência/vencimento, mude no SQL — não reintroduza
 * o cálculo aqui. Ter as duas metades em linguagens diferentes foi o que fez a
 * versão antiga divergir do motor mensal.
 */

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Competência e vencimento da primeira fatura paga de um trial — em TypeScript.
 *
 * Não é a fonte da verdade: quem grava a fatura é `fn_garantir_faturas_trials`
 * (db/37), e a regra ali é a mesma, linha por linha. Esta cópia existe só para
 * PROJEÇÃO na tela: `/painel/assinatura` mostra ao gestor a próxima cobrança de
 * um trial que ainda não tem fatura gravada. Ela não escreve nada.
 *
 * ⚠️ Mudou a regra? Mude nos DOIS lugares, ou o gestor vê uma data e recebe
 * outra. O SQL manda; este aqui só precisa concordar com ele.
 */
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
 * Garante a fatura de UMA rede em trial. Retorna true se criou agora.
 * Silencioso: qualquer condição que não gere fatura retorna false.
 */
export async function garantirFaturaTrial(
  sb: Admin,
  tenantId: string,
): Promise<boolean> {
  const { data, error } = await sb.rpc("fn_garantir_faturas_trials", {
    p_tenant: tenantId,
  });
  if (error) {
    console.error("[faturas-trial] garantirFaturaTrial:", error);
    return false;
  }
  return typeof data === "number" && data > 0;
}

/**
 * Varre todas as assinaturas em trial e garante a fatura de cada uma.
 * Uso oportunista no painel master (backfill de trials existentes).
 * Retorna quantas faturas foram criadas nesta chamada.
 */
export async function garantirFaturasTrials(sb: Admin): Promise<number> {
  const { data, error } = await sb.rpc("fn_garantir_faturas_trials", {
    p_tenant: null,
  });
  if (error) {
    console.error("[faturas-trial] garantirFaturasTrials:", error);
    return 0;
  }
  return typeof data === "number" ? data : 0;
}
