/** Utilitários de CNPJ: só dígitos, máscara e validação de dígitos verificadores. */

/** Remove tudo que não for dígito. */
export function soDigitos(v: string): string {
  return v.replace(/\D/g, "");
}

/** Aplica a máscara 00.000.000/0000-00 progressivamente. */
export function formatarCnpj(v: string): string {
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Valida um CNPJ (14 dígitos + dígitos verificadores). Aceita string com máscara. */
export function cnpjValido(v: string): boolean {
  const c = soDigitos(v);
  if (c.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(c)) return false; // rejeita 00000000000000, etc.

  const dv = (base: string, pesoInicial: number): number => {
    let soma = 0;
    let peso = pesoInicial;
    for (const ch of base) {
      soma += Number(ch) * peso;
      peso = peso === 2 ? 9 : peso - 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = dv(c.slice(0, 12), 5);
  const d2 = dv(c.slice(0, 13), 6);
  return d1 === Number(c[12]) && d2 === Number(c[13]);
}
