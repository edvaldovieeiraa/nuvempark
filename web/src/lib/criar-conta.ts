import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { garantirFaturaTrial } from "@/lib/faturas-trial";

/**
 * Nascimento de uma conta: tenant (código gerado) + assinatura em trial.
 *
 * Duas portas chegam aqui e precisam produzir EXATAMENTE a mesma conta: o
 * formulário de `/cadastro` (e-mail + senha) e o primeiro login com Google
 * (`/cadastro/completar`). Divergir aqui significaria, por exemplo, um trial de
 * tamanho diferente dependendo de como o cliente entrou.
 *
 * Não cria o usuário do Auth — quem faz isso é cada porta, porque o fluxo de
 * senha exige confirmação de e-mail e o do Google já chega verificado.
 */

type Admin = ReturnType<typeof createAdminClient>;

export const TRIAL_DIAS = 15;
const VALOR_POR_PATIO = 129.9;

export async function criarTenantComTrial(
  sb: Admin,
  params: { nomeRede: string; telefone: string; emailCobranca: string },
): Promise<{ ok: true; tenantId: string } | { ok: false }> {
  // 1) código de rede único (função do banco)
  const { data: codigoData, error: erroCodigo } = await sb.rpc(
    "fn_gerar_codigo_tenant",
  );
  if (erroCodigo || !codigoData) return { ok: false };
  const codigo = String(codigoData);

  // 2) tenant (código no mesmo insert — a coluna é NOT NULL)
  const { data: tenant, error: erroTenant } = await sb
    .from("tenants")
    .insert({ nome: params.nomeRede, codigo, telefone: params.telefone })
    .select("id")
    .single();
  if (erroTenant || !tenant) return { ok: false };

  // 3) assinatura em TRIAL
  const expira = new Date(Date.now() + TRIAL_DIAS * 24 * 60 * 60 * 1000);
  await sb.from("assinaturas").insert({
    tenant_id: tenant.id,
    valor_por_patio: VALOR_POR_PATIO,
    estado: "trial",
    trial_expira_em: expira.toISOString(),
    origem: "signup",
    email_cobranca: params.emailCobranca,
  });

  // Tenta já deixar a "próxima fatura" pronta (no-op enquanto não houver
  // pátio ativo — nesse momento do signup normalmente ainda não há).
  await garantirFaturaTrial(sb, tenant.id);

  return { ok: true, tenantId: tenant.id };
}

/**
 * Desfaz um tenant recém-criado quando o passo seguinte falha (ex.: o usuário
 * do Auth não pôde ser criado). Assinatura e faturas somem por `on delete
 * cascade` — não adianta apagá-las aqui.
 */
export async function desfazerTenant(sb: Admin, tenantId: string) {
  await sb.from("tenants").delete().eq("id", tenantId);
}
