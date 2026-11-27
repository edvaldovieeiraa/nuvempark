"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Loader2, Trash2 } from "lucide-react";
import { excluirLeadSpam } from "@/app/master/(console)/crm/actions";
import { indiceAoTeclar, itensMenuEstagio, type DestinoMenu } from "@/lib/crm/menu-estagio";
import type { LeadCrm } from "@/lib/crm/tipos";
import { calcularPosMenu, estiloMenu, useFecharAoRolar } from "@/components/ui/menu-flutuante";
import { useToast } from "@/components/ui/toast";
import { chamarAction } from "@/components/master/crm/chamar-action";
import { COR_ESTAGIO, FOCO } from "@/components/master/crm/cores-estagio";

type Props = {
  lead: LeadCrm;
  ancora: HTMLElement | null;
  aberto: boolean;
  /** "embutido": dentro de uma Folha (painel, celular), sem portal. */
  modo?: "flutuante" | "embutido";
  onFechar: () => void;
  /** O pai move (otimista). "perdido" quer dizer: abra o DialogoPerda. */
  onEscolher: (destino: DestinoMenu) => void;
  /** Depois de "Reabrir" ou "Excluir: é spam", que este menu chama sozinho. */
  onAtualizado?: () => void;
};

/**
 * Menu de estágio (design doc, tela 4). Mostra só o que `itensMenuEstagio`
 * permite. No modo flutuante vai num portal no `<body>`, em `position: fixed`,
 * para a coluna que rola não cortar; dentro de uma Folha (que deixa o resto
 * do body `inert`) é renderizado no lugar.
 */
export function MenuEstagio(props: Props) {
  if (!props.aberto) return null;
  return <MenuAberto key={props.lead.id} {...props} />;
}

function MenuAberto({ lead, ancora, modo = "flutuante", onFechar, onEscolher, onAtualizado }: Props) {
  const toast = useToast();
  const idExplicacao = useId();
  const modelo = itensMenuEstagio(lead);
  const caixaRef = useRef<HTMLDivElement>(null);
  /** Caixa + confirmação de excluir: o clique fora ignora as duas. */
  const raizRef = useRef<HTMLDivElement>(null);
  const itensRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [focado, setFocado] = useState(0);
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, comecarExclusao] = useTransition();
  const flutuante = modo === "flutuante";

  const totalItens = modelo.itens.length + (modelo.podeExcluir ? 1 : 0);

  function fechar(devolverFoco: boolean) {
    onFechar();
    if (devolverFoco) ancora?.focus({ preventScroll: true });
  }

  // Posição calculada antes da pintura e escrita direto no elemento.
  useLayoutEffect(() => {
    if (!flutuante || !caixaRef.current) return;
    const pos = calcularPosMenu(ancora);
    if (!pos) return;
    const el = caixaRef.current;
    for (const [k, v] of Object.entries(estiloMenu(pos))) el.style.setProperty(k, `${v}px`);
    el.style.visibility = "visible";
  }, [flutuante, ancora]);

  // Foco no primeiro item que faz algo (o atual só fecha).
  useEffect(() => {
    const inicial = modelo.itens.findIndex((i) => i.tipo !== "atual");
    const alvo = itensRef.current[inicial >= 0 ? inicial : 0] ?? caixaRef.current;
    alvo?.focus({ preventScroll: true });
    // Só ao abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clique fora fecha (só flutuante; na Folha, quem fecha é o botão).
  // A âncora fica de fora: senão o clique nela fecha e o onClick reabre.
  const onFecharRef = useRef(onFechar);
  useEffect(() => {
    onFecharRef.current = onFechar;
  });
  useEffect(() => {
    if (!flutuante) return;
    function fora(e: PointerEvent) {
      const alvo = e.target as Node | null;
      if (!alvo || raizRef.current?.contains(alvo) || ancora?.contains(alvo)) return;
      onFecharRef.current();
    }
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [flutuante, ancora]);
  // Com a confirmação aberta, rolar a página por trás não derruba o diálogo.
  useFecharAoRolar(flutuante && !confirmando, onFechar);

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      // preventDefault: a Folha só não fecha se o Esc vier tratado.
      e.preventDefault();
      e.stopPropagation();
      fechar(true);
      return;
    }
    if (e.key === "Tab" && flutuante) {
      onFechar();
      return;
    }
    const proximo = indiceAoTeclar(focado, e.key, totalItens);
    if (proximo === null) return;
    e.preventDefault();
    itensRef.current[proximo]?.focus();
  }

  function fecharConfirmacao() {
    setConfirmando(false);
    itensRef.current[modelo.itens.length]?.focus({ preventScroll: true });
  }

  function excluir() {
    comecarExclusao(async () => {
      const r = await chamarAction(() => excluirLeadSpam(lead.id));
      if (r.ok) {
        toast.sucesso(r.msg);
        onAtualizado?.();
        onFechar();
      } else {
        toast.erro(r.msg);
        fecharConfirmacao();
      }
    });
  }

  const ITEM = `toque-44 w-full flex items-center gap-2.5 min-h-10 px-3 rounded-lg text-left text-sm font-semibold text-texto hover:bg-fundo focus:bg-fundo outline-none ${FOCO}`;

  const caixaClasse = flutuante
    ? "fixed z-[70] w-64 max-w-[calc(100vw-16px)] rounded-xl border border-borda bg-superficie p-1.5 shadow-[var(--shadow-pop)] invisible"
    : "rounded-xl border border-borda bg-superficie p-1.5";

  const conteudo = (
    <div ref={caixaRef} className={caixaClasse} onKeyDown={aoTeclar} tabIndex={-1}>
      <>
          <div role="menu" aria-label={`Estágio de ${lead.nome}`}>
            {modelo.itens.map((item, i) => {
              const atual = item.tipo === "atual";
              const ponto = COR_ESTAGIO[item.tipo === "atual" ? item.estagio : item.destino].ponto;
              return (
                <button
                  key={item.tipo === "mover" ? item.destino : "atual"}
                  ref={(el) => {
                    itensRef.current[i] = el;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={atual}
                  aria-describedby={idExplicacao}
                  tabIndex={focado === i ? 0 : -1}
                  onFocus={() => setFocado(i)}
                  onClick={() => {
                    if (item.tipo === "atual") fechar(true);
                    else {
                      // Foco na âncora antes do pai abrir o DialogoPerda: a
                      // Folha dele guarda o foco atual para devolver ao fechar.
                      fechar(true);
                      onEscolher(item.destino);
                    }
                  }}
                  className={ITEM}
                >
                  <span aria-hidden className={`w-2 h-2 rounded-full shrink-0 ${ponto}`} />
                  <span className="flex-1">{item.rotulo}</span>
                  {atual && <Check className="w-4 h-4 text-brand-700" aria-hidden />}
                </button>
              );
            })}
            {modelo.podeExcluir && (
              <>
                {modelo.itens.length > 0 && <div role="separator" className="my-1 h-px bg-borda" />}
                <button
                  ref={(el) => {
                    itensRef.current[modelo.itens.length] = el;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={focado === modelo.itens.length ? 0 : -1}
                  onFocus={() => setFocado(modelo.itens.length)}
                  onClick={() => setConfirmando(true)}
                  className={`${ITEM} text-perigo-texto hover:bg-perigo-bg focus:bg-perigo-bg`}
                >
                  <Trash2 className="w-4 h-4 shrink-0" aria-hidden />
                  <span className="flex-1">Excluir: é spam</span>
                </button>
              </>
            )}
          </div>
          <p id={idExplicacao} className="mt-1 border-t border-borda px-2.5 pt-2 pb-1 text-xs text-texto-2">
            {modelo.explicacao}
          </p>
      </>
    </div>
  );

  // A confirmação nasce irmã da caixa: fora do role="menu" (as setas do menu
  // não comem as teclas dela) e, no modo embutido, dentro da Folha (fora
  // dela, tudo está inert).
  const menu = (
    <div ref={raizRef}>
      {conteudo}
      {confirmando && (
        <ConfirmarExclusao pendente={excluindo} onCancelar={fecharConfirmacao} onConfirmar={excluir} />
      )}
    </div>
  );

  if (!flutuante) return menu;
  if (typeof document === "undefined") return null;
  return createPortal(menu, document.body);
}

/**
 * "Excluir de vez?" (design doc, "Estados"). Tem o visual do `Confirmar` do
 * console, mas é daqui porque aquele não trata teclado: o Esc subia até a
 * Folha e fechava o painel inteiro, e o foco ficava atrás do fundo escuro.
 * Aqui o foco entra no Cancelar, o Tab gira só entre os dois botões e o Esc
 * fecha só a confirmação (o foco volta ao "Excluir: é spam").
 */
function ConfirmarExclusao({
  pendente,
  onCancelar,
  onConfirmar,
}: {
  pendente: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  const id = useId();
  const caixaRef = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelarRef.current?.focus({ preventScroll: true });
  }, []);

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      // preventDefault: a Folha e o listener de Esc do documento deixam passar.
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

  return (
    <div
      className="folha-fundo fixed inset-0 z-[90] grid place-items-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-noite/50 backdrop-blur-sm touch-none"
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
          <AlertTriangle className="w-6 h-6 text-perigo" aria-hidden />
        </div>
        <h3 id={`${id}-titulo`} className="text-lg font-extrabold">
          Excluir de vez?
        </h3>
        <p id={`${id}-desc`} className="text-sm text-texto-2 mt-1.5 leading-relaxed">
          Use só para spam: perdido guarda o histórico.
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
          <button
            type="button"
            onClick={onConfirmar}
            disabled={pendente}
            className={`flex-1 h-11 rounded-xl bg-perigo text-white text-sm font-bold hover:brightness-110 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-70 ${FOCO}`}
          >
            {pendente && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
