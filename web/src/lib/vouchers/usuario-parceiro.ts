import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Criação de usuário de parceiro — o ÚNICO ponto fora de `/master` que toca o
 * `service_role`.
 *
 * Precisa dele porque criar conta no Supabase Auth exige a API de admin: não
 * existe caminho pelo cliente do gestor. E o `service_role` fura o RLS, ou
 * seja, com o id de parceiro errado este código criaria acesso ao pátio de
 * outro cliente.
 *
 * A contenção é a ordem das operações, e ela não pode ser trocada:
 *
 *   1. Confere o parceiro pelo cliente DO GESTOR (RLS ligada). Se o parceiro
 *      for de outro tenant, a consulta simplesmente não o encontra.
 *   2. Só então usa o admin, e apenas para `auth.admin.*`.
 *   3. Grava `usuarios_parceiro` de novo pelo cliente do gestor, com o
 *      `tenant_id` que veio do passo 1 — nunca de um argumento.
 *
 * Inverter 1 e 2 transformaria isto num furo de multi-tenant.
 */

export type ResultadoCriacao =
  | { ok: true; usuarioId: string }
  | { ok: false; msg: string };

export async function criarUsuarioParceiro(input: {
  parceiroId: string;
  email: string;
  nome: string;
  senha: string;
}): Promise<ResultadoCriacao> {
  const sb = await createClient();

  // ── 1. O parceiro é mesmo deste gestor? ───────────────────────────────────
  // Consulta pela sessão do gestor: a RLS de db/32 já escopa por tenant, então
  // um id de outro cliente volta vazio aqui e o fluxo morre antes do admin.
  const { data: parceiro } = await sb
    .from("parceiros")
    .select("id, tenant_id, nome")
    .eq("id", input.parceiroId)
    .maybeSingle();

  if (!parceiro) return { ok: false, msg: "Parceiro não encontrado." };

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, msg: "E-mail inválido." };
  if (input.senha.length < 8) {
    return { ok: false, msg: "A senha precisa ter ao menos 8 caracteres." };
  }

  // ── 2. Cria a conta ───────────────────────────────────────────────────────
  const admin = createAdminClient();
  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: input.senha,
    // Confirmado de saída: quem entrega a senha é o gestor, em mãos. Sem isto o
    // lojista receberia um e-mail de confirmação que ele não está esperando e
    // não conseguiria entrar até clicar.
    email_confirm: true,
    app_metadata: { parceiro_id: parceiro.id },
  });

  if (erroAuth || !criado?.user) {
    const jaExiste =
      erroAuth?.message?.toLowerCase().includes("already") ?? false;
    return {
      ok: false,
      msg: jaExiste
        ? "Este e-mail já tem conta no sistema. Use outro."
        : "Não foi possível criar o acesso.",
    };
  }

  // ── 3. Vincula ────────────────────────────────────────────────────────────
  const { data: usuario, error: erroVinculo } = await sb
    .from("usuarios_parceiro")
    .insert({
      parceiro_id: parceiro.id,
      tenant_id: parceiro.tenant_id,
      auth_user_id: criado.user.id,
      email,
      nome: input.nome.trim() || email,
    })
    .select("id")
    .single();

  if (erroVinculo || !usuario) {
    // Sem isto sobraria uma conta órfã no Auth: ela existiria, conseguiria
    // fazer login, e `current_parceiro_id()` devolveria null — um usuário
    // logado que não é nada, e que o gestor não vê em lugar nenhum para
    // remover. Desfazer aqui é mais barato que descobrir depois.
    await admin.auth.admin.deleteUser(criado.user.id);
    return { ok: false, msg: "Não foi possível vincular o acesso ao parceiro." };
  }

  return { ok: true, usuarioId: usuario.id };
}

/**
 * Remove o acesso: desativa o vínculo E apaga a conta do Auth.
 *
 * Só desativar o vínculo já bastaria para bloquear (as funções de db/33 e
 * db/34 exigem `usuarios_parceiro.ativo`), mas deixaria uma credencial válida
 * circulando no WhatsApp de alguém. Como a conta não serve para mais nada no
 * produto, apagar é o certo.
 */
export async function removerUsuarioParceiro(
  usuarioId: string,
): Promise<{ ok: boolean; msg: string }> {
  const sb = await createClient();

  // De novo pelo cliente do gestor: a RLS garante que o usuário é de um
  // parceiro do tenant dele.
  const { data: usuario } = await sb
    .from("usuarios_parceiro")
    .select("id, auth_user_id")
    .eq("id", usuarioId)
    .maybeSingle();

  if (!usuario) return { ok: false, msg: "Acesso não encontrado." };

  const { error } = await sb
    .from("usuarios_parceiro")
    .delete()
    .eq("id", usuarioId);
  if (error) return { ok: false, msg: "Não foi possível remover o acesso." };

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(usuario.auth_user_id);

  return { ok: true, msg: "Acesso removido." };
}
