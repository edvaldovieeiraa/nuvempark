"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { CrmCard } from "@/components/master/crm/crm-card";
import { COR_ESTAGIO, ESTAGIOS_COM_JANELA, FOCO } from "@/components/master/crm/cores-estagio";
import { ordenarColuna } from "@/lib/crm/ordenacao";
import { ROTULO_ESTAGIO } from "@/lib/crm/rotulos";
import { EXPLICACAO_AUTOMATICO, textoColunaVazia } from "@/lib/crm/textos-lista";
import { ESTAGIOS, type Estagio, type LeadCrm } from "@/lib/crm/tipos";

type Props = {
  leads: LeadCrm[];
  /** ISO vindo da página do servidor; o kanban nunca lê o relógio. */
  agora: string;
  praHoje: boolean;
  /** Estágio escolhido na faixa: no desktop, só essa coluna aparece. */
  estagio?: Estagio | null;
  movendoId: string | null;
  /** Aba visível abaixo de 1024 px. */
  abaAtiva: Estagio;
  onTrocarAba: (e: Estagio) => void;
  onAbrir: (id: string, gatilho: HTMLElement) => void;
  onAbrirMenu: (lead: LeadCrm, botao: HTMLElement) => void;
  onVerTodos: (e: "ganho" | "perdido") => void;
};

const AUTOMATICOS: readonly Estagio[] = ["trial", "ganho"];

/**
 * Pipeline do CRM (design doc, telas 1 e 6). A partir de 1024 px, 5 colunas
 * com rolagem própria e cabeçalho fixo; abaixo, abas de estágio com uma
 * coluna por vez. Os leads chegam já filtrados (busca, fonte, praça, "Pra
 * hoje"), e Ganho/Perdido já vêm só dos últimos 30 dias (`carregarCrm`).
 */
export function CrmKanban({
  leads,
  agora,
  praHoje,
  estagio = null,
  movendoId,
  abaAtiva,
  onTrocarAba,
  onAbrir,
  onAbrirMenu,
  onVerTodos,
}: Props) {
  const colunas = useMemo(() => {
    const agoraD = new Date(agora);
    const por = Object.fromEntries(ESTAGIOS.map((e) => [e, [] as LeadCrm[]])) as Record<
      Estagio,
      LeadCrm[]
    >;
    for (const l of leads) por[l.status].push(l);
    for (const e of ESTAGIOS) por[e] = ordenarColuna(por[e], agoraD);
    return por;
  }, [leads, agora]);

  // Estágio escolhido na faixa: só a coluna dele. Com "Pra hoje", colunas
  // vazias somem (design doc, "Estados").
  const visiveis = estagio
    ? [estagio]
    : praHoje
      ? ESTAGIOS.filter((e) => colunas[e].length > 0)
      : [...ESTAGIOS];

  const cards = (e: Estagio) =>
    colunas[e].length === 0 ? (
      <p className="px-2 py-6 text-center text-xs text-texto-2">{textoColunaVazia(e)}</p>
    ) : (
      // `isolate`: o z-index do ⋮ e do spinner do card fica preso aqui e
      // não passa por cima do cabeçalho fixo da coluna.
      <ul className="isolate flex flex-col gap-2">
        {colunas[e].map((l) => (
          <li key={l.id}>
            <CrmCard
              lead={l}
              agora={agora}
              movendo={movendoId === l.id}
              onAbrir={onAbrir}
              onAbrirMenu={onAbrirMenu}
            />
          </li>
        ))}
      </ul>
    );

  return (
    <>
      {/* ≥ 1024 px: colunas. O invólucro rola na horizontal se a área for
          mais estreita que as 5 colunas, para a página nunca rolar de lado. */}
      <div className="hidden lg:block overflow-x-auto [scrollbar-width:thin] pb-1">
        {visiveis.length === 0 ? (
          <p className="py-10 text-center text-sm text-texto-2">Nada pendente para hoje.</p>
        ) : (
          <div
            className="grid gap-3 items-start"
            // Poucas colunas (estágio escolhido, "Pra hoje") não esticam a
            // tela toda: um card de 900 px de largura não se lê.
            style={{
              gridTemplateColumns: `repeat(${visiveis.length}, minmax(176px, ${visiveis.length <= 2 ? "360px" : "1fr"}))`,
            }}
          >
            {visiveis.map((e) => (
              <Coluna key={e} estagio={e} total={colunas[e].length} onVerTodos={onVerTodos}>
                {cards(e)}
              </Coluna>
            ))}
          </div>
        )}
      </div>

      {/* < 1024 px: abas de estágio, uma coluna por vez. */}
      <div className="lg:hidden space-y-3">
        <Abas colunas={colunas} abaAtiva={abaAtiva} onTrocarAba={onTrocarAba}>
          <CabecalhoMobile estagio={abaAtiva} onVerTodos={onVerTodos} />
          {cards(abaAtiva)}
        </Abas>
      </div>
    </>
  );
}

function DicaAutomatico() {
  return (
    <span
      title={`Automático: ${EXPLICACAO_AUTOMATICO}.`}
      className="inline-flex items-center gap-1 text-[11px] font-bold text-texto-2"
    >
      <Lock className="w-3 h-3" aria-hidden />
      automático
      <span className="sr-only">: {EXPLICACAO_AUTOMATICO}.</span>
    </span>
  );
}

function BotaoVerTodos({
  estagio,
  onVerTodos,
}: {
  estagio: "ganho" | "perdido";
  onVerTodos: (e: "ganho" | "perdido") => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onVerTodos(estagio)}
      aria-label={`Ver todos em ${ROTULO_ESTAGIO[estagio]} na lista`}
      className={`toque-44 relative text-[11px] font-bold text-brand-700 hover:underline rounded ${FOCO}`}
    >
      Ver todos na lista
    </button>
  );
}

function ehJanela(e: Estagio): e is "ganho" | "perdido" {
  return ESTAGIOS_COM_JANELA.includes(e);
}

function Coluna({
  estagio,
  total,
  onVerTodos,
  children,
}: {
  estagio: Estagio;
  total: number;
  onVerTodos: (e: "ganho" | "perdido") => void;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="min-w-0 max-h-[calc(100dvh-19rem)] min-h-[240px] overflow-y-auto [scrollbar-width:thin] rounded-2xl border border-borda bg-fundo"
    >
      <header className="sticky top-0 z-30 bg-fundo px-3 pt-3 pb-2 border-b border-borda">
        <h2 id={id} className="flex items-center gap-1.5 text-sm font-extrabold text-texto">
          <span aria-hidden className={`w-2 h-2 rounded-full ${COR_ESTAGIO[estagio].ponto}`} />
          {ROTULO_ESTAGIO[estagio]}
          <span className="ml-auto min-w-[22px] h-[22px] px-1.5 rounded-full grid place-items-center bg-superficie border border-borda text-xs font-extrabold tabular-nums text-texto-2">
            <span className="sr-only">, </span>
            {total}
            <span className="sr-only"> {total === 1 ? "lead" : "leads"}</span>
          </span>
        </h2>
        {(ehJanela(estagio) || AUTOMATICOS.includes(estagio)) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {ehJanela(estagio) && (
              <span className="text-[11px] text-texto-2">últimos 30 dias</span>
            )}
            {AUTOMATICOS.includes(estagio) && <DicaAutomatico />}
            {ehJanela(estagio) && <BotaoVerTodos estagio={estagio} onVerTodos={onVerTodos} />}
          </div>
        )}
      </header>
      <div className="p-2">{children}</div>
    </section>
  );
}

/** O que o cabeçalho da coluna diz no desktop, no topo do painel da aba. */
function CabecalhoMobile({
  estagio,
  onVerTodos,
}: {
  estagio: Estagio;
  onVerTodos: (e: "ganho" | "perdido") => void;
}) {
  const janela = ehJanela(estagio);
  const auto = AUTOMATICOS.includes(estagio);
  if (!janela && !auto) return null;
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-texto-2">
      {janela && <span>Mostrando os últimos 30 dias</span>}
      {auto && (
        <span className="inline-flex items-center gap-1">
          <Lock className="w-3 h-3 shrink-0" aria-hidden />
          Automático: {EXPLICACAO_AUTOMATICO}.
        </span>
      )}
      {janela && <BotaoVerTodos estagio={estagio} onVerTodos={onVerTodos} />}
    </div>
  );
}

function Abas({
  colunas,
  abaAtiva,
  onTrocarAba,
  children,
}: {
  colunas: Record<Estagio, LeadCrm[]>;
  abaAtiva: Estagio;
  onTrocarAba: (e: Estagio) => void;
  children: React.ReactNode;
}) {
  const base = useId();
  const idAba = (e: Estagio) => `${base}-aba-${e}`;
  const idPainel = `${base}-painel`;
  const trilho = useRef<HTMLDivElement>(null);
  const abas = useRef<Partial<Record<Estagio, HTMLButtonElement | null>>>({});
  const [fade, setFade] = useState({ esq: false, dir: false });

  const atualizarFade = useCallback(() => {
    const el = trilho.current;
    if (!el) return;
    const esq = el.scrollLeft > 1;
    const dir = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setFade((f) => (f.esq === esq && f.dir === dir ? f : { esq, dir }));
  }, []);

  useEffect(() => {
    atualizarFade();
    const el = trilho.current;
    if (!el) return;
    el.addEventListener("scroll", atualizarFade, { passive: true });
    const ro = new ResizeObserver(atualizarFade);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", atualizarFade);
      ro.disconnect();
    };
  }, [atualizarFade]);

  // Aba ativa rolada para a vista, só no trilho (scrollIntoView rolaria a página).
  useEffect(() => {
    const el = trilho.current;
    const aba = abas.current[abaAtiva];
    if (!el || !aba) return;
    const margem = 24;
    if (aba.offsetLeft < el.scrollLeft + margem) {
      el.scrollLeft = Math.max(0, aba.offsetLeft - margem);
    } else if (aba.offsetLeft + aba.offsetWidth > el.scrollLeft + el.clientWidth - margem) {
      el.scrollLeft = aba.offsetLeft + aba.offsetWidth - el.clientWidth + margem;
    }
  }, [abaAtiva]);

  function teclado(ev: React.KeyboardEvent<HTMLButtonElement>) {
    const i = ESTAGIOS.indexOf(abaAtiva);
    let alvo: Estagio | null = null;
    if (ev.key === "ArrowRight") alvo = ESTAGIOS[(i + 1) % ESTAGIOS.length];
    else if (ev.key === "ArrowLeft") alvo = ESTAGIOS[(i - 1 + ESTAGIOS.length) % ESTAGIOS.length];
    else if (ev.key === "Home") alvo = ESTAGIOS[0];
    else if (ev.key === "End") alvo = ESTAGIOS[ESTAGIOS.length - 1];
    if (!alvo) return;
    ev.preventDefault();
    onTrocarAba(alvo);
    abas.current[alvo]?.focus();
  }

  return (
    <>
      <div className="relative">
        <div
          ref={trilho}
          role="tablist"
          aria-label="Estágios"
          className="relative flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1"
        >
          {ESTAGIOS.map((e) => {
            const ativa = e === abaAtiva;
            const n = colunas[e].length;
            return (
              <button
                key={e}
                ref={(el) => {
                  abas.current[e] = el;
                }}
                type="button"
                role="tab"
                id={idAba(e)}
                aria-selected={ativa}
                aria-controls={idPainel}
                tabIndex={ativa ? 0 : -1}
                onClick={() => onTrocarAba(e)}
                onKeyDown={teclado}
                className={`shrink-0 inline-flex items-center gap-1.5 h-11 px-3.5 rounded-xl border text-sm font-bold whitespace-nowrap transition-colors ${FOCO} ${
                  ativa
                    ? "bg-brand-50 border-brand-200 text-brand-700"
                    : "bg-superficie border-borda text-texto-2 hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                <span aria-hidden className={`w-2 h-2 rounded-full ${COR_ESTAGIO[e].ponto}`} />
                {ROTULO_ESTAGIO[e]}
                <span className="tabular-nums text-texto-2">
                  <span className="sr-only">, </span>
                  {n}
                  <span className="sr-only"> {n === 1 ? "lead" : "leads"}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-fundo to-transparent transition-opacity duration-200 ${
            fade.esq ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-fundo to-transparent transition-opacity duration-200 ${
            fade.dir ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
      <div role="tabpanel" id={idPainel} aria-labelledby={idAba(abaAtiva)} tabIndex={0} className={`rounded-xl ${FOCO}`}>
        {children}
      </div>
    </>
  );
}
