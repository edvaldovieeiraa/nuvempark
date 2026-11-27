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
import { Check, Trash2 } from "lucide-react";
import { indiceAoTeclar, itensMenuEstagio, type DestinoMenu } from "@/lib/crm/menu-estagio";
import type { LeadCrm } from "@/lib/crm/tipos";
import { calcularPosMenu, estiloMenu, useFecharAoRolar } from "@/components/ui/menu-flutuante";
import { COR_ESTAGIO, FOCO } from "@/components/master/crm/cores-estagio";
import { ConfirmarAcao, descricaoExcluirLead } from "@/components/master/crm/confirmar-acao";

type Props = {
  lead: LeadCrm;
  ancora: HTMLElement | null;
  aberto: boolean;
  /** "embutido": dentro de uma Folha (painel, celular), sem portal. */
  modo?: "flutuante" | "embutido";
  onFechar: () => void;
  /** O pai move (otimista). "perdido" quer dizer: abra o DialogoPerda. */
  onEscolher: (destino: DestinoMenu) => void;
  /** O pai exclui (action, foco e painel); true = excluído. */
  onExcluir: (lead: LeadCrm) => Promise<boolean>;
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

function MenuAberto({ lead, ancora, modo = "flutuante", onFechar, onEscolher, onExcluir }: Props) {
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

  const totalItens = modelo.itens.length + 1;

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
      if (await onExcluir(lead)) onFechar();
      else fecharConfirmacao();
    });
  }

  const ITEM = `toque-44 w-full flex items-center gap-2.5 min-h-10 px-3 rounded-lg text-left text-sm font-semibold text-texto hover:bg-fundo focus:bg-fundo outline-none ${FOCO}`;

  const caixaClasse = flutuante
    ? "fixed z-[70] w-64 max-w-[calc(100vw-16px)] rounded-xl border border-borda bg-superficie p-1.5 shadow-[var(--shadow-pop)] invisible"
    : "rounded-xl border border-borda bg-superficie p-1.5";

  const conteudo = (
    <div ref={caixaRef} className={caixaClasse} onKeyDown={aoTeclar} tabIndex={-1}>
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
          <div role="separator" className="my-1 h-px bg-borda" />
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
            <span className="flex-1">Excluir…</span>
          </button>
        </div>
        <p id={idExplicacao} className="mt-1 border-t border-borda px-2.5 pt-2 pb-1 text-xs text-texto-2">
          {modelo.explicacao}
        </p>
    </div>
  );

  // A confirmação nasce irmã da caixa: fora do role="menu" (as setas do menu
  // não comem as teclas dela) e, no modo embutido, dentro da Folha (fora
  // dela, tudo está inert).
  const menu = (
    <div ref={raizRef}>
      {conteudo}
      {confirmando && (
        <ConfirmarAcao
          noLugar
          titulo={`Excluir ${lead.nome}?`}
          descricao={descricaoExcluirLead()}
          rotuloConfirmar="Excluir"
          pendente={excluindo}
          onCancelar={fecharConfirmacao}
          onConfirmar={excluir}
        />
      )}
    </div>
  );

  if (!flutuante) return menu;
  if (typeof document === "undefined") return null;
  return createPortal(menu, document.body);
}
