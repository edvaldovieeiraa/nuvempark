"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarTenantComTrial, desfazerTenant } from "@/lib/criar-conta";
import { soDigitosTelefone, telefoneValido } from "@/lib/telefone";

export type ResultadoCompletar = { ok: boolean; msg: string } | null;

/**
 * Fecha o cadastro de quem entrou pelo Google.
 *
 * O Google entrega nome e e-mail, mas não o nome do negócio nem o telefone —
 * que é obrigatório no signup por formulário. Sem este passo a conta nasceria
 * sem contato, então o painel só abre depois daqui.
 *
 * Roda com a SESSÃO do usuário para saber QUEM é, e com service_role para
 * criar o tenant (o usuário ainda não tem tenant — nenhuma policy o deixaria
 * inserir nada).
 */
export async function completarCadastro(input: {
  nomeRede: string;
  nome: string;
  telefone: string;
}): Promise<ResultadoCompletar> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, msg: "Sua sessão expirou. Entre de novo." };

  // Já completou (ex.: dois envios, ou aba antiga) — não cria uma segunda rede.
  if ((user.app_metadata as { tenant_id?: string })?.tenant_id)
    return { ok: true, msg: "Cadastro já concluído." };

  const nomeRede = input.nomeRede.trim();
  const nome = input.nome.trim();
  const telefone = soDigitosTelefone(input.telefone);

  if (nomeRede.length < 2)
    return { ok: false, msg: "Informe o nome do seu negócio." };
  if (!telefoneValido(telefone))
    return { ok: false, msg: "Informe um telefone válido com DDD." };

  const admin = createAdminClient();
  const conta = await criarTenantComTrial(admin, {
    nomeRede,
    telefone,
    emailCobranca: user.email?.toLowerCase() ?? "",
  });
  if (!conta.ok)
    return { ok: false, msg: "Não foi possível criar sua conta. Tente de novo." };

  const { error: erroVinculo } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { tenant_id: conta.tenantId },
    user_metadata: { nome: nome || nomeRede, telefone },
  });
  if (erroVinculo) {
    // sem o vínculo a rede ficaria órfã e inacessível — desfaz
    await desfazerTenant(admin, conta.tenantId);
    return { ok: false, msg: "Não foi possível concluir. Tente de novo." };
  }

  // O tenant_id só passa a valer no PRÓXIMO token. Sem este refresh o
  // middleware leria a sessão antiga e mandaria direto pro /painel/bloqueado.
  await sb.auth.refreshSession();

  return { ok: true, msg: "Conta criada! Abrindo seu painel…" };
}
