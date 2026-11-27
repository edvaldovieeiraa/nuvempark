"use client";

import {
  startTransition,
  useEffect,
  useId,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Archive, Columns3, List, Loader2, Plus, Search, SlidersHorizontal } from "lucide-react";
import {
  definirTemperatura,
  excluirLead,
  moverEstagio,
  restaurarLead,
} from "@/app/master/(console)/crm/actions";
import {
  aplicarFiltros,
  contarPorEstagio,
  naJanela,
  opcoesFonte,
  opcoesPraca,
  type FiltroTemperatura,
} from "@/lib/crm/filtros";
import type { DestinoMenu } from "@/lib/crm/menu-estagio";
import { estaPraHoje } from "@/lib/crm/prazos";
import { ROTULO_FONTE } from "@/lib/crm/rotulos";
import { ROTULO_TEMPERATURA } from "@/lib/crm/temperatura";
import { TEMPERATURAS, type Estagio, type Fonte, type LeadCrm, type MotivoPerda, type Temperatura } from "@/lib/crm/tipos";
import { useToast } from "@/components/ui/toast";
import { chamarAction } from "@/components/master/crm/chamar-action";
import { COR_ESTAGIO, FOCO } from "@/components/master/crm/cores-estagio";
import { CrmKanban } from "@/components/master/crm/crm-kanban";
import { CrmExcluidos } from "@/components/master/crm/crm-excluidos";
import { CrmLista, CrmVazio } from "@/components/master/crm/crm-lista";
import { DialogoNovoLead } from "@/components/master/crm/dialogo-novo-lead";
import { DialogoPerda } from "@/components/master/crm/dialogo-perda";
import { AlternarPraHoje, FaixaEstagios } from "@/components/master/crm/faixa-estagios";
import { LeadPainel } from "@/components/master/crm/lead-painel";
import { MenuEstagio } from "@/components/master/crm/menu-estagio";
import { BTN_PRIMARIO, CAMPO } from "@/components/master/crm/estilos";

type Visao = "kanban" | "lista" | "excluidos";
type EstagioCompleto = "ganho" | "perdido";
type MotivoManual = Exclude<MotivoPerda, "cancelou">;

type Props = {
  /** Janela (Ganho/Perdido dos últimos 30 dias) + o estágio inteiro do `?estagio=` + o `?lead=`. */
  leads: LeadCrm[];
  /** ISO do servidor: nenhum componente do CRM lê o relógio. */
  agora: string;
  erro: boolean;
  /** Estágio que o servidor carregou inteiro (`?estagio=ganho|perdido`). */
  estagioCompleto: EstagioCompleto | null;
  visaoInicial: Visao;
  /** `?visao=excluidos`: os excluídos (outro conjunto, carregado pelo servidor). */
  excluidos: LeadCrm[] | null;
  /**
   * Lead do `?lead=` que não está em `leads` e não deve entrar nas contagens:
   * um excluído aberto por link, ou qualquer um na visão Excluídos.
   */
  leadAvulso: LeadCrm | null;
};

/** Troca a query sem ida ao servidor; o `useSearchParams` acompanha (Next 16). */
function trocarQuery(mudar: (p: URLSearchParams) => void) {
  const p = new URLSearchParams(window.location.search);
  mudar(p);
  const q = p.toString();
  window.history.replaceState(null, "", q ? `?${q}` : window.location.pathname);
}

function queryCom(mudar: (p: URLSearchParams) => void): string {
  const p = new URLSearchParams(window.location.search);
  mudar(p);
  const q = p.toString();
  return q ? `/master/crm?${q}` : "/master/crm";
}

const SELECT = `${CAMPO} pr-8 lg:w-40 xl:w-44`;

/**
 * Tela do CRM (plano 4.8): barra da página, faixa de estágios, kanban ou
 * lista, painel do lead e os diálogos. O header do AppShell não muda.
 *
 * - `?lead=<id>` é o painel aberto (recarregar e "Abrir" de duplicado caem nele);
 * - `?visao=lista` é a visão; `?estagio=ganho|perdido` faz a página carregar o
 *   estágio inteiro (o "Ver todos na lista").
 *
 * O movimento de estágio é otimista (`useOptimistic`): o card muda de coluna
 * na hora e volta sozinho se a action falhar.
 */
type MudancaOtimista =
  | { tipo: "mover"; id: string; status: Estagio }
  | { tipo: "temperatura"; id: string; temperatura: Temperatura | null };

export function CrmClient({ leads, agora, erro, estagioCompleto, visaoInicial, excluidos, leadAvulso }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const idBusca = useId();
  const idFiltros = useId();
  const agoraD = useMemo(() => new Date(agora), [agora]);

  const [leadsVis, aplicarOtimista] = useOptimistic(leads, (atual: LeadCrm[], m: MudancaOtimista) =>
    atual.map((l) =>
      l.id !== m.id
        ? l
        : m.tipo === "mover"
          ? { ...l, status: m.status, estagioEm: agora }
          : { ...l, temperatura: m.temperatura },
    ),
  );

  // Kanban/Lista é estado da tela; "Excluídos" vem dos dados da página
  // (`excluidos` só chega com `?visao=excluidos`), e segue o Voltar do navegador.
  const [visao, setVisao] = useState<Exclude<Visao, "excluidos">>(
    visaoInicial === "lista" ? "lista" : "kanban",
  );
  const [busca, setBusca] = useState("");
  const [fonte, setFonte] = useState<Fonte | null>(null);
  const [praca, setPraca] = useState<string | null>(null);
  const [temperatura, setTemperatura] = useState<FiltroTemperatura | null>(null);
  const [temperaturaPendente, setTemperaturaPendente] = useState<string | null>(null);
  const [restaurandoId, setRestaurandoId] = useState<string | null>(null);
  const [praHoje, setPraHoje] = useState(false);
  const [estagioSel, setEstagioSel] = useState<Estagio | null>(estagioCompleto);
  const [abaAtiva, setAbaAtiva] = useState<Estagio>(estagioCompleto ?? "novo");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [menu, setMenu] = useState<{ lead: LeadCrm; ancora: HTMLElement } | null>(null);
  const [perda, setPerda] = useState<LeadCrm | null>(null);
  const [enviandoPerda, setEnviandoPerda] = useState(false);
  const [novoLead, setNovoLead] = useState(false);
  const [movendoId, setMovendoId] = useState<string | null>(null);
  const [gatilho, setGatilho] = useState<HTMLElement | null>(null);
  const [navegando, navegar] = useTransition();

  const urlEstagio = params.get("estagio");
  const idAberto = params.get("lead");
  const leadAberto = idAberto
    ? (leadsVis.find((l) => l.id === idAberto) ??
      excluidos?.find((l) => l.id === idAberto) ??
      (leadAvulso?.id === idAberto ? leadAvulso : null))
    : null;

  // ── Dados derivados ───────────────────────────────────────────────────
  const janela = useMemo(() => leadsVis.filter((l) => naJanela(l, agoraD)), [leadsVis, agoraD]);
  const filtrados = useMemo(
    () => aplicarFiltros(janela, { busca, fonte, praca, temperatura }),
    [janela, busca, fonte, praca, temperatura],
  );
  // O total do "Pra hoje" segue busca, fonte e praça, mas não o próprio botão.
  const totalPraHoje = useMemo(
    () => filtrados.filter((l) => estaPraHoje(l, agoraD)).length,
    [filtrados, agoraD],
  );
  const base = useMemo(
    () => (praHoje ? filtrados.filter((l) => estaPraHoje(l, agoraD)) : filtrados),
    [filtrados, praHoje, agoraD],
  );
  // A faixa conta tudo o que os outros filtros deixam, sem o estágio escolhido.
  const contagens = useMemo(() => contarPorEstagio(base), [base]);

  const completo =
    estagioSel !== null && estagioSel === estagioCompleto && urlEstagio === estagioSel;
  const leadsLista = useMemo(() => {
    if (!estagioSel) return base;
    if (!completo) return base.filter((l) => l.status === estagioSel);
    const doEstagio = aplicarFiltros(
      leadsVis.filter((l) => l.status === estagioSel),
      { busca, fonte, praca, temperatura },
    );
    return praHoje ? doEstagio.filter((l) => estaPraHoje(l, agoraD)) : doEstagio;
  }, [base, estagioSel, completo, leadsVis, busca, fonte, praca, temperatura, praHoje, agoraD]);

  const algumFiltro = !!busca.trim() || !!fonte || !!praca || !!temperatura || praHoje;

  const fontes = useMemo(() => opcoesFonte(leadsVis), [leadsVis]);
  const pracas = useMemo(() => opcoesPraca(leadsVis), [leadsVis]);
  const nFiltrosExtras = (fonte ? 1 : 0) + (praca ? 1 : 0) + (temperatura ? 1 : 0);

  // ── Painel do lead ────────────────────────────────────────────────────
  function abrir(id: string, de: HTMLElement | null) {
    setGatilho(de);
    if (leadsVis.some((l) => l.id === id) || excluidos?.some((l) => l.id === id)) {
      trocarQuery((p) => p.set("lead", id));
    } else {
      // Fora da janela (ex.: duplicado num Perdido antigo): a página carrega.
      navegar(() => router.replace(queryCom((p) => p.set("lead", id)), { scroll: false }));
    }
  }

  function fecharPainel() {
    trocarQuery((p) => p.delete("lead"));
  }

  // Lead que sumiu dos dados novos fecha o painel. Só depois de
  // ter sido visto: logo após criar, o id chega antes dos dados.
  const vistoRef = useRef<string | null>(null);
  const temLeadAberto = !!leadAberto;
  useEffect(() => {
    if (!idAberto) {
      vistoRef.current = null;
    } else if (temLeadAberto) {
      vistoRef.current = idAberto;
    } else if (vistoRef.current === idAberto) {
      vistoRef.current = null;
      trocarQuery((p) => p.delete("lead"));
    }
  }, [idAberto, temLeadAberto]);

  // ── Movimento de estágio ──────────────────────────────────────────────
  // O card muda de coluna e remonta: o ⋮ que tinha o foco sai da página. Se o
  // foco cair no <body>, volta para o card do lead movido. Depois de excluir,
  // o alvo é o card vizinho, ou o título da coluna (`coluna:<estágio>`).
  const focarCardRef = useRef<string | null>(null);
  useEffect(() => {
    const id = focarCardRef.current;
    if (!id || perda || leadAberto || menu) return;
    const ativo = document.activeElement;
    if (ativo && ativo !== document.body && document.body.contains(ativo)) {
      focarCardRef.current = null;
      return;
    }
    const seletor = id.startsWith("coluna:")
      ? `[data-coluna-titulo="${CSS.escape(id.slice(7))}"]`
      : `[data-lead-id="${CSS.escape(id)}"] h3 button`;
    // O kanban tem o card duas vezes (colunas e abas); vale o que está visível.
    const alvo = Array.from(document.querySelectorAll<HTMLElement>(seletor)).find(
      (b) => b.getClientRects().length > 0,
    );
    if (!alvo) return; // os dados novos ainda não chegaram
    focarCardRef.current = null;
    alvo.focus({ preventScroll: true });
  });

  /** Antes de excluir: o vizinho do card na mesma coluna, ou o título dela. */
  function prepararFocoAposSumir(id: string) {
    const card = Array.from(document.querySelectorAll<HTMLElement>(`[data-lead-id="${CSS.escape(id)}"]`)).find(
      (c) => c.getClientRects().length > 0,
    );
    const li = card?.closest("li");
    const vizinho =
      li?.nextElementSibling?.querySelector<HTMLElement>("[data-lead-id]") ??
      li?.previousElementSibling?.querySelector<HTMLElement>("[data-lead-id]");
    const lead = leadsVis.find((l) => l.id === id);
    focarCardRef.current = vizinho?.dataset.leadId ?? (lead ? `coluna:${lead.status}` : null);
  }

  async function excluir(lead: LeadCrm): Promise<boolean> {
    const r = await chamarAction(() => excluirLead(lead.id));
    if (r.ok) {
      // Fecha já: com `?lead=` na URL, a página recarregada traria o lead de
      // volta como avulso (excluído, em modo leitura) e o painel ficaria aberto.
      if (params.get("lead") === lead.id) fecharPainel();
      toast.sucesso(r.msg);
    } else {
      toast.erro(r.msg);
      focarCardRef.current = null;
    }
    return r.ok;
  }

  async function restaurar(lead: LeadCrm): Promise<boolean> {
    setRestaurandoId(lead.id);
    const r = await chamarAction(() => restaurarLead(lead.id));
    setRestaurandoId(null);
    if (r.ok) toast.sucesso(r.msg);
    else toast.erro(r.msg);
    return r.ok;
  }

  // ── Temperatura ───────────────────────────────────────────────────────
  // `de` é o que o servidor confirmou (a prop `leads`), não o valor otimista.
  function marcarTemperatura(lead: LeadCrm, para: Temperatura | null) {
    if (temperaturaPendente) return;
    const doServidor = leads.find((l) => l.id === lead.id);
    const de = doServidor ? doServidor.temperatura : lead.temperatura;
    setTemperaturaPendente(lead.id);
    startTransition(async () => {
      aplicarOtimista({ tipo: "temperatura", id: lead.id, temperatura: para });
      const r = await chamarAction(() => definirTemperatura({ id: lead.id, de, para }));
      setTemperaturaPendente(null);
      if (!r.ok) toast.erro(r.msg);
    });
  }

  function mover(
    lead: LeadCrm,
    para: DestinoMenu,
    motivo?: { motivo: MotivoManual; texto: string },
  ): Promise<boolean> {
    return new Promise((resolver) => {
      setMovendoId(lead.id);
      focarCardRef.current = lead.id;
      startTransition(async () => {
        aplicarOtimista({ tipo: "mover", id: lead.id, status: para });
        // Sem rede, a action rejeita: sem o chamarAction o spinner do card e o
        // "Marcar como perdido" ficavam presos (o resolver nunca era chamado).
        const r = await chamarAction(() =>
          moverEstagio({
            id: lead.id,
            de: lead.status,
            para,
            motivoPerda: motivo?.motivo ?? null,
            texto: motivo?.texto ?? null,
          }),
        );
        setMovendoId(null);
        if (r.ok) toast.sucesso(r.msg);
        else toast.erro(r.msg);
        resolver(r.ok);
      });
    });
  }

  function escolher(lead: LeadCrm, destino: DestinoMenu) {
    if (destino === "perdido") setPerda(lead);
    else void mover(lead, destino);
  }

  async function confirmarPerda(motivo: MotivoManual, texto: string) {
    if (!perda) return;
    setEnviandoPerda(true);
    const ok = await mover(perda, "perdido", { motivo, texto });
    setEnviandoPerda(false);
    // Na falha o diálogo fica, com o que foi escrito; o card já voltou.
    if (ok) setPerda(null);
  }

  // ── Filtros e visão ───────────────────────────────────────────────────
  function trocarVisao(v: Exclude<Visao, "excluidos">) {
    setVisao(v);
    trocarQuery((p) => (v === "lista" ? p.set("visao", "lista") : p.delete("visao")));
  }

  // Excluídos é outro conjunto de dados: a página carrega do servidor.
  function irParaExcluidos() {
    navegar(() => router.push("/master/crm?visao=excluidos", { scroll: false }));
  }
  function voltarDosExcluidos() {
    navegar(() => router.push(visao === "lista" ? "/master/crm?visao=lista" : "/master/crm", { scroll: false }));
  }

  function selecionarEstagio(e: Estagio | null) {
    setEstagioSel(e);
    if (e) setAbaAtiva(e);
    // O estágio inteiro só vale enquanto ele estiver escolhido.
    if (urlEstagio && urlEstagio !== e) trocarQuery((p) => p.delete("estagio"));
  }

  function verTodos(e: EstagioCompleto) {
    setVisao("lista");
    setEstagioSel(e);
    setAbaAtiva(e);
    navegar(() =>
      router.push(
        queryCom((p) => {
          p.set("visao", "lista");
          p.set("estagio", e);
        }),
        { scroll: false },
      ),
    );
  }

  function limparBusca() {
    setBusca("");
    document.getElementById(idBusca)?.focus();
  }

  // ── Render ────────────────────────────────────────────────────────────
  const total = leadsVis.length;

  const seletorVisao = (
    <div role="group" aria-label="Visão" className="inline-flex p-1 rounded-xl border border-borda-campo bg-superficie">
      {(
        [
          ["kanban", "Kanban", Columns3],
          ["lista", "Lista", List],
        ] as const
      ).map(([v, rotulo, Icone]) => (
        <button
          key={v}
          type="button"
          aria-pressed={visao === v}
          onClick={() => trocarVisao(v)}
          className={`toque-44 relative inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-bold transition-colors ${FOCO} ${
            visao === v ? "bg-brand-50 text-brand-700" : "text-texto-2 hover:text-brand-700"
          }`}
        >
          <Icone className="w-4 h-4" aria-hidden />
          {rotulo}
        </button>
      ))}
    </div>
  );

  const selectFonte = (
    <select
      aria-label="Fonte"
      value={fonte ?? ""}
      onChange={(e) => setFonte((e.target.value || null) as Fonte | null)}
      className={SELECT}
    >
      <option value="">Todas as fontes</option>
      {fontes.map((f) => (
        <option key={f} value={f}>
          {ROTULO_FONTE[f]}
        </option>
      ))}
    </select>
  );

  const selectTemperatura = (
    <select
      aria-label="Temperatura"
      value={temperatura ?? ""}
      onChange={(e) => setTemperatura((e.target.value || null) as FiltroTemperatura | null)}
      className={SELECT}
    >
      <option value="">Todas as temperaturas</option>
      {TEMPERATURAS.map((t) => (
        <option key={t} value={t}>
          {ROTULO_TEMPERATURA[t]}
        </option>
      ))}
      <option value="sem">Sem marca</option>
    </select>
  );

  const linkExcluidos = (
    <button
      type="button"
      onClick={irParaExcluidos}
      className={`toque-44 relative inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-sm font-bold text-texto-2 hover:text-brand-700 hover:bg-fundo ${FOCO}`}
    >
      <Archive className="w-4 h-4" aria-hidden />
      Excluídos
    </button>
  );

  const selectPraca = (
    <select
      aria-label="Praça"
      value={praca ?? ""}
      onChange={(e) => setPraca(e.target.value || null)}
      className={SELECT}
    >
      <option value="">Todas as praças</option>
      {pracas.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );

  // Estados vazios com filtro ligado: as caixas da lista servem aos dois.
  const vazioFiltrado = (
    <CrmLista
      leads={[]}
      agora={agora}
      praHoje={praHoje}
      busca={busca}
      total={total}
      onAbrir={abrir}
      onLimparBusca={limparBusca}
      onDesligarPraHoje={() => setPraHoje(false)}
    />
  );

  const naVisaoExcluidos = excluidos !== null;

  let conteudo: React.ReactNode;
  if (erro) conteudo = null;
  else if (naVisaoExcluidos)
    conteudo = (
      <CrmExcluidos
        leads={excluidos}
        restaurandoId={restaurandoId}
        onAbrir={abrir}
        onRestaurar={(l) => void restaurar(l)}
        onVoltar={voltarDosExcluidos}
      />
    );
  else if (total === 0) conteudo = <CrmVazio />;
  else if (visao === "lista")
    conteudo = (
      <CrmLista
        leads={leadsLista}
        agora={agora}
        praHoje={praHoje}
        busca={busca}
        total={total}
        onAbrir={abrir}
        onLimparBusca={limparBusca}
        onDesligarPraHoje={() => setPraHoje(false)}
      />
    );
  // Com um estágio escolhido, a coluna dele mostra o próprio vazio; a caixa
  // só aparece quando os filtros esvaziam o kanban inteiro.
  else if (algumFiltro && base.length === 0) conteudo = vazioFiltrado;
  else
    conteudo = (
      <CrmKanban
        leads={base}
        agora={agora}
        praHoje={praHoje}
        estagio={estagioSel}
        movendoId={movendoId}
        abaAtiva={abaAtiva}
        onTrocarAba={setAbaAtiva}
        onAbrir={abrir}
        onAbrirMenu={(lead, botao) => setMenu({ lead, ancora: botao })}
        onVerTodos={verTodos}
      />
    );

  return (
    <div className="space-y-4 pb-24 lg:pb-0">
      {/* Barra da página (Revisão 8): o header do AppShell fica como está. */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">CRM</h1>
          <p className="text-sm text-texto-2 min-w-0 truncate">
            {janela.length} {janela.length === 1 ? "lead" : "leads"}
          </p>
          {navegando && (
            <Loader2 className="w-4 h-4 animate-spin text-brand-700" aria-label="Carregando" />
          )}
          <div className="ml-auto flex items-center gap-2">
            {/* Link secundário, fora do grupo Kanban/Lista (revisão 1, item 21). */}
            {!naVisaoExcluidos && linkExcluidos}
          </div>
          <div className="hidden lg:flex items-center gap-3">
            {!naVisaoExcluidos && seletorVisao}
            <button type="button" onClick={() => setNovoLead(true)} className={BTN_PRIMARIO}>
              <Plus className="w-4 h-4" aria-hidden />
              Novo lead
            </button>
          </div>
        </div>

        <div className={`flex flex-wrap lg:flex-nowrap items-center gap-2 ${naVisaoExcluidos ? "hidden" : ""}`}>
          <div className="relative basis-full sm:basis-auto sm:flex-1 sm:min-w-[180px] lg:max-w-md">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-texto-2"
              aria-hidden
            />
            <input
              id={idBusca}
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar leads"
              placeholder="Nome, empresa, e-mail ou telefone"
              className={`${CAMPO} pl-10`}
            />
          </div>
          <div className="hidden lg:contents">
            {selectFonte}
            {selectPraca}
            {selectTemperatura}
          </div>
          <AlternarPraHoje ativo={praHoje} total={totalPraHoje} onAlternar={() => setPraHoje((v) => !v)} />
          <button
            type="button"
            aria-expanded={filtrosAbertos}
            aria-controls={idFiltros}
            onClick={() => setFiltrosAbertos((v) => !v)}
            className={`lg:hidden toque-44 relative inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border text-sm font-bold transition-colors ${FOCO} ${
              filtrosAbertos || nFiltrosExtras
                ? "bg-brand-50 border-brand-200 text-brand-700"
                : "bg-superficie border-borda-campo text-texto-2"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden />
            Filtros
            {nFiltrosExtras > 0 && (
              <span className="tabular-nums">
                <span className="sr-only">, </span>
                {nFiltrosExtras}
                <span className="sr-only"> {nFiltrosExtras === 1 ? "ligado" : "ligados"}</span>
              </span>
            )}
          </button>
        </div>

        {/* < 1024 px: fonte, praça e a troca de visão ficam aqui dentro. */}
        <div
          id={idFiltros}
          hidden={!filtrosAbertos || naVisaoExcluidos}
          className="lg:hidden rounded-2xl border border-borda bg-superficie p-3 space-y-3"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {selectFonte}
            {selectPraca}
            {selectTemperatura}
          </div>
          {seletorVisao}
        </div>
      </div>

      {erro && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-perigo-borda bg-perigo-bg px-4 py-3 text-sm text-perigo-texto"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
          <p>
            Não consegui ler o CRM. Se a migration <b>db/47-crm.sql</b> ainda não foi aplicada, a
            tela fica vazia, e isso não quer dizer que não há leads: o formulário do site pode estar
            gravando normalmente.
          </p>
        </div>
      )}

      {!erro && total > 0 && !naVisaoExcluidos && (
        // No celular o kanban tem as abas com contagem; a faixa fica para a lista.
        <div className={visao === "kanban" ? "hidden lg:block" : undefined}>
          <FaixaEstagios contagens={contagens} selecionado={estagioSel} onSelecionar={selecionarEstagio} />
          {visao === "lista" && completo && estagioSel && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-texto-2">
              <span aria-hidden className={`w-2 h-2 rounded-full ${COR_ESTAGIO[estagioSel].ponto}`} />
              A lista mostra todos os leads do estágio, não só os últimos 30 dias.
            </p>
          )}
        </div>
      )}

      {conteudo}

      <button
        type="button"
        onClick={() => setNovoLead(true)}
        hidden={naVisaoExcluidos}
        className={`lg:hidden fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 inline-flex items-center gap-2 h-14 pl-4 pr-5 rounded-full bg-brand-700 text-white text-sm font-bold shadow-[var(--shadow-pop)] ${FOCO}`}
      >
        <Plus className="w-5 h-5" aria-hidden />
        Novo lead
      </button>

      {menu && (
        <MenuEstagio
          lead={menu.lead}
          ancora={menu.ancora}
          aberto
          onFechar={() => setMenu(null)}
          onEscolher={(d) => escolher(menu.lead, d)}
          onExcluir={(l) => {
            prepararFocoAposSumir(l.id);
            return excluir(l);
          }}
        />
      )}

      <LeadPainel
        lead={leadAberto}
        agora={agora}
        aberto={!!leadAberto}
        focoAoFechar={gatilho}
        onFechar={fecharPainel}
        onEscolherEstagio={escolher}
        onAbrirLead={(id) => abrir(id, gatilho)}
        temperaturaPendente={!!leadAberto && temperaturaPendente === leadAberto.id}
        onDefinirTemperatura={marcarTemperatura}
        onExcluindo={prepararFocoAposSumir}
        onExcluir={excluir}
        onRestaurar={restaurar}
      />

      <DialogoPerda
        aberto={!!perda}
        lead={perda}
        enviando={enviandoPerda}
        onCancelar={() => setPerda(null)}
        onConfirmar={confirmarPerda}
      />

      <DialogoNovoLead
        aberto={novoLead}
        onFechar={() => setNovoLead(false)}
        onCriado={(id) => {
          setNovoLead(false);
          setGatilho(null);
          trocarQuery((p) => p.set("lead", id));
        }}
        onAbrirLead={(id) => {
          setNovoLead(false);
          abrir(id, null);
        }}
      />
    </div>
  );
}
