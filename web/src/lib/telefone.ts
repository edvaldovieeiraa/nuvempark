/** Utilitários de telefone BR: só dígitos, máscara e validação (DDD + número). */

/** Remove tudo que não for dígito e limita a 11 (DDD + 9 dígitos). */
export function soDigitosTelefone(v: string): string {
  return v.replace(/\D/g, "").slice(0, 11);
}

/** Aplica a máscara (00) 0000-0000 / (00) 00000-0000 progressivamente. */
export function formatarTelefone(v: string): string {
  const d = soDigitosTelefone(v);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Valida um telefone BR: 10 dígitos (fixo) ou 11 (celular, 9 na frente).
 * DDD válido = 11..99. Aceita string com máscara.
 */
export function telefoneValido(v: string): boolean {
  const d = soDigitosTelefone(v);
  if (d.length !== 10 && d.length !== 11) return false;
  if (Number(d.slice(0, 2)) < 11) return false;
  if (d.length === 11 && d[2] !== "9") return false;
  if (/^(\d)\1{9,10}$/.test(d)) return false; // rejeita (00) 00000-0000, etc.
  return true;
}
