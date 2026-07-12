/**
 * Helpers de coerção — portados do sync do E-Park. PRESERVAR a semântica exata:
 * o `compact()` (strip undefined) é o mecanismo de update parcial do sync.
 */

/** epoch-ms (number) → ISO; string ISO passa direto; senão null. */
export function toIso(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number') return new Date(v).toISOString();
  if (typeof v === 'string' && v.length > 0) return v;
  return undefined;
}

export function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** string vazia → null; senão a própria string. */
export function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v);
  return s.length > 0 ? s : undefined;
}

/** Remove chaves undefined — permite update parcial sem nulificar colunas existentes. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(obj)) {
    if (val !== undefined) out[k] = val;
  }
  return out as Partial<T>;
}
