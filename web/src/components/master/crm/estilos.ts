import { FOCO } from "@/components/master/crm/cores-estagio";

/**
 * Classes repetidas pelos formulários e painéis do CRM.
 *
 * O primário é `brand-700` chapado (design doc, "Regra de ouro"): branco sobre
 * `brand-600`/`brand-500` reprova em texto de 14 px. Por isso não é o `Botao`
 * do console, cujo gradiente é `background-image` e não cede a um `bg-*`.
 */
export const BTN_PRIMARIO = `inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-brand-700 text-white text-sm font-bold hover:brightness-110 transition-[filter] disabled:opacity-60 disabled:pointer-events-none ${FOCO}`;

export const BTN_FANTASMA = `inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-borda-campo bg-superficie text-sm font-bold text-texto-2 hover:text-brand-700 hover:border-brand-300 hover:bg-brand-50 transition-colors disabled:opacity-60 disabled:pointer-events-none ${FOCO}`;

/** Botão pequeno (36 px) dentro de blocos; alvo de 44 px no toque. */
export const BTN_PEQUENO = `toque-44 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-borda-campo bg-superficie text-xs font-bold text-texto-2 hover:text-brand-700 hover:border-brand-300 transition-colors disabled:opacity-60 disabled:pointer-events-none ${FOCO}`;

/**
 * Campo: borda `borda-campo`; foco e erro com borda de 4,5:1 (design doc).
 * 16 px abaixo de 1024 px (celular em pé e deitado): o Safari do iPhone dá
 * zoom ao focar campo com fonte menor, e com zoom a folha deixa de acompanhar
 * o teclado.
 */
export const CAMPO =
  "w-full h-11 px-3.5 rounded-xl border border-borda-campo bg-superficie text-base lg:text-sm text-texto placeholder:text-texto-3 outline-none focus:border-brand-700 focus:ring-4 focus:ring-brand-500/15 aria-[invalid=true]:border-perigo-texto disabled:bg-fundo disabled:text-texto-2";

export const AREA_TEXTO =
  "w-full min-h-24 px-3.5 py-2.5 rounded-xl border border-borda-campo bg-superficie text-base lg:text-sm text-texto leading-relaxed placeholder:text-texto-3 outline-none focus:border-brand-700 focus:ring-4 focus:ring-brand-500/15 aria-[invalid=true]:border-perigo-texto";

export const ROTULO = "block text-xs font-bold text-texto-2 mb-1.5";

/** Pílula de opção com radio nativo dentro (o radio fica `sr-only`). */
export const PILULA_RADIO =
  "toque-44 inline-flex items-center h-9 px-3.5 rounded-full border border-borda-campo bg-superficie text-xs font-bold text-texto-2 cursor-pointer select-none transition-colors hover:border-brand-300 has-[:checked]:bg-brand-700 has-[:checked]:border-brand-700 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-700";

export const SECAO_TITULO = "text-[11px] font-bold uppercase tracking-[0.06em] text-texto-2";

export const ERRO = "rounded-xl border border-perigo-borda bg-perigo-bg px-3.5 py-2.5 text-sm text-perigo-texto";
