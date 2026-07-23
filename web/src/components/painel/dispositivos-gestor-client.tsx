"use client";

import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Smartphone,
  Star,
  BadgeDollarSign,
  Ban,
  Lock,
  Unlock,
  MoreVertical,
  Pencil,
  Check,
  X,
  Clock,
  History,
  ShieldCheck,
} from "lucide-react";
import {
  liberar,
  promoverIncluso,
  revogar,
  bloquear,
  desbloquear,
  editarApelido,
  type Resultado,
} from "@/app/painel/dispositivos/actions";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Input, Select } from "@/components/ui/campos";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import {
  calcularPosMenu,
  estiloMenu,
  useFecharAoRolar,
  type MenuPos,
} from "@/components/ui/menu-flutuante";
import { tempoRelativo, formatarDataHora } from "@/lib/format-data";

// ─────────────────────────────────────────────────────────── Tipos (props) ──
export type DispAtivo = {
  id: string;
  apelido: string | null;
  fabricante: string | null;
  modelo: string | null;
  codigoPareamento: string | null;
  appVersao: string | null;
  ultimoAcesso: string | null;
  licenca: string;
  valorMensal: number;
};

export type PatioAtivo = {
  id: string;
  nome: string;
  temIncluso: boolean;
  ativos: number;
  extrasPagos: number;
  valorExtra: number;
  dispositivos: DispAtivo[];
};

export type Pendente = {
  id: string;
  patioId: string;
  patioNome: string;
  codigoPareamento: string | null;
  apelido: string | null;
  fabricante: string | null;
  modelo: string | null;
  temIncluso: boolean;
  ultimaTentativa: string;
  expirado: boolean;
};

export type HistItem = {
  id: string;
  criadoEm: string;
  evento: string;
  motivo: string | null;
  patioNome: string;
  codigoPareamento: string | null;
  operador: string | null;
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const EVENTOS: Record<string, { rotulo: string; cls: string }> = {
  login_ok: { rotulo: "Login", cls: "bg-brand-50 text-brand-700 border-brand-200" },
  login_negado: { rotulo: "Login negado", cls: "bg-perigo-bg text-perigo border-perigo/20" },
  vinculado: { rotulo: "Vinculado", cls: "bg-brand-50 text-brand-700 border-brand-200" },
  licenciado: { rotulo: "Licenciado", cls: "bg-aviso-bg text-aviso border-aviso/25" },
  revogado: { rotulo: "Revogado", cls: "bg-fundo text-texto-3 border-borda" },
  bloqueado: { rotulo: "Bloqueado", cls: "bg-perigo-bg text-perigo border-perigo/20" },
  desbloqueado: { rotulo: "Desbloqueado", cls: "bg-brand-50 text-brand-700 border-brand-200" },
  reidentificado: { rotulo: "Reidentificado", cls: "bg-info-bg text-info border-info/25" },
};

const MOTIVOS: Record<string, string> = {
  limite_atingido: "Limite de dispositivos atingido",
  limite_pendentes: "Fila de pendentes cheia",
  bloqueado: "Dispositivo bloqueado",
  revogado: "Dispositivo revogado",
  assinatura_bloqueada: "Assinatura bloqueada",
  pendente_aprovacao: "Aguardando aprovação",
};

function LicencaBadge({ licenca, valorMensal }: { licenca: string; valorMensal: number }) {
  if (licenca === "licenciado") {
    return (
      <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border bg-aviso-bg text-aviso border-aviso/25">
        {moeda.format(valorMensal)}/mês
      </span>
    );
  }
  if (licenca === "cortesia") {
    return (
      <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border bg-info-bg text-info border-info/25">
        Cortesia
      </span>
    );
  }
  if (licenca === "incluso") {
    return (
      <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border bg-fundo text-texto-2 border-borda">
        Incluso
      </span>
    );
  }
  return <span className="text-texto-3 text-[11px]">—</span>;
}

// ───────────────────────────────────────────────────────────────── Raiz ──
export function DispositivosGestorClient({
  patiosAtivos,
  pendentes,
  historico,
  patiosLista,
  valorExtra,
  competenciaSeguinte,
}: {
  patiosAtivos: PatioAtivo[];
  pendentes: Pendente[];
  historico: HistItem[];
  patiosLista: { id: string; nome: string }[];
  valorExtra: number;
  competenciaSeguinte: string;
}) {
  const pendentesAtivos = useMemo(() => pendentes.filter((p) => !p.expirado), [pendentes]);
  const [aba, setAba] = useState<"ativos" | "pendentes" | "historico">(
    pendentesAtivos.length > 0 ? "pendentes" : "ativos",
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-[26px] font-black tracking-tight">Dispositivos</h1>
        <p className="text-sm text-texto-2">
          Aparelhos que operam nos seus pátios. Cada pátio inclui <b>1 dispositivo</b>; os
          adicionais custam {moeda.format(valorExtra)}/mês.
        </p>
      </motion.header>

      <div className="flex gap-1 border-b border-borda">
        <Aba ativo={aba === "ativos"} onClick={() => setAba("ativos")}>
          Ativos
        </Aba>
        <Aba ativo={aba === "pendentes"} onClick={() => setAba("pendentes")}>
          Pendentes
          {pendentesAtivos.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-aviso text-white text-[11px] font-black">
              {pendentesAtivos.length}
            </span>
          )}
        </Aba>
        <Aba ativo={aba === "historico"} onClick={() => setAba("historico")}>
          Histórico
        </Aba>
      </div>

      {aba === "ativos" && <SecaoAtivos patios={patiosAtivos} />}
      {aba === "pendentes" && (
        <SecaoPendentes pendentes={pendentes} valorExtra={valorExtra} competencia={competenciaSeguinte} />
      )}
      {aba === "historico" && <SecaoHistorico historico={historico} patios={patiosLista} />}
    </div>
  );
}

function Aba({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2.5 text-sm font-bold transition-colors ${
        ativo ? "text-brand-700" : "text-texto-3 hover:text-texto-2"
      }`}
    >
      <span className="inline-flex items-center">{children}</span>
      {ativo && (
        <motion.span layoutId="aba-disp" className="absolute left-0 right-0 -bottom-px h-0.5 bg-brand-600 rounded-full" />
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────── Ativos ──
function SecaoAtivos({ patios }: { patios: PatioAtivo[] }) {
  if (patios.length === 0) return <Vazio texto="Nenhum dispositivo ativo ainda." />;
  return (
    <div className="space-y-5">
      {patios.map((p) => (
        <motion.section
          key={p.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-superficie border border-borda rounded-2xl overflow-hidden shadow-[var(--shadow-card)]"
        >
          <div className="px-5 py-3.5 border-b border-borda">
            <div className="font-extrabold">{p.nome}</div>
            <div className="text-[12px] text-texto-2">
              {p.ativos} de 1 {p.ativos === 1 ? "dispositivo" : "dispositivos"}
              {p.extrasPagos > 0 && (
                <>
                  {" · "}
                  <b>{p.extrasPagos}</b> {p.extrasPagos === 1 ? "extra pago" : "extras pagos"}
                </>
              )}
            </div>
            {p.ativos === 1 && p.temIncluso && (
              <div className="mt-1 text-[12px] text-texto-3">
                Slot gratuito em uso · aparelhos adicionais custam {moeda.format(p.valorExtra)}/mês
              </div>
            )}
          </div>
          <ResponsiveTable>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                  <th className="px-4 py-2 font-bold">Dispositivo</th>
                  <th className="px-4 py-2 font-bold hidden md:table-cell">Código</th>
                  <th className="px-4 py-2 font-bold hidden lg:table-cell">App</th>
                  <th className="px-4 py-2 font-bold">Slot</th>
                  <th className="px-4 py-2 font-bold hidden md:table-cell">Visto</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {p.dispositivos.map((d) => (
                  <LinhaAtivo key={d.id} d={d} slotLivre={!p.temIncluso} />
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        </motion.section>
      ))}
    </div>
  );
}

function LinhaAtivo({ d, slotLivre }: { d: DispAtivo; slotLivre: boolean }) {
  const podePromover = slotLivre && d.licenca !== "incluso";
  return (
    <tr className="border-t border-borda hover:bg-brand-50/30 transition-colors">
      <td className="px-4 py-2.5">
        <ApelidoEditor id={d.id} apelido={d.apelido} />
        <div className="text-[11px] text-texto-3">
          {[d.fabricante, d.modelo].filter(Boolean).join(" ") || "aparelho não identificado"}
        </div>
      </td>
      <td className="px-4 py-2.5 hidden md:table-cell">
        <span className="font-mono font-black tracking-wider text-brand-700">{d.codigoPareamento ?? "—"}</span>
      </td>
      <td className="px-4 py-2.5 text-texto-3 hidden lg:table-cell whitespace-nowrap">
        {d.appVersao ? `v${d.appVersao}` : "—"}
      </td>
      <td className="px-4 py-2.5">
        <LicencaBadge licenca={d.licenca} valorMensal={d.valorMensal} />
      </td>
      <td className="px-4 py-2.5 text-texto-3 hidden md:table-cell whitespace-nowrap">
        {d.ultimoAcesso ? `visto ${tempoRelativo(d.ultimoAcesso)}` : "—"}
      </td>
      <td className="px-4 py-2.5 text-right">
        <MenuAcoes id={d.id} licenca={d.licenca} status="ativo" podePromover={podePromover} />
      </td>
    </tr>
  );
}

function ApelidoEditor({ id, apelido }: { id: string; apelido: string | null }) {
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(apelido ?? "");
  const [, comecar] = useTransition();

  function salvar() {
    comecar(async () => {
      const r = await editarApelido(id, valor);
      if (r?.ok) {
        toast.sucesso(r.msg);
        setEditando(false);
      } else {
        toast.erro(r?.msg ?? "Erro inesperado.");
      }
    });
  }

  if (editando) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-40">
          <Input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Guarita 1"
            maxLength={60}
            autoFocus
            aria-label="Apelido do dispositivo"
            className="!h-8"
          />
        </div>
        <button onClick={salvar} aria-label="Salvar apelido" className="w-8 h-8 rounded-lg bg-brand-600 text-white grid place-items-center hover:brightness-110">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={() => setEditando(false)} aria-label="Cancelar" className="w-8 h-8 rounded-lg border border-borda grid place-items-center text-texto-3">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditando(true)}
      className="inline-flex items-center gap-1.5 font-bold hover:text-brand-700 transition-colors group"
      title="Editar apelido"
    >
      {apelido || <span className="text-texto-3 font-semibold">Sem apelido</span>}
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60" />
    </button>
  );
}

// ───────────────────────────────────────────────────────────── Pendentes ──
function SecaoPendentes({
  pendentes,
  valorExtra,
  competencia,
}: {
  pendentes: Pendente[];
  valorExtra: number;
  competencia: string;
}) {
  if (pendentes.length === 0) return <Vazio texto="Nenhum dispositivo aguardando liberação." />;
  return (
    <div className="space-y-3">
      {pendentes.map((p) => (
        <CardPendente key={p.id} p={p} valorExtra={valorExtra} competencia={competencia} />
      ))}
    </div>
  );
}

function CardPendente({ p, valorExtra, competencia }: { p: Pendente; valorExtra: number; competencia: string }) {
  const toast = useToast();
  const [, comecar] = useTransition();
  const [modal, setModal] = useState<null | "liberar" | "revogar">(null);

  function agir(fn: () => Promise<Resultado>) {
    comecar(async () => {
      const r = await fn();
      if (r?.ok) toast.sucesso(r.msg);
      else toast.erro(r?.msg ?? "Erro inesperado.");
    });
  }

  const podePromover = !p.temIncluso;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-superficie border rounded-2xl p-4 shadow-[var(--shadow-card)] ${
        p.expirado ? "border-borda opacity-60" : "border-aviso/30"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-11 h-11 rounded-xl bg-aviso-bg grid place-items-center shrink-0">
            <Smartphone className="w-5 h-5 text-aviso" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-lg tracking-[0.15em] text-brand-700">
                {p.codigoPareamento ?? "—"}
              </span>
              <span className="text-[11px] text-texto-3">código de pareamento</span>
            </div>
            <div className="text-[12px] text-texto-2">
              {p.patioNome} · {[p.fabricante, p.modelo].filter(Boolean).join(" ") || "aparelho não identificado"}
            </div>
            <div className="text-[11px] text-texto-3 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {p.expirado ? (
                <span className="text-texto-3">expirado — o operador precisa tentar novamente</span>
              ) : (
                <>tentou {tempoRelativo(p.ultimaTentativa)}</>
              )}
            </div>
          </div>
        </div>

        {!p.expirado && (
          <div className="flex flex-wrap items-center gap-2">
            {podePromover && (
              <Botao type="button" onClick={() => agir(() => promoverIncluso(p.id))} className="!h-9 !px-3.5">
                <Star className="w-4 h-4" />
                Promover para incluso (grátis)
              </Botao>
            )}
            <Botao
              type="button"
              variante={podePromover ? "fantasma" : "primario"}
              onClick={() => setModal("liberar")}
              className="!h-9 !px-3.5"
            >
              <BadgeDollarSign className="w-4 h-4" />
              Liberar ({moeda.format(valorExtra)}/mês)
            </Botao>
            <button
              onClick={() => setModal("revogar")}
              className="h-9 px-3 rounded-xl border border-borda text-sm font-bold text-texto-2 hover:text-perigo hover:border-perigo/30 transition-colors"
            >
              Recusar
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal === "liberar" && (
          <ConfirmModal
            titulo="Liberar dispositivo?"
            confirmar="Liberar e cobrar"
            variante="primario"
            onFechar={() => setModal(null)}
            onConfirmar={() => {
              setModal(null);
              agir(() => liberar(p.id));
            }}
          >
            <p>
              Este dispositivo passará a operar no <b>{p.patioNome}</b>.
            </p>
            <p className="mt-2">
              Sua fatura passa a incluir <b>{moeda.format(valorExtra)}/mês</b> a partir de{" "}
              <b className="capitalize">{competencia}</b>. A fatura do mês atual não é alterada.
            </p>
          </ConfirmModal>
        )}
        {modal === "revogar" && (
          <ConfirmModal
            titulo="Recusar dispositivo?"
            confirmar="Recusar"
            variante="perigo"
            onFechar={() => setModal(null)}
            onConfirmar={() => {
              setModal(null);
              agir(() => revogar(p.id));
            }}
          >
            <p>
              O aparelho {p.codigoPareamento ? <b className="font-mono">{p.codigoPareamento}</b> : null} perderá o
              acesso a este pátio. É <b>irreversível</b> — para voltar, o operador precisará tentar de novo e você
              liberar outra vez.
            </p>
          </ConfirmModal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ───────────────────────────────────────────────────────────── Histórico ──
function SecaoHistorico({ historico, patios }: { historico: HistItem[]; patios: { id: string; nome: string }[] }) {
  const [patio, setPatio] = useState("");
  const [evento, setEvento] = useState("");
  const [pagina, setPagina] = useState(0);
  const POR_PAGINA = 25;

  const filtrado = useMemo(() => {
    return historico
      .filter((h) => !patio || h.patioNome === patios.find((p) => p.id === patio)?.nome)
      .filter((h) => !evento || h.evento === evento);
  }, [historico, patio, evento, patios]);

  const total = filtrado.length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pag = Math.min(pagina, paginas - 1);
  const visiveis = filtrado.slice(pag * POR_PAGINA, pag * POR_PAGINA + POR_PAGINA);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={patio} onChange={(e) => { setPatio(e.target.value); setPagina(0); }} className="max-w-52">
          <option value="">Todos os pátios</option>
          {patios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>
        <Select value={evento} onChange={(e) => { setEvento(e.target.value); setPagina(0); }} className="max-w-52">
          <option value="">Todos os eventos</option>
          {Object.entries(EVENTOS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.rotulo}
            </option>
          ))}
        </Select>
        <span className="text-[12px] text-texto-3 flex items-center gap-1">
          <History className="w-3.5 h-3.5" />
          {total} {total === 1 ? "evento" : "eventos"} (90 dias)
        </span>
      </div>

      {total === 0 ? (
        <Vazio texto="Nenhum evento no período. O heartbeat não gera registros aqui — só logins e mudanças de estado." />
      ) : (
        <>
          <div className="bg-superficie border border-borda rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
            <ResponsiveTable>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                    <th className="px-4 py-2.5 font-bold">Evento</th>
                    <th className="px-4 py-2.5 font-bold hidden md:table-cell">Pátio · Código</th>
                    <th className="px-4 py-2.5 font-bold hidden lg:table-cell">Operador</th>
                    <th className="px-4 py-2.5 font-bold text-right">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((h) => {
                    const ev = EVENTOS[h.evento] ?? { rotulo: h.evento, cls: "bg-fundo text-texto-3 border-borda" };
                    return (
                      <tr key={h.id} className="border-t border-borda">
                        <td className="px-4 py-2.5">
                          <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${ev.cls}`}>
                            {ev.rotulo}
                          </span>
                          {h.motivo && (
                            <div className="text-[11px] text-texto-3 mt-0.5">{MOTIVOS[h.motivo] ?? h.motivo}</div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          {h.patioNome}
                          {h.codigoPareamento && (
                            <span className="ml-2 font-mono font-bold text-brand-700">{h.codigoPareamento}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-texto-2 hidden lg:table-cell">{h.operador ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right text-texto-3 whitespace-nowrap">
                          {formatarDataHora(h.criadoEm)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ResponsiveTable>
          </div>
          {paginas > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPagina((n) => Math.max(0, n - 1))}
                disabled={pag === 0}
                className="h-9 px-3 rounded-lg border border-borda text-sm font-bold disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-texto-3">
                {pag + 1} / {paginas}
              </span>
              <button
                onClick={() => setPagina((n) => Math.min(paginas - 1, n + 1))}
                disabled={pag >= paginas - 1}
                className="h-9 px-3 rounded-lg border border-borda text-sm font-bold disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ───────────────────────────────────────────── Menu de ações (ativos) ──
function MenuAcoes({
  id,
  licenca,
  status,
  podePromover,
}: {
  id: string;
  licenca: string;
  status: string;
  podePromover: boolean;
}) {
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [modal, setModal] = useState<null | "revogar" | "bloquear">(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const [, comecar] = useTransition();

  useFecharAoRolar(menu, () => setMenu(false));

  function abrir() {
    if (menu) {
      setMenu(false);
      return;
    }
    setPos(calcularPosMenu(botaoRef.current));
    setMenu(true);
  }

  function agir(fn: () => Promise<Resultado>) {
    setMenu(false);
    comecar(async () => {
      const r = await fn();
      if (r?.ok) toast.sucesso(r.msg);
      else toast.erro(r?.msg ?? "Erro inesperado.");
    });
  }

  return (
    <div className="inline-block">
      <button
        ref={botaoRef}
        onClick={abrir}
        aria-label="Ações do dispositivo"
        className="toque-44 w-8 h-8 rounded-lg grid place-items-center text-texto-3 hover:text-texto hover:bg-fundo transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {menu && pos && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setMenu(false)} />
            <motion.div
              initial={{ opacity: 0, y: pos.bottom != null ? 6 : -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: pos.bottom != null ? 6 : -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={estiloMenu(pos)}
              className="fixed z-[61] w-56 rounded-xl bg-superficie border border-borda shadow-[var(--shadow-pop)] p-1.5 text-left"
            >
              {podePromover && (
                <ItemMenu destaque onClick={() => agir(() => promoverIncluso(id))}>
                  <Star className="w-4 h-4 text-brand-600" />
                  Promover para incluso (grátis)
                </ItemMenu>
              )}
              {status === "bloqueado" ? (
                <ItemMenu onClick={() => agir(() => desbloquear(id))}>
                  <Unlock className="w-4 h-4 text-brand-600" />
                  Desbloquear
                </ItemMenu>
              ) : (
                <ItemMenu
                  onClick={() => {
                    setMenu(false);
                    setModal("bloquear");
                  }}
                >
                  <Lock className="w-4 h-4 text-texto-2" />
                  Bloquear
                </ItemMenu>
              )}
              <div className="h-px bg-borda my-1" />
              <ItemMenu
                perigo
                onClick={() => {
                  setMenu(false);
                  setModal("revogar");
                }}
              >
                <Ban className="w-4 h-4" />
                Revogar
              </ItemMenu>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal === "bloquear" && (
          <ConfirmModal
            titulo="Bloquear dispositivo?"
            confirmar="Bloquear"
            variante="primario"
            onFechar={() => setModal(null)}
            onConfirmar={() => {
              setModal(null);
              agir(() => bloquear(id));
            }}
          >
            <p>O aparelho para de operar, mas mantém o slot.</p>
            {licenca === "licenciado" && (
              <p className="mt-2 text-aviso font-semibold">
                Atenção: bloquear <b>não interrompe a cobrança</b> deste dispositivo licenciado. Para parar de
                cobrar, use <b>Revogar</b>.
              </p>
            )}
          </ConfirmModal>
        )}
        {modal === "revogar" && (
          <ConfirmModal
            titulo="Revogar dispositivo?"
            confirmar="Revogar"
            variante="perigo"
            onFechar={() => setModal(null)}
            onConfirmar={() => {
              setModal(null);
              agir(() => revogar(id));
            }}
          >
            <p>
              Esta ação é <b>irreversível</b>. O dispositivo perde o acesso, para de cobrar e libera o slot.
            </p>
            {licenca === "incluso" && (
              <p className="mt-2 text-texto-2">
                Este é o <b>dispositivo incluso</b> do pátio: o slot gratuito ficará vago e outro aparelho poderá
                ocupá-lo.
              </p>
            )}
          </ConfirmModal>
        )}
      </AnimatePresence>
    </div>
  );
}

function ItemMenu({
  children,
  onClick,
  perigo = false,
  destaque = false,
}: {
  children: ReactNode;
  onClick: () => void;
  perigo?: boolean;
  destaque?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-sm font-semibold transition-colors ${
        perigo
          ? "text-perigo hover:bg-perigo-bg"
          : destaque
            ? "text-brand-700 bg-brand-50/60 hover:bg-brand-50"
            : "text-texto-2 hover:bg-fundo hover:text-texto"
      }`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────── Modal de confirmação ──
function ConfirmModal({
  titulo,
  children,
  confirmar,
  variante,
  onFechar,
  onConfirmar,
}: {
  titulo: string;
  children: ReactNode;
  confirmar: string;
  variante: "primario" | "perigo";
  onFechar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] grid place-items-center p-4 bg-noite/50 backdrop-blur-sm"
      onClick={onFechar}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-superficie shadow-[var(--shadow-pop)] p-6 text-left"
      >
        <div
          className={`w-11 h-11 rounded-xl grid place-items-center mb-3 ${
            variante === "perigo" ? "bg-perigo-bg" : "bg-brand-50"
          }`}
        >
          {variante === "perigo" ? (
            <Ban className="w-5 h-5 text-perigo" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-brand-600" />
          )}
        </div>
        <h3 className="text-lg font-extrabold">{titulo}</h3>
        <div className="mt-1.5 text-sm text-texto-2">{children}</div>
        <div className="mt-5 flex gap-2 justify-end">
          <Botao variante="fantasma" type="button" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao variante={variante} type="button" onClick={onConfirmar}>
            {confirmar}
          </Botao>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="bg-superficie border border-borda rounded-2xl px-5 py-14 flex flex-col items-center gap-3 text-center">
      <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
        <Smartphone className="w-6 h-6 text-brand-600" />
      </span>
      <p className="text-sm text-texto-3 max-w-sm">{texto}</p>
    </div>
  );
}
