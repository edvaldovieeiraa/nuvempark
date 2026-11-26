/**
 * Normalização dos contatos do CRM. É a mesma regra que o banco usa para casar
 * leads (`fn_crm_casar`, db/47): e-mail sem caixa e sem espaços, telefone só
 * com dígitos. Diferente de `soDigitosTelefone`, aqui nada é truncado: um
 * número com 12 dígitos é erro, não um número cortado.
 */

const RE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizarEmail(v: string | null | undefined): string | null {
  const e = (v ?? "").trim().toLowerCase();
  return e === "" ? null : e;
}

export function normalizarTelefone(v: string | null | undefined): string | null {
  const d = (v ?? "").replace(/\D/g, "");
  return d === "" ? null : d;
}

export type ContatoNormalizado =
  | { ok: true; email: string | null; telefone: string | null }
  | { ok: false; msg: string };

/** Exige pelo menos um contato (req. 18) e valida o formato de cada um. */
export function normalizarContato(entrada: {
  email: string | null | undefined;
  telefone: string | null | undefined;
}): ContatoNormalizado {
  const email = normalizarEmail(entrada.email);
  const telefone = normalizarTelefone(entrada.telefone);

  if (!email && !telefone)
    return { ok: false, msg: "Informe pelo menos um contato: telefone ou e-mail." };
  if (email && (email.length > 254 || !RE_EMAIL.test(email)))
    return { ok: false, msg: "Informe um e-mail válido." };
  if (telefone && telefone.length !== 10 && telefone.length !== 11)
    return { ok: false, msg: "Informe o telefone com DDD (10 ou 11 dígitos)." };

  return { ok: true, email, telefone };
}

export function temContato(lead: { email: string | null; telefone: string | null }): boolean {
  return !!normalizarEmail(lead.email) || !!normalizarTelefone(lead.telefone);
}

/** Celular (11 dígitos) tem WhatsApp; fixo (10) não. */
export function temWhatsApp(telefone: string | null | undefined): boolean {
  return normalizarTelefone(telefone)?.length === 11;
}
