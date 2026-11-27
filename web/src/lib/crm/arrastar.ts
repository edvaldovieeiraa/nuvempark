import { ESTAGIOS, type Estagio } from "@/lib/crm/tipos";

/**
 * Arrastar card entre colunas do kanban (spec, req. 1–9). Só a decisão mora
 * aqui; o movimento em si é o mesmo do menu ⋮ (`moverEstagio`), e Perdido
 * abre o mesmo diálogo do motivo.
 */

export type Soltura =
  | { tipo: "nada" }
  | { tipo: "pedirMotivo" }
  | { tipo: "mover"; destino: Exclude<Estagio, "perdido"> };

const PREFIXO = "coluna:";

/** Id da área de soltar de uma coluna (o `id` do `useDroppable`). */
export function idColuna(e: Estagio): string {
  return PREFIXO + e;
}

export function estagioDaColuna(id: string | number | null | undefined): Estagio | null {
  if (typeof id !== "string" || !id.startsWith(PREFIXO)) return null;
  const e = id.slice(PREFIXO.length);
  return (ESTAGIOS as readonly string[]).includes(e) ? (e as Estagio) : null;
}

export function decidirSoltura(
  lead: { status: Estagio },
  destino: Estagio | string | null,
  movendo = false,
): Soltura {
  if (movendo || !destino) return { tipo: "nada" };
  if (!(ESTAGIOS as readonly string[]).includes(destino)) return { tipo: "nada" };
  const d = destino as Estagio;
  if (d === lead.status) return { tipo: "nada" };
  if (d === "perdido") return { tipo: "pedirMotivo" };
  return { tipo: "mover", destino: d };
}

/** Com menos de 2 colunas na tela (estágio escolhido na faixa), não há destino. */
export function arrastoLigado(colunasVisiveis: number): boolean {
  return colunasVisiveis >= 2;
}
