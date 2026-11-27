import { ROTULO_ESTAGIO } from "@/lib/crm/rotulos";
import { ESTAGIOS, type Estagio } from "@/lib/crm/tipos";

/**
 * O que o menu de estágio mostra (design doc, tela 4, com o movimento livre de
 * `regras.ts`): os cinco estágios na ordem do funil, o atual marcado. Perdido
 * abre o diálogo do motivo. "Excluir…" vale para qualquer lead (db/56: excluir
 * guarda o histórico), então não depende do lead.
 */

export type DestinoMenu = Estagio;

export type ItemMenuEstagio =
  | { tipo: "atual"; estagio: Estagio; rotulo: string }
  | { tipo: "mover"; destino: DestinoMenu; rotulo: string };

export type MenuEstagioModelo = {
  itens: ItemMenuEstagio[];
  /** Nota fora do menu, ligada aos itens por `aria-describedby`. */
  explicacao: string;
};

export const EXPLICACAO_AUTOMATICOS =
  "Trial e Ganho também mudam sozinhos: conta criada vira Trial; assinatura ativada vira Ganho.";

export function itensMenuEstagio(lead: { status: Estagio }): MenuEstagioModelo {
  return {
    explicacao: EXPLICACAO_AUTOMATICOS,
    itens: ESTAGIOS.map((e) =>
      e === lead.status
        ? { tipo: "atual" as const, estagio: e, rotulo: ROTULO_ESTAGIO[e] }
        : { tipo: "mover" as const, destino: e, rotulo: e === "perdido" ? "Perdido…" : ROTULO_ESTAGIO[e] },
    ),
  };
}

/** Próximo item focado para a tecla; null se a tecla não navega. Gira nas pontas. */
export function indiceAoTeclar(atual: number, tecla: string, total: number): number | null {
  if (total <= 0) return null;
  switch (tecla) {
    case "ArrowDown":
      return atual < 0 ? 0 : (atual + 1) % total;
    case "ArrowUp":
      return atual < 0 ? total - 1 : (atual - 1 + total) % total;
    case "Home":
      return 0;
    case "End":
      return total - 1;
    default:
      return null;
  }
}
