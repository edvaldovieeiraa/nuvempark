import "server-only";
import {
  createCipheriv,
  randomBytes,
  type CipherGCMTypes,
} from "node:crypto";

/**
 * Cifra a chave de API de PSP antes de gravar em `tenant_gateways`.
 *
 * ⚠️ TEM de ser byte-a-byte compatível com `api/src/pagamentos/crypto.ts`: é a
 * API que DECIFRA (mesmo algoritmo, mesmo formato `iv:tag:ciphertext` em base64,
 * mesma `NUVEMPARK_CRYPTO_KEY`). Se divergirem, a API não abre a chave e o Pix
 * do tenant volta a falhar — exatamente o incidente que esta tela evita.
 *
 * Só cifra (a tela só grava). A decifra vive na API, perto de quem usa a chave.
 */

const ALGORITMO: CipherGCMTypes = "aes-256-gcm";
const IV_BYTES = 12; // recomendado para GCM
const CHAVE_BYTES = 32; // AES-256

function chave(): Buffer {
  const bruta = process.env.NUVEMPARK_CRYPTO_KEY;
  if (!bruta) {
    throw new Error(
      "NUVEMPARK_CRYPTO_KEY ausente no ambiente do painel — não é possível " +
        "cifrar a chave do gateway. Use o MESMO valor da API.",
    );
  }
  const k = Buffer.from(bruta, "base64");
  if (k.length !== CHAVE_BYTES) {
    throw new Error(
      `NUVEMPARK_CRYPTO_KEY deve ter ${CHAVE_BYTES} bytes em base64 (tem ${k.length}).`,
    );
  }
  return k;
}

/** Devolve `iv:tag:ciphertext`, cada parte em base64 — o que a API decifra. */
export function cifrarChaveGateway(textoClaro: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITMO, chave(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(textoClaro, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/** A `NUVEMPARK_CRYPTO_KEY` está presente e no formato certo? (para o gate da UI) */
export function cryptoGatewayPronto(): boolean {
  try {
    chave();
    return true;
  } catch {
    return false;
  }
}
