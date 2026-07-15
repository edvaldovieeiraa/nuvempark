"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Receipt,
  CheckCircle2,
  Mail,
  Zap,
  MoreVertical,
  RotateCcw,
  XCircle,
  ExternalLink,
  Building2,
  FileText,
} from "lucide-react";
import Link from "next/link";
import {
  marcarPaga,
  reabrirFatura,
  cancelarFatura,
  cobrarPorEmail,
  emitirCobrancaGateway,
  type Resultado,
} from "@/app/master/(console)/financeiro/actions";
import { useToast } from "@/components/ui/toast";
import {
  moeda,
  formatarCompetencia,
  diasEmAtraso,
  ESTADO_FATURA,
  type EstadoFatura,
} from "@/lib/financeiro";
import { formatarData } from "@/lib/format-data";

export type FaturaRow = {
  id: string;
  tenantId: string;
  rede: string;
  codigo: string;
  competencia: string;
  vencimento: string;
  valor: number;
  valorPorPatio: number;
  qtdPatios: number;
  estado: string;
  pagoEm: string | null;
  formaPagamento: string | null;
  temCobranca: boolean;
  linkPagamento: string | null;
  emailEnviadoEm: string | null;
  emailEnviadoPara: string | null;
};

type Filtro = "todas" | "aberta" | "vencida" | "paga";

const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: "todas", rotulo: "Todas" },
  { chave: "aberta", rotulo: "Abertas" },
  { chave: "vencida", rotulo: "Vencidas" },
  { chave: "paga", rotulo: "Pagas" },
];

export function FaturasClient({
  faturas,
  emailAtivo,
  gatewayAtivo,
}: {
  faturas: FaturaRow[];
  emailAtivo: boolean;
  gatewayAtivo: boolean;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return faturas.filter((f) => {
      if (filtro !== "todas" && f.estado !== filtro) return false;
      if (q && !f.rede.toLowerCase().includes(q) && !f.codigo.includes(q))
        return false;
      return true;
    });
  }, [faturas, filtro, busca]);

  // agrupa por competência
  const grupos = useMemo(() => {
    const m = new Map<string, FaturaRow[]>();
    for (const f of visiveis) {
      const arr = m.get(f.competencia) ?? [];
      arr.push(f);
      m.set(f.competencia, arr);
    }
    return [...m.entries()];
  }, [visiveis]);

  const contagem = (c: Filtro) =>
    c === "todas" ? faturas.length : faturas.filter((f) => f.estado === c).length;

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[26px] font-black tracking-tight">Faturas</h1>
        <p className="text-sm text-texto-2">
          {faturas.length} {faturas.length === 1 ? "fatura" : "faturas"} no total.
        </p>
      </motion.header>

      {!emailAtivo && !gatewayAtivo && (
        <div className="flex items-start gap-3 rounded-2xl border border-info/25 bg-info-bg px-4 py-3 text-sm text-info">
          <Zap className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            Modo manual. Você gera faturas e marca como pagas na mão. Para
            cobrança automática por e-mail e PIX/boleto, configure{" "}
            <b>RESEND_API_KEY</b> e <b>ASAAS_API_KEY</b> no servidor.
          </p>
        </div>
      )}

      {/* Filtros + busca */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-fundo border border-borda">
          {FILTROS.map((f) => (
            <button
              key={f.chave}
              onClick={() => setFiltro(f.chave)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all ${
                filtro === f.chave
                  ? "bg-superficie text-brand-700 shadow-sm"
                  : "text-texto-3 hover:text-texto-2"
              }`}
            >
              {f.rotulo}
              <span className="ml-1.5 text-xs opacity-60 tabular-nums">
                {contagem(f.chave)}
              </span>
            </button>
          ))}
        </div>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar rede ou código…"
          className="flex-1 min-w-[180px] h-10 px-3.5 rounded-xl border border-borda bg-superficie text-sm focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
        />
      </div>

      {grupos.length === 0 ? (
        <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] px-5 py-14 flex flex-col items-center gap-3 text-center">
          <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
            <Receipt className="w-6 h-6 text-brand-600" />
          </span>
          <p className="text-sm text-texto-3">
            Nenhuma fatura por aqui. Gere as do mês na tela do Financeiro.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map(([comp, itens]) => (
            <motion.section
              key={comp}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-borda flex items-center justify-between bg-fundo/40">
                <h2 className="text-sm font-black capitalize">
                  {formatarCompetencia(comp)}
                </h2>
                <span className="text-xs font-bold text-texto-3 tabular-nums">
                  {moeda.format(itens.reduce((s, f) => s + f.valor, 0))}
                </span>
              </div>
              <div>
                {itens.map((f) => (
                  <LinhaFatura
                    key={f.id}
                    f={f}
                    emailAtivo={emailAtivo}
                    gatewayAtivo={gatewayAtivo}
                  />
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      )}
    </div>
  );
}

function LinhaFatura({
  f,
  emailAtivo,
  gatewayAtivo,
}: {
  f: FaturaRow;
  emailAtivo: boolean;
  gatewayAtivo: boolean;
}) {
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [pendente, comecar] = useTransition();
  const est = ESTADO_FATURA[f.estado as EstadoFatura] ?? ESTADO_FATURA.aberta;
  const atraso = f.estado === "vencida" ? diasEmAtraso(f.vencimento) : 0;

  function agir(fn: () => Promise<Resultado>) {
    setMenu(false);
    comecar(async () => {
      const r = await fn();
      if (r?.ok) toast.sucesso(r.msg);
      else toast.erro(r?.msg ?? "Erro inesperado.");
    });
  }

  const venc = formatarData(f.vencimento);

  return (
    <div
      className={`px-5 py-3.5 border-t border-borda first:border-t-0 flex items-center gap-4 hover:bg-brand-50/30 transition-colors ${pendente ? "opacity-50" : ""}`}
    >
      <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-acento grid place-items-center text-white shrink-0">
        <Building2 className="w-4 h-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="font-bold truncate">{f.rede}</div>
        <div className="text-xs text-texto-3">
          {f.qtdPatios} {f.qtdPatios === 1 ? "pátio" : "pátios"} ·{" "}
          {moeda.format(f.valorPorPatio)}/pátio · vence {venc}
          {atraso > 0 && (
            <span className="text-perigo font-bold"> · {atraso}d em atraso</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="font-black tabular-nums">{moeda.format(f.valor)}</div>
        {f.emailEnviadoEm && (
          <div className="text-[10px] text-texto-3 flex items-center gap-1 justify-end">
            <Mail className="w-3 h-3" /> cobrado
          </div>
        )}
      </div>

      <span
        className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${est.cls}`}
      >
        {est.rotulo}
      </span>

      {/* Ação rápida: marcar pago */}
      {(f.estado === "aberta" || f.estado === "vencida") && (
        <button
          onClick={() => agir(() => marcarPaga(f.id))}
          disabled={pendente}
          title="Marcar como paga"
          className="shrink-0 h-9 px-3 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 font-bold text-xs inline-flex items-center gap-1.5 hover:bg-brand-100 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span className="hidden sm:inline">Pago</span>
        </button>
      )}

      {/* Menu de ações */}
      <div className="relative shrink-0">
        <button
          onClick={() => setMenu((m) => !m)}
          aria-label="Ações"
          className="toque-44 w-9 h-9 rounded-lg grid place-items-center text-texto-3 hover:text-texto hover:bg-fundo transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        <AnimatePresence>
          {menu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-11 z-50 w-56 rounded-xl bg-superficie border border-borda shadow-[var(--shadow-pop)] p-1.5"
              >
                {emailAtivo && f.estado !== "paga" && f.estado !== "cancelada" && (
                  <Item onClick={() => agir(() => cobrarPorEmail(f.id))}>
                    <Mail className="w-4 h-4 text-brand-600" />
                    Enviar cobrança por e-mail
                  </Item>
                )}
                {gatewayAtivo && !f.temCobranca && f.estado !== "paga" && (
                  <Item onClick={() => agir(() => emitirCobrancaGateway(f.id))}>
                    <Zap className="w-4 h-4 text-acento" />
                    Emitir PIX/boleto
                  </Item>
                )}
                {f.linkPagamento && (
                  <a
                    href={f.linkPagamento}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenu(false)}
                    className="w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-sm font-semibold text-texto-2 hover:bg-fundo hover:text-texto transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir link de pagamento
                  </a>
                )}
                {f.estado === "paga" && (
                  <>
                    <Link
                      href={`/master/recibo/${f.id}`}
                      target="_blank"
                      onClick={() => setMenu(false)}
                      className="w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-sm font-semibold text-texto-2 hover:bg-fundo hover:text-texto transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Recibo (imprimir/PDF)
                    </Link>
                    <Item onClick={() => agir(() => reabrirFatura(f.id))}>
                      <RotateCcw className="w-4 h-4" />
                      Reabrir (estornar baixa)
                    </Item>
                  </>
                )}
                {f.estado !== "cancelada" && f.estado !== "paga" && (
                  <>
                    <div className="h-px bg-borda my-1" />
                    <Item perigo onClick={() => agir(() => cancelarFatura(f.id))}>
                      <XCircle className="w-4 h-4" />
                      Cancelar fatura
                    </Item>
                  </>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Item({
  children,
  onClick,
  perigo = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  perigo?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-sm font-semibold transition-colors ${
        perigo
          ? "text-perigo hover:bg-perigo-bg"
          : "text-texto-2 hover:bg-fundo hover:text-texto"
      }`}
    >
      {children}
    </button>
  );
}
