"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail, emailConfigurado } from "@/lib/email";
import { emailConfirmacao } from "@/lib/email-templates";
import { criarTenantComTrial, desfazerTenant } from "@/lib/criar-conta";
import { soDigitosTelefone, telefoneValido } from "@/lib/telefone";

export type ResultadoCadastro =
  | { ok: true; email: string }
  | { ok: false; msg: string }
  | null;

// Rate-limit simples em memória por IP (best-effort; reinicia com o processo).
const tentativasPorIp = new Map<string, { n: number; janela: number }>();
const LIMITE = 5; // cadastros por IP
const JANELA_MS = 60 * 60 * 1000; // 1h

function permitido(ip: string): boolean {
  const agora = Date.now();
  const reg = tentativasPorIp.get(ip);
  if (!reg || agora - reg.janela > JANELA_MS) {
    tentativasPorIp.set(ip, { n: 1, janela: agora });
    return true;
  }
  if (reg.n >= LIMITE) return false;
  reg.n++;
  return true;
}

/**
 * Cadastro público (self-signup) com trial de 15 dias.
 * Cria tenant (código gerado) + gestor (Supabase Auth, e-mail NÃO confirmado)
 * + assinatura em 'trial'. O gestor precisa confirmar o e-mail antes de logar;
 * ao confirmar, o painel já está liberado até o trial expirar.
 */
export async function criarContaTrial(
  _prev: ResultadoCadastro,
  formData: FormData,
): Promise<ResultadoCadastro> {
  // honeypot: bots preenchem; humanos não veem o campo
  if (String(formData.get("empresa_site") || "").trim() !== "") {
    return { ok: false, msg: "Cadastro inválido." };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "desconhecido";
  if (!permitido(ip)) {
    return {
      ok: false,
      msg: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
    };
  }

  const nomeRede = String(formData.get("nome_rede") || "").trim();
  const nomeResp = String(formData.get("nome") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const senha = String(formData.get("senha") || "");
  const telefone = soDigitosTelefone(String(formData.get("telefone") || ""));

  if (nomeRede.length < 2) return { ok: false, msg: "Informe o nome do seu negócio." };
  if (!telefoneValido(telefone))
    return { ok: false, msg: "Informe um telefone válido com DDD." };
  if (!email.includes("@")) return { ok: false, msg: "Informe um e-mail válido." };
  if (senha.length < 6)
    return { ok: false, msg: "A senha precisa de ao menos 6 caracteres." };

  const sb = createAdminClient();

  // 1) tenant + assinatura em trial (mesma rotina usada pelo login com Google)
  const conta = await criarTenantComTrial(sb, {
    nomeRede,
    telefone,
    emailCobranca: email,
  });
  if (!conta.ok)
    return { ok: false, msg: "Não foi possível criar sua conta. Tente de novo." };

  // 2) gestor no Supabase Auth — e-mail NÃO confirmado (exige verificação)
  const { error: erroUser } = await sb.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: false,
    user_metadata: { nome: nomeResp || nomeRede, telefone },
    app_metadata: { tenant_id: conta.tenantId },
  });
  if (erroUser) {
    // rollback do tenant para não deixar órfão (assinatura sai por cascade)
    await desfazerTenant(sb, conta.tenantId);
    return {
      ok: false,
      msg: erroUser.message.includes("already")
        ? "Já existe uma conta com esse e-mail. Tente entrar."
        : "Não foi possível criar sua conta. Tente de novo.",
    };
  }

  // 3) e-mail de confirmação. Geramos o link no Supabase e o enviamos por
  //    Resend (não depende do SMTP do Supabase estar configurado).
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://nuvempark.com";
  const { data: linkData } = await sb.auth.admin.generateLink({
    type: "signup",
    email,
    password: senha,
    options: { redirectTo: `${site}/auth/callback` },
  });
  const linkConfirmacao = linkData?.properties?.action_link;

  if (linkConfirmacao && emailConfigurado()) {
    const { assunto, html } = emailConfirmacao({
      nome: nomeResp || nomeRede,
      link: linkConfirmacao,
    });
    await enviarEmail({ para: email, assunto, html });
  }

  return { ok: true, email };
}
