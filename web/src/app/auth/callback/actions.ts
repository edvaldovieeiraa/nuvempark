"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail, emailConfigurado } from "@/lib/email";
import { emailConfirmacao } from "@/lib/email-templates";

export type ResultadoReenvio =
  | { ok: true; msg: string }
  | { ok: false; msg: string }
  | null;

// rate-limit simples por processo (evita flood de reenvio)
const ultimoEnvio = new Map<string, number>();
const INTERVALO_MS = 60 * 1000; // 1 reenvio por minuto por e-mail

/**
 * Reenvia o e-mail de confirmação para um cadastro que ainda não confirmou.
 * Só reenvia se o usuário existir E ainda estiver sem e-mail confirmado —
 * caso contrário responde de forma neutra (não revela se o e-mail existe).
 */
export async function reenviarConfirmacao(
  _prev: ResultadoReenvio,
  formData: FormData,
): Promise<ResultadoReenvio> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email.includes("@"))
    return { ok: false, msg: "Informe um e-mail válido." };

  const agora = Date.now();
  const ult = ultimoEnvio.get(email);
  if (ult && agora - ult < INTERVALO_MS) {
    return {
      ok: false,
      msg: "Acabamos de enviar um e-mail. Aguarde um minuto antes de tentar de novo.",
    };
  }

  if (!emailConfigurado())
    return {
      ok: false,
      msg: "Envio de e-mail indisponível no momento. Fale com o suporte.",
    };

  const sb = createAdminClient();

  // procura o usuário e verifica se já está confirmado
  const { data: lista } = await sb.auth.admin.listUsers();
  const user = lista?.users.find(
    (u) => u.email?.toLowerCase() === email,
  );

  // resposta neutra: não confirma nem nega existência do e-mail
  const respostaNeutra = {
    ok: true as const,
    msg: "Se houver um cadastro com esse e-mail aguardando confirmação, enviamos um novo link.",
  };

  if (!user) return respostaNeutra;
  if (user.email_confirmed_at) {
    return {
      ok: false,
      msg: "Este e-mail já está confirmado. É só entrar com sua senha.",
    };
  }

  // Gera um novo link de confirmação SEM alterar a senha já cadastrada.
  // type:"signup" no generateLink redefine a senha — por isso usamos
  // type:"magiclink" (não toca na senha) e, ao clicar, o callback confirma o
  // e-mail e cria a sessão do usuário do mesmo jeito.
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://nuvempark.com";
  const { data: linkData, error } = await sb.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${site}/auth/callback` },
  });
  const link = linkData?.properties?.action_link;
  if (error || !link)
    return { ok: false, msg: "Não foi possível gerar um novo link. Tente mais tarde." };

  const nome =
    (user.user_metadata?.nome as string | undefined) ?? email.split("@")[0];
  const { assunto, html } = emailConfirmacao({ nome, link });
  const r = await enviarEmail({ para: email, assunto, html });
  if (!r.ok)
    return { ok: false, msg: "Falha ao enviar o e-mail. Tente mais tarde." };

  ultimoEnvio.set(email, agora);
  return {
    ok: true,
    msg: "Enviamos um novo link. Verifique seu e-mail (e o spam).",
  };
}
