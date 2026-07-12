import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Gate de acesso do painel master por senha mestra (MASTER_PASSWORD no .env).
 * A prova de sessão é um cookie HMAC-assinado — a senha nunca vai pro browser.
 */

const COOKIE = "np_master";

function segredo(): string {
  const pw = process.env.MASTER_PASSWORD;
  if (!pw) throw new Error("MASTER_PASSWORD ausente — master indisponível.");
  return pw;
}

/** Token = HMAC(senha) — determinístico, validável sem estado no servidor. */
function assinar(): string {
  return createHmac("sha256", segredo()).update("nuvempark-master-v1").digest("hex");
}

function comparaSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Confere a senha digitada no login. */
export function senhaMestraCorreta(tentativa: string): boolean {
  const pw = process.env.MASTER_PASSWORD;
  if (!pw) return false;
  return comparaSeguro(tentativa, pw);
}

/** Grava o cookie de sessão do master (chamado após senha correta). */
export async function abrirSessaoMaster() {
  const store = await cookies();
  store.set(COOKIE, assinar(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/master",
    maxAge: 60 * 60 * 8, // 8h
  });
}

export async function fecharSessaoMaster() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** True se o cookie atual é uma sessão master válida. */
export async function sessaoMasterAtiva(): Promise<boolean> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return false;
    return comparaSeguro(token, assinar());
  } catch {
    return false;
  }
}
