/**
 * Modalidades de tarifa que o bootstrap entrega a um app.
 *
 * Cada modalidade nova só vai para o app que diz entendê-la em
 * `?modalidades=` (lista separada por vírgula). Um app que não a conhece
 * mostraria a tabela como mais um chip avulso e cobraria pelas colunas de
 * fração — valor errado. `avulso` vai sempre.
 */
const OPCIONAIS = ['hospede', 'contrato'] as const;

export function modalidadesAceitas(param: string | undefined): string[] {
  const pedidas = String(param ?? '')
    .split(',')
    .map((m) => m.trim());
  return ['avulso', ...OPCIONAIS.filter((m) => pedidas.includes(m))];
}

/**
 * Mantém só as linhas das modalidades aceitas. Linha sem `modalidade` (banco
 * sem db/42) é avulsa. Aplicada também ao resultado da nova tentativa sem
 * filtro do bootstrap: o filtro do banco sozinho vazaria no caminho de erro.
 */
export function filtrarModalidades<T extends { modalidade?: unknown }>(
  linhas: T[],
  aceitas: string[],
): T[] {
  return linhas.filter((l) =>
    aceitas.includes(typeof l.modalidade === 'string' ? l.modalidade : 'avulso'),
  );
}

/** Erro do Postgres "coluna não existe" (banco sem db/42). */
export function semColunaModalidade(error: { code?: string } | null | undefined): boolean {
  return error?.code === '42703';
}
