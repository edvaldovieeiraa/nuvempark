"use client";

import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Folha (drawer) acessível: lateral direita a partir de 640 px, tela cheia
 * abaixo. Num portal no `<body>`, acima do header do AppShell (z-30) e da
 * navegação (z-40/50) e abaixo do `Confirmar` (z-90) e dos toasts (z-100).
 *
 * - foco preso: Tab e Shift+Tab giram dentro da folha;
 * - o resto da página fica `inert` enquanto ela está aberta;
 * - Esc fecha; o foco volta ao gatilho (`focoAoFechar` ou, sem ele, o que
 *   estava focado ao abrir);
 * - folhas aninhadas (o menu de estágio sobre o lead no celular) funcionam:
 *   cada uma desfaz só o `inert` que ela mesma pôs.
 *
 * Tudo o que for interativo enquanto a folha está aberta precisa ser
 * renderizado dentro dela: o resto da página não recebe clique nem foco.
 * Isso inclui o container dos toasts, que é filho direto do `<body>`: o toast
 * aparece, mas o "Fechar aviso" fica inerte até a folha fechar.
 */

type Props = {
  aberta: boolean;
  onFechar: () => void;
  /** Título visível; é também o nome acessível do diálogo. */
  titulo: string;
  /** Conteúdo extra no cabeçalho, abaixo do título (ex.: estágio, alerta). */
  cabecalho?: ReactNode;
  children: ReactNode;
  /** Barra fixa no pé (ações). Recebe o `safe-area-inset-bottom`. */
  rodape?: ReactNode;
  /** Largura em px a partir de 640 px. Padrão 540. */
  largura?: number;
  /** Para onde o foco volta ao fechar. Sem ele, o elemento focado ao abrir. */
  focoAoFechar?: HTMLElement | null;
  /** Elemento que recebe o foco ao abrir. Sem ele, o painel inteiro. */
  focoInicial?: React.RefObject<HTMLElement | null>;
};

const FOCAVEIS =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
  'select:not([disabled]), textarea:not([disabled]), iframe, audio[controls], video[controls], ' +
  '[contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])';

const semInscricao = () => () => {};

/** false no servidor e na hidratação; true depois. Sem setState em efeito. */
function useNoNavegador(): boolean {
  return useSyncExternalStore(
    semInscricao,
    () => true,
    () => false,
  );
}

// Trava de rolagem contada: com folhas empilhadas, só a última a fechar
// devolve o overflow original (duas fechando no mesmo commit não prendem).
let folhasAbertas = 0;
let overflowOriginal = "";

function focaveis(raiz: HTMLElement): HTMLElement[] {
  return Array.from(raiz.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
    (el) => !el.closest("[inert]") && el.getClientRects().length > 0,
  );
}

export function Folha({
  aberta,
  onFechar,
  titulo,
  cabecalho,
  children,
  rodape,
  largura = 540,
  focoAoFechar,
  focoInicial,
}: Props) {
  const idTitulo = useId();
  const noNavegador = useNoNavegador();
  const raizRef = useRef<HTMLDivElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  // Lidos no efeito sem entrar nas dependências: trocar o gatilho ou o alvo
  // inicial com a folha aberta não deve reabrir nem refocar nada.
  const focoAoFecharRef = useRef(focoAoFechar);
  const focoInicialRef = useRef(focoInicial);
  const onFecharRef = useRef(onFechar);
  useEffect(() => {
    focoAoFecharRef.current = focoAoFechar;
    focoInicialRef.current = focoInicial;
    onFecharRef.current = onFechar;
  });

  const visivel = aberta && noNavegador;

  useEffect(() => {
    if (!visivel) return;
    const raiz = raizRef.current;
    if (!raiz) return;

    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // `inert` em todos os irmãos do portal; guarda só os que mudamos.
    const mudados: HTMLElement[] = [];
    for (const el of Array.from(document.body.children)) {
      if (el === raiz || !(el instanceof HTMLElement) || el.inert) continue;
      el.inert = true;
      mudados.push(el);
    }

    if (folhasAbertas === 0) overflowOriginal = document.body.style.overflow;
    folhasAbertas += 1;
    document.body.style.overflow = "hidden";

    (focoInicialRef.current?.current ?? painelRef.current)?.focus({ preventScroll: true });

    // Esc com o foco fora do diálogo: um botão que ficou desabilitado durante
    // o envio (ou sumiu) joga o foco no <body>, e o onKeyDown do portal não
    // ouve mais nada. A folha de cima é a única cuja raiz não está inert.
    function escFora(e: globalThis.KeyboardEvent) {
      if (e.key !== "Escape" || e.defaultPrevented || !raiz || raiz.inert) return;
      if (raiz.contains(document.activeElement)) return;
      e.preventDefault();
      onFecharRef.current();
    }
    document.addEventListener("keydown", escFora);

    return () => {
      document.removeEventListener("keydown", escFora);
      for (const el of mudados) el.inert = false;
      folhasAbertas -= 1;
      if (folhasAbertas === 0) document.body.style.overflow = overflowOriginal;
      const alvo = focoAoFecharRef.current ?? anterior;
      if (alvo?.isConnected) alvo.focus({ preventScroll: true });
    };
  }, [visivel]);

  if (!visivel) return null;

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      // Um menu dentro da folha que trata o próprio Esc chama preventDefault.
      // stopPropagation: eventos de portal sobem pela árvore do React, e uma
      // folha aninhada não pode fechar a de baixo junto.
      e.stopPropagation();
      if (!e.defaultPrevented) {
        e.preventDefault();
        onFechar();
      }
      return;
    }
    if (e.key !== "Tab") return;
    const painel = painelRef.current;
    if (!painel) return;
    e.stopPropagation();
    const lista = focaveis(painel);
    if (lista.length === 0) {
      e.preventDefault();
      painel.focus();
      return;
    }
    const primeiro = lista[0];
    const ultimo = lista[lista.length - 1];
    const ativo = document.activeElement;
    if (e.shiftKey && (ativo === primeiro || ativo === painel)) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && ativo === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  }

  return createPortal(
    <div ref={raizRef} className="fixed inset-0 z-[80]" onKeyDown={aoTeclar}>
      <div
        aria-hidden
        onClick={onFechar}
        className="absolute inset-0 bg-noite/50 backdrop-blur-sm folha-fundo"
      />
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        style={{ "--folha-largura": `${largura}px` } as CSSProperties}
        className="folha-painel absolute inset-0 sm:left-auto w-full sm:w-[min(var(--folha-largura),100vw)] h-dvh flex flex-col bg-superficie shadow-[var(--shadow-pop)] outline-none pl-[env(safe-area-inset-left)] sm:pl-0 pr-[env(safe-area-inset-right)]"
      >
        <header className="shrink-0 flex items-start gap-3 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-borda">
          <div className="flex-1 min-w-0">
            <h2 id={idTitulo} className="text-lg font-extrabold leading-snug break-words">
              {titulo}
            </h2>
            {cabecalho && <div className="mt-2">{cabecalho}</div>}
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="toque-44 relative shrink-0 -mr-1.5 w-9 h-9 grid place-items-center rounded-lg text-texto-2 hover:text-texto hover:bg-fundo transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>

        {rodape && (
          <div className="shrink-0 border-t border-borda bg-superficie px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {rodape}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
