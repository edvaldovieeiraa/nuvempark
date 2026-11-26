import { destinosPossiveis, motivoSemDestino, podeExcluirComoSpam } from "@/lib/crm/regras";
import { ROTULO_ESTAGIO } from "@/lib/crm/rotulos";
import type { Estagio, EstadoAssinatura, Fonte } from "@/lib/crm/tipos";

/**
 * O que o menu de estágio mostra (design doc, tela 4). A regra é a de
 * `regras.ts`; aqui só se decide a forma do menu para cada caso.
 */

export type DestinoMenu = "novo" | "em_contato" | "perdido";

export type ItemMenuEstagio =
  | { tipo: "atual"; estagio: Estagio; rotulo: string }
  | { tipo: "mover"; destino: DestinoMenu; rotulo: string }
  | { tipo: "reabrir"; rotulo: string };

export type MenuEstagioModelo = {
  itens: ItemMenuEstagio[];
  /** Texto fora do menu, ligado ao item por `aria-describedby` (caso Trial). */
  explicacao: string | null;
  /** Sem destino manual: o aviso com cadeado. */
  bloqueio: string | null;
  podeExcluir: boolean;
};

export const EXPLICACAO_TRIAL =
  "Trial é automático: o card chega aqui quando a conta é criada. À mão, só vai para Perdido.";

const ORDEM: readonly DestinoMenu[] = ["novo", "em_contato", "perdido"];

function rotuloDestino(d: DestinoMenu): string {
  return d === "perdido" ? "Perdido…" : ROTULO_ESTAGIO[d];
}

export function itensMenuEstagio(lead: {
  status: Estagio;
  tenantId: string | null;
  assinaturaEstado: EstadoAssinatura | null;
  fonte: Fonte;
  temInteracaoHumana: boolean;
}): MenuEstagioModelo {
  const destinos = destinosPossiveis(lead);
  const podeExcluir = podeExcluirComoSpam(lead);
  const base = { explicacao: null, bloqueio: null, podeExcluir };

  if (destinos.length === 0) return { ...base, itens: [], bloqueio: motivoSemDestino(lead) };

  if (lead.status === "trial")
    return {
      ...base,
      explicacao: EXPLICACAO_TRIAL,
      itens: [{ tipo: "mover", destino: "perdido", rotulo: "Perdido… (desistiu no teste)" }],
    };

  if (destinos.includes("trial"))
    return { ...base, itens: [{ tipo: "reabrir", rotulo: "Reabrir (volta para Trial)" }] };

  const itens: ItemMenuEstagio[] = [];
  for (const e of ORDEM) {
    if (e === lead.status) itens.push({ tipo: "atual", estagio: e, rotulo: ROTULO_ESTAGIO[e] });
    else if (destinos.includes(e)) itens.push({ tipo: "mover", destino: e, rotulo: rotuloDestino(e) });
  }
  return { ...base, itens };
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
