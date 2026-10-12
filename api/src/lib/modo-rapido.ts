/**
 * Flags do modo rápido de entrada, lidas da linha de `patios` (db/43).
 *
 * Os defaults são os mesmos das colunas: o pátio só libera o modo se o gestor
 * ligar no painel, e o modo rápido imprime o cupom até alguém desligar.
 * Ausente ou `null` cai neles. Isso NÃO torna a API tolerante a banco sem a
 * migração 43: o select do bootstrap pede as colunas e falha antes — aplicar a
 * migração ANTES de publicar a API.
 */
export type FlagsModoRapido = {
  modo_rapido_entrada: boolean;
  modo_rapido_imprime: boolean;
};

export function flagsModoRapido(patio: {
  modo_rapido_entrada?: boolean | null;
  modo_rapido_imprime?: boolean | null;
}): FlagsModoRapido {
  return {
    modo_rapido_entrada: patio.modo_rapido_entrada ?? false,
    modo_rapido_imprime: patio.modo_rapido_imprime ?? true,
  };
}
