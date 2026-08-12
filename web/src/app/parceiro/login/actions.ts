"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Resultado = { ok: false; msg: string } | null;

export async function entrarParceiro(
  _prev: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) return { ok: false, msg: "Informe e-mail e senha." };

  const sb = await createClient();
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password: senha,
  });

  // Mensagem única para credencial errada, e-mail inexistente e conta de outro
  // tipo: distinguir os casos diria a um estranho quais e-mails existem.
  if (error || !data.user) {
    return { ok: false, msg: "E-mail ou senha incorretos." };
  }

  // Conta que não é de parceiro (um gestor, por exemplo) não fica logada aqui.
  // O middleware já a mandaria para /painel, mas encerrar a sessão deixa o
  // estado limpo e evita a ida e volta.
  const ehParceiro = !!(data.user.app_metadata as { parceiro_id?: string })
    ?.parceiro_id;
  if (!ehParceiro) {
    await sb.auth.signOut();
    return {
      ok: false,
      msg: "Esta conta não é de parceiro. Use o acesso do painel.",
    };
  }

  redirect("/parceiro");
}

export async function sairParceiro(): Promise<void> {
  const sb = await createClient();
  await sb.auth.signOut();
  redirect("/parceiro/login");
}
