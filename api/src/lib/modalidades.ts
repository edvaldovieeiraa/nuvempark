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
