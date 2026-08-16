import "server-only";
import { cookies, headers } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Gate de acesso do painel master por senha mestra (MASTER_PASSWORD no .env).
 * A prova de sessão é um cookie HMAC-assinado — a senha nunca vai pro browser.
 *
 * Atrás deste gate está o cliente `service_role`, que fura a RLS de TODOS os
 * tenants, mais o faturamento, as chaves de gateway e a criação de usuários.
 * É a superfície mais privilegiada do produto e tem uma senha compartilhada só.
 * Daí as três defesas abaixo:
 *
 *   1. O token carrega VALIDADE assinada e conferida no servidor.
 *   2. A senha é comparada em tempo constante, sem vazar o comprimento.
 *   3. O login tem limite de tentativas por IP.
 */

const COOKIE = "np_master";
const VALIDADE_MS = 8 * 60 * 60 * 1000; // 8h

function segredo(): string {
  const pw = process.env.MASTER_PASSWORD;
  if (!pw) throw new Error("MASTER_PASSWORD ausente — master indisponível.");
  return pw;
}

/**
 * Token = `<expira_em_ms>.<HMAC(expira_em_ms)>`.
 *
 * A versão anterior assinava uma string FIXA ("nuvempark-master-v1"), então o
 * cookie era sempre o mesmo valor: um cookie vazado valia para sempre, o
 * "Encerrar sessão" não invalidava nada (só apagava do browser) e o `maxAge` de
 * 8h era controlado pelo cliente — um cookie salvo continuava aceito depois
 * disso. Com o prazo DENTRO do que é assinado, o servidor consegue recusar.
 */
function assinar(expiraEm: number): string {
  const mac = createHmac("sha256", segredo())
    .update(`nuvempark-master-v2|${expiraEm}`)
    .digest("hex");
  return `${expiraEm}.${mac}`;
}

/**
 * Comparação em tempo constante.
 *
 * Passa pelo SHA-256 antes do `timingSafeEqual` porque este exige buffers do
 * mesmo tamanho — checar o comprimento antes (o que o código anterior fazia)
 * transforma a função num oráculo do tamanho da senha. O digest tem sempre 32
 * bytes, então o comprimento do segredo não influencia mais o tempo.
 */
function comparaSeguro(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// ─────────────────────────────────────────────── Limite de tentativas (S2) ──

/**
 * Limitador de força bruta, em memória do processo.
 *
 * O `web` roda como UM processo pm2 (`pm2 restart nuvempark-web`, sem cluster),
 * então um Map de processo cobre o serviço inteiro. Duas consequências que são
 * aceitáveis aqui e ficam registradas: o contador zera no deploy, e se um dia o
 * pm2 virar cluster cada worker terá o seu (o limite efetivo multiplica pelo
 * número de workers). Se isso acontecer, mover para uma tabela no Postgres.
 */
const JANELA_MS = 15 * 60 * 1000; // tentativas contam por 15 min
const MAX_TENTATIVAS = 5; // na 6ª, bloqueia
const BLOQUEIO_MS = 15 * 60 * 1000; // e fica bloqueado por 15 min

type Registro = { falhas: number; primeiraEm: number; bloqueadoAte: number };
const tentativas = new Map<string, Registro>();

/** Impede o Map de crescer para sempre com IPs que nunca voltaram. */
function limpar(agora: number) {
  if (tentativas.size < 1000) return;
  for (const [ip, r] of tentativas) {
    if (agora > r.bloqueadoAte && agora - r.primeiraEm > JANELA_MS) {
      tentativas.delete(ip);
    }
  }
}

/**
 * IP do cliente. Atrás do Cloudflare + nginx, `cf-connecting-ip` é o único que
 * o cliente não consegue forjar (o Cloudflare reescreve). O `x-forwarded-for`
 * fica como plano B; pegamos o PRIMEIRO valor, que é o do cliente original.
 */
async function ipCliente(): Promise<string> {
  const h = await headers();
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "desconhecido";
}

/** Quantos segundos faltam do bloqueio, ou 0 se pode tentar. */
export async function bloqueioLogin(): Promise<number> {
  const agora = Date.now();
  const r = tentativas.get(await ipCliente());
  if (!r || agora >= r.bloqueadoAte) return 0;
  return Math.ceil((r.bloqueadoAte - agora) / 1000);
}

async function registrarFalha(): Promise<void> {
  const agora = Date.now();
  const ip = await ipCliente();
  limpar(agora);

  const r = tentativas.get(ip);
  // Sem registro, ou janela antiga expirada → recomeça a contagem.
  if (!r || agora - r.primeiraEm > JANELA_MS) {
    tentativas.set(ip, { falhas: 1, primeiraEm: agora, bloqueadoAte: 0 });
    return;
  }

  r.falhas += 1;
  if (r.falhas > MAX_TENTATIVAS) {
    r.bloqueadoAte = agora + BLOQUEIO_MS;
    r.falhas = 0;
    r.primeiraEm = agora;
    console.warn(`[master] login bloqueado por tentativas — ip ${ip}`);
  }
}

function limparTentativas(ip: string) {
  tentativas.delete(ip);
}

// ──────────────────────────────────────────────────────────────── Sessão ──

export type ResultadoLogin =
  | { ok: true }
  | { ok: false; motivo: "senha" }
  | { ok: false; motivo: "bloqueado"; segundos: number };

/**
 * Confere a senha digitada no login, aplicando o limite de tentativas.
 *
 * Substitui a antiga `senhaMestraCorreta`, que era um booleano puro e não tinha
 * como contar nada. Toda falha passa por aqui.
 */
export async function tentarLoginMaster(
  tentativa: string,
): Promise<ResultadoLogin> {
  const bloqueio = await bloqueioLogin();
  if (bloqueio > 0) return { ok: false, motivo: "bloqueado", segundos: bloqueio };

  const pw = process.env.MASTER_PASSWORD;
  if (!pw || !comparaSeguro(tentativa, pw)) {
    await registrarFalha();
    return { ok: false, motivo: "senha" };
  }

  limparTentativas(await ipCliente());
  return { ok: true };
}

/** Grava o cookie de sessão do master (chamado após senha correta). */
export async function abrirSessaoMaster() {
  const store = await cookies();
  const expiraEm = Date.now() + VALIDADE_MS;
  store.set(COOKIE, assinar(expiraEm), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/master",
    maxAge: Math.floor(VALIDADE_MS / 1000),
  });
}

export async function fecharSessaoMaster() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** True se o cookie atual é uma sessão master válida E dentro do prazo. */
export async function sessaoMasterAtiva(): Promise<boolean> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return false;

    const separador = token.indexOf(".");
    if (separador < 1) return false;

    const expiraEm = Number(token.slice(0, separador));
    if (!Number.isFinite(expiraEm)) return false;

    // Assinatura primeiro: só depois de provar que o prazo não foi adulterado
    // é que faz sentido confiar nele.
    if (!comparaSeguro(token, assinar(expiraEm))) return false;

    return Date.now() < expiraEm;
  } catch {
    return false;
  }
}
