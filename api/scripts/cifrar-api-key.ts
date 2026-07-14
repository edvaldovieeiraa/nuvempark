/**
 * Cifra uma chave de API de PSP para colar no SQL de `tenant_gateways`.
 *
 *   npx tsx scripts/cifrar-api-key.ts '$aact_hmlg_000...'
 *
 * Lê NUVEMPARK_CRYPTO_KEY do .env. A chave em claro NÃO é impressa nem logada —
 * só o valor cifrado, que é o que vai para o banco.
 */
import { encrypt } from '../src/pagamentos/crypto.js';

const chave = process.argv[2];

if (!chave) {
  console.error('Uso: npx tsx scripts/cifrar-api-key.ts <api_key_do_psp>');
  process.exit(1);
}

const cifrada = encrypt(chave);

console.log('\nValor cifrado (cole em tenant_gateways.api_key_encrypted):\n');
console.log(cifrada);
console.log(`
Exemplo de INSERT (troque tenant_id, subconta e split):

  insert into public.tenant_gateways
    (tenant_id, gateway, subconta_id, api_key_encrypted, split_percentual, ativo)
  values
    ('<TENANT_UUID>', 'asaas', '<WALLET_ID_DA_SUBCONTA>', '${cifrada}', 5.00, true)
  on conflict (tenant_id, gateway) do update
    set api_key_encrypted = excluded.api_key_encrypted,
        subconta_id       = excluded.subconta_id,
        split_percentual  = excluded.split_percentual,
        ativo             = excluded.ativo;
`);
