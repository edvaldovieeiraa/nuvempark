import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCMTypes,
} from 'node:crypto';

import { env } from '../env.js';

/**
 * Cifra as chaves de API dos PSPs guardadas em `tenant_gateways`.
 *
 * A chave da subconta do Asaas move dinheiro real do cliente. Guardá-la em
 * claro no banco significa que um dump — ou um SELECT indevido — entrega a
 * conta de todos os tenants. AES-256-GCM: além de cifrar, AUTENTICA (a tag
 * detecta adulteração), então um ciphertext mexido falha em vez de decifrar em
 * lixo silencioso.
 *
 * Formato: `iv:tag:ciphertext`, cada parte em base64.
 */

const ALGORITMO: CipherGCMTypes = 'aes-256-gcm';
const IV_BYTES = 12; // recomendado para GCM
const CHAVE_BYTES = 32; // AES-256

function chave(): Buffer {
  const k = Buffer.from(env.NUVEMPARK_CRYPTO_KEY, 'base64');
  if (k.length !== CHAVE_BYTES) {
    throw new Error(
      `NUVEMPARK_CRYPTO_KEY deve ter ${CHAVE_BYTES} bytes em base64 (tem ${k.length}). ` +
        'Gere com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }
  return k;
}

export function encrypt(textoClaro: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITMO, chave(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(textoClaro, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

export function decrypt(cifrado: string): string {
  const partes = cifrado.split(':');
  if (partes.length !== 3) {
    throw new Error('Formato inválido: esperado iv:tag:ciphertext em base64.');
  }
  const [ivB64, tagB64, ctB64] = partes as [string, string, string];

  const decipher = createDecipheriv(
    ALGORITMO,
    chave(),
    Buffer.from(ivB64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

  // Se o ciphertext (ou a tag) foi adulterado, `final()` LANÇA. É de propósito:
  // melhor explodir do que seguir com uma chave de PSP corrompida.
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
