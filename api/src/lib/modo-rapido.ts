/**
 * Flags do modo rápido de entrada, lidas da linha de `patios` (db/43).
 *
 * Os defaults são os mesmos das colunas: o pátio só libera o modo se o gestor
 * ligar no painel, e o modo rápido imprime o cupom até alguém desligar. Ausente
 * ou `null` (API rodando contra banco sem a migração) cai neles — o app então
 * não oferece o modo.
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
