import type { Estagio } from "@/lib/crm/tipos";

/**
 * Classes de cor por estágio (tokens `estagio-*` do globals.css). Escritas
 * inteiras de propósito: o Tailwind só gera a classe que aparece literal no
 * código, então `bg-estagio-${e}-ponto` não funcionaria. `em_contato` usa o
 * token `contato`.
 */
export const COR_ESTAGIO: Record<Estagio, { ponto: string; texto: string; fundo: string }> = {
  novo: {
    ponto: "bg-estagio-novo-ponto",
    texto: "text-estagio-novo-texto",
    fundo: "bg-estagio-novo-fundo",
  },
  em_contato: {
    ponto: "bg-estagio-contato-ponto",
    texto: "text-estagio-contato-texto",
    fundo: "bg-estagio-contato-fundo",
  },
  trial: {
    ponto: "bg-estagio-trial-ponto",
    texto: "text-estagio-trial-texto",
    fundo: "bg-estagio-trial-fundo",
  },
  ganho: {
    ponto: "bg-estagio-ganho-ponto",
    texto: "text-estagio-ganho-texto",
    fundo: "bg-estagio-ganho-fundo",
  },
  perdido: {
    ponto: "bg-estagio-perdido-ponto",
    texto: "text-estagio-perdido-texto",
    fundo: "bg-estagio-perdido-fundo",
  },
};

/** Ganho e Perdido mostram só os últimos 30 dias no kanban e na faixa (req. 22). */
export const ESTAGIOS_COM_JANELA: readonly Estagio[] = ["ganho", "perdido"];

/** Anel de foco do console no CRM. */
export const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700";
