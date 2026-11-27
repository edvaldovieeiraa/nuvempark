/**
 * O erro do Supabase é "coluna não existe" (banco sem a migração)?
 *
 * Os retornos "tentar de novo sem a coluna nova" só podem disparar NESTE caso.
 * Um erro passageiro (timeout, 5xx, conexão) que caísse no retorno faria a
 * página do QR calcular sem as regras de horário — um valor diferente do que
 * o app cobra na saída.
 */
export function colunaAusente(
  erro: { code?: string; message?: string } | null | undefined,
  coluna: string,
): boolean {
  if (!erro) return false;
  // 42703 = undefined_column (Postgres); PGRST204 = coluna fora do cache do PostgREST.
  if (erro.code !== '42703' && erro.code !== 'PGRST204') return false;
  return (erro.message ?? '').includes(coluna);
}
