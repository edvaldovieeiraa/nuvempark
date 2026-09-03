import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { soDigitosTelefone, telefoneValido } from "@/lib/telefone";

/**
 * POST /api/contato — formulário de contato do site.
 *
 * Grava em `leads_site` com o cliente ANON: a policy do db/39 libera só INSERT
 * e valida o formato de cada campo. Nenhuma leitura é possível com essa chave.
 *
 * ⚠️ As defesas daqui (honeypot, rate-limit) são freio para bot burro, não
 * segurança: a anon key é pública e quem quiser fala com o PostgREST direto.
 * A regra que vale sempre é o CHECK da policy — ler o cabeçalho do db/39.
 */
export const dynamic = "force-dynamic";

const RE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Limites espelhados do CHECK da policy. Repetidos aqui só para devolver uma
// mensagem útil ao visitante em vez do erro cru do Postgres.
const NOME_MIN = 2;
const NOME_MAX = 120;
const ASSUNTO_MIN = 5;
const ASSUNTO_MAX = 2000;

// ── Rate-limit em memória por IP ────────────────────────────────────────────
// Best-effort, igual ao de /cadastro: o `web` roda como UM processo pm2, então
// um Map cobre o serviço. Zera no deploy. Não protege contra chamada direta ao
// PostgREST — para isso existe o CHECK da policy.
const LIMITE = 5; // envios por IP
const JANELA_MS = 60 * 60 * 1000; // por hora
const tentativasPorIp = new Map<string, { n: number; janela: number }>();

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

/** Impede o Map de crescer para sempre com IPs que nunca voltaram. */
function limparAntigos() {
  if (tentativasPorIp.size < 1000) return;
  const agora = Date.now();
  for (const [ip, r] of tentativasPorIp) {
    if (agora - r.janela > JANELA_MS) tentativasPorIp.delete(ip);
  }
}

function texto(corpo: Record<string, unknown>, chave: string): string {
  const v = corpo[chave];
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: NextRequest) {
  let corpo: Record<string, unknown>;
  try {
    const bruto: unknown = await request.json();
    if (typeof bruto !== "object" || bruto === null) throw new Error("corpo");
    corpo = bruto as Record<string, unknown>;
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  // Honeypot: o campo é invisível no formulário. Só bot preenche.
  // Responde 200 de propósito — dizer "recusado" ensina o bot a contornar.
  if (texto(corpo, "empresa_site") !== "") {
    return NextResponse.json({ ok: true });
  }

  // Atrás do Cloudflare + nginx, `cf-connecting-ip` é o único que o cliente não
  // forja (o Cloudflare reescreve). Mesma ordem usada em lib/master-auth.
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "desconhecido";

  limparAntigos();
  if (!permitido(ip)) {
    return NextResponse.json(
      { erro: "Muitas mensagens seguidas. Aguarde alguns minutos." },
      { status: 429 },
    );
  }

  const nome = texto(corpo, "nome");
  const email = texto(corpo, "email").toLowerCase();
  const assunto = texto(corpo, "assunto");
  const telefone = soDigitosTelefone(texto(corpo, "telefone"));
  const origem = texto(corpo, "origem").slice(0, 200) || "/";

  if (nome.length < NOME_MIN || nome.length > NOME_MAX)
    return NextResponse.json({ erro: "Informe seu nome." }, { status: 400 });
  if (!telefoneValido(telefone))
    return NextResponse.json(
      { erro: "Informe um telefone válido com DDD." },
      { status: 400 },
    );
  if (!email || email.length > 254 || !RE_EMAIL.test(email))
    return NextResponse.json({ erro: "Informe um e-mail válido." }, { status: 400 });
  if (assunto.length < ASSUNTO_MIN)
    return NextResponse.json(
      { erro: "Conte um pouco mais sobre o que você precisa." },
      { status: 400 },
    );
  if (assunto.length > ASSUNTO_MAX)
    return NextResponse.json(
      { erro: `O assunto passou de ${ASSUNTO_MAX} caracteres.` },
      { status: 400 },
    );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json(
      { erro: "Envio indisponível no momento." },
      { status: 503 },
    );
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Sem `.select()`: a policy não dá SELECT, então pedir a linha de volta faria
  // o INSERT bem-sucedido retornar erro de permissão.
  const { error } = await supabase.from("leads_site").insert({
    nome,
    telefone,
    email,
    assunto,
    origem,
    ip: ip === "desconhecido" ? null : ip.slice(0, 60),
    user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
  });

  if (error) {
    console.error("[contato] insert falhou:", error);
    return NextResponse.json(
      { erro: "Não consegui enviar agora. Tente de novo em instantes." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
