import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/blog/inscrever — captura de e-mail do blog.
 *
 * Grava em `blog_inscritos` com o cliente ANON: a policy do db/28 libera só
 * INSERT (e ainda valida o formato do e-mail no banco). Nenhuma leitura é
 * possível com essa chave, nem aqui nem no navegador.
 *
 * E-mail repetido responde SUCESSO de propósito. Devolver "já cadastrado"
 * transformaria o formulário num verificador de e-mails para quem quisesse
 * sondar a lista.
 */
export const dynamic = "force-dynamic";

/** Validação de superfície; a regra de verdade está no CHECK da policy. */
const RE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(request: NextRequest) {
  let email = "";
  try {
    const corpo: unknown = await request.json();
    if (typeof corpo === "object" && corpo !== null && "email" in corpo) {
      const bruto = (corpo as { email: unknown }).email;
      if (typeof bruto === "string") email = bruto.trim().toLowerCase();
    }
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  if (!email || email.length > 254 || !RE_EMAIL.test(email)) {
    return NextResponse.json(
      { erro: "Informe um e-mail válido." },
      { status: 400 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json(
      { erro: "Inscrição indisponível no momento." },
      { status: 503 },
    );
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Sem `.select()`: a policy não dá SELECT, então pedir a linha de volta
  // faria o INSERT bem-sucedido retornar erro de permissão.
  const { error } = await supabase.from("blog_inscritos").insert({ email });

  if (error) {
    // 23505 = unique_violation -> já estava inscrito. É sucesso para o usuário.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, jaInscrito: true });
    }
    console.error("[blog] inscrever falhou:", error);
    return NextResponse.json(
      { erro: "Não consegui inscrever agora. Tente de novo em instantes." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
