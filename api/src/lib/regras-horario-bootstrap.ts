/**
 * Quais tabelas vão para o app no bootstrap (spec regras-horario-tarifa,
 * req. 11–12 e Revisão 12).
 *
 * O app declara em `?modalidades=` a versão das regras que entende
 * (`regras_horario_v1`). Um app que não declara nada é anterior às regras: se
 * recebesse a tabela, cobraria pelo preço base e ignoraria os horários. Por
 * isso ele não recebe tabela com regras. Um app que declara v1 não recebe
 * tabela com regra de `requer` maior.
 *
 * Tabela sem regras (ou banco sem a coluna) vai para todo mundo, como hoje.
 */
import { regrasDoJson } from './tarifa-trechos.js';

const TOKEN = /^regras_horario_v(\d+)$/;

/** Maior versão de regras declarada em `modalidades` (0 = nenhuma). */
export function versaoRegrasDeclarada(modalidades: string): number {
  let versao = 0;
  for (const parte of modalidades.split(',')) {
    const m = TOKEN.exec(parte.trim());
    if (m) versao = Math.max(versao, Number(m[1]));
  }
  return versao;
}

/** A tabela pode ir para um app que entende regras até `versao`. */
export function tarifaVaiParaApp(
  tarifa: { regras_horario?: unknown },
  versao: number,
): boolean {
  const bruto = tarifa.regras_horario;
  if (versao <= 0) {
    // App antigo: qualquer item na lista tira a tabela, mesmo malformado —
    // na dúvida, não cobrar pelo preço base algo que tem horário.
    return !temItens(bruto);
  }
  return regrasDoJson(bruto).every((r) => r.requer <= versao);
}

function temItens(bruto: unknown): boolean {
  if (Array.isArray(bruto)) return bruto.length > 0;
  if (typeof bruto === 'string') {
    try {
      const v: unknown = JSON.parse(bruto);
      return Array.isArray(v) && v.length > 0;
    } catch {
      return false;
    }
  }
  return false;
}
