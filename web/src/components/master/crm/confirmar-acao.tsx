"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { FOCO } from "@/components/master/crm/cores-estagio";

/**
 * Confirmação de ação destrutiva do CRM (excluir lead, remover print). Tem o
 * visual do `Confirmar` do console, mas trata o teclado: o foco entra no
 * Cancelar, o Tab gira só entre os dois botões e o Esc fecha só a confirmação
 * (com `preventDefault`, a Folha e o visualizador não fecham junto).
 *
 * `noLugar`: renderiza onde está (dentro de uma Folha, que deixa o resto do
 * body `inert`). Sem ele, vai num portal no `<body>`.
 */
export function ConfirmarAcao({
  titulo,
  descricao,
  rotuloConfirmar,
  pendente,
  onCancelar,
  onConfirmar,
  noLugar = false,
  camada = "z-[90]",
}: {
  titulo: string;
  descricao: ReactNode;
  rotuloConfirmar: string;
  pendente: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
  noLugar?: boolean;
  /** Acima do visualizador de print (z-[90]) e abaixo dos toasts (z-[100]). */
  camada?: "z-[90]" | "z-[95]";
}) {
  const id = useId();
  const caixaRef = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelarRef.current?.focus({ preventScroll: true });
  }, []);

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (!pendente) onCancelar();
      return;
    }
    if (e.key !== "Tab") return;
    e.stopPropagation();
    const botoes = Array.from(caixaRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []);
    if (botoes.length === 0) {
      e.preventDefault();
      return;
    }
    const primeiro = botoes[0];
    const ultimo = botoes[botoes.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    } else if (!caixaRef.current?.contains(document.activeElement)) {
      e.preventDefault();
      primeiro.focus();
    }
  }

  const caixa = (
    <div
      className={`folha-fundo fixed inset-0 ${camada} grid place-items-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-noite/50 backdrop-blur-sm touch-none`}
      onClick={() => !pendente && onCancelar()}
      onKeyDown={aoTeclar}
    >
      <div
        ref={caixaRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-desc`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-superficie shadow-[var(--shadow-pop)] p-6"
      >
        <div className="w-12 h-12 rounded-2xl bg-perigo-bg grid place-items-center mb-4">
          <AlertTriangle className="w-6 h-6 text-perigo-texto" aria-hidden />
        </div>
        <h3 id={`${id}-titulo`} className="text-lg font-extrabold break-words">
          {titulo}
        </h3>
        <p id={`${id}-desc`} className="text-sm text-texto-2 mt-1.5 leading-relaxed">
          {descricao}
        </p>
        <div className="flex gap-3 mt-6">
          <button
            ref={cancelarRef}
            type="button"
            onClick={onCancelar}
            disabled={pendente}
            className={`flex-1 h-11 rounded-xl border border-borda text-sm font-bold text-texto-2 hover:bg-fundo transition-colors ${FOCO}`}
          >
            Cancelar
          </button>
          {/* perigo-texto (#B91C1C): branco dá 6,47:1; o perigo (#EF4444) dava 3,76:1. */}
          <button
            type="button"
            onClick={onConfirmar}
            disabled={pendente}
            className={`flex-1 h-11 rounded-xl bg-perigo-texto text-white text-sm font-bold hover:brightness-110 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-70 ${FOCO}`}
          >
            {pendente && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  );

  if (noLugar) return caixa;
  if (typeof document === "undefined") return null;
  return createPortal(caixa, document.body);
}

/** Texto da confirmação de excluir lead (design, revisão 1, item 20). */
export function descricaoExcluirLead(): ReactNode {
  return (
    <>
      O card sai do quadro e fica em <b className="text-texto">Excluídos</b>, de onde dá para restaurar. Se a
      pessoa voltar a procurar a NuvemPark, ele volta sozinho.
    </>
  );
}
