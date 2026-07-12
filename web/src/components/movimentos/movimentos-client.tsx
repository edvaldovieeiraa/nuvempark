"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Inbox, X, Camera, AlertTriangle, Loader2 } from "lucide-react";
import { SyncBadge } from "@/components/sync-badge";
import {
  detalheTicket,
  type DetalheTicket,
} from "@/app/painel/movimentos/actions";

type Ticket = {
  id: string;
  placa: string;
  tipo_veiculo: string;
  status: string;
  entrada: string;
  saida: string | null;
  valor_cobrado: number | null;
  forma_pagamento: string | null;
  motivo_isencao: string | null;
  origem: string;
  foto_entrada_path: string | null;
};
type Filtros = { q: string; status: string; periodo: string };

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const PERIODOS = [
  { valor: "hoje", rotulo: "Hoje" },
  { valor: "7d", rotulo: "7 dias" },
  { valor: "30d", rotulo: "30 dias" },
  { valor: "tudo", rotulo: "Tudo" },
];

export function MovimentosClient({
  tickets,
  total,
  patioNome,
  patioId,
  sincronizadoEm,
  filtros,
}: {
  tickets: Ticket[];
  total: number;
  patioNome: string;
  patioId: string;
  sincronizadoEm: string | null;
  filtros: Filtros;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busca, setBusca] = useState(filtros.q);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [detalhe, setDetalhe] = useState<{
    ticket: Ticket;
    dados: DetalheTicket | null;
  } | null>(null);
  const [carregando, comecar] = useTransition();

  function abrirDetalhe(t: Ticket) {
    setDetalhe({ ticket: t, dados: null });
    comecar(async () => {
      const dados = await detalheTicket(t.id, t.foto_entrada_path);
      setDetalhe({ ticket: t, dados });
    });
  }

  function aplicar(mudanca: Partial<Filtros>) {
    const f = { ...filtros, q: busca, ...mudanca };
    const params = new URLSearchParams();
    params.set("patio", patioId); // preserva o escopo do pátio
    if (f.q) params.set("q", f.q);
    if (f.status !== "todos") params.set("status", f.status);
    if (f.periodo !== "7d") params.set("periodo", f.periodo);
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (busca === filtros.q) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => aplicar({ q: busca }), 350);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const faturado = tickets
    .filter((t) => t.status === "fechado")
    .reduce((s, t) => s + (Number(t.valor_cobrado) || 0), 0);

  return (
    <div className="space-y-5 max-w-6xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-[26px] font-black tracking-tight">Movimentos</h1>
          <p className="text-sm text-texto-2">
            <b className="text-texto">{patioNome}</b> · {total}{" "}
            {total === 1 ? "ticket" : "tickets"} ·{" "}
            <b className="text-brand-700">{moeda.format(faturado)}</b> faturado
            {total > 100 && " · mostrando os 100 mais recentes"}
          </p>
        </div>
        <SyncBadge iso={sincronizadoEm} />
      </motion.header>

      {/* Barra de filtros */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-3 flex flex-wrap items-center gap-2"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-texto-3" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar placa…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-borda bg-fundo text-sm font-semibold tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-normal placeholder:text-texto-3 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
          />
        </div>

        <select
          value={filtros.status}
          onChange={(e) => aplicar({ status: e.target.value })}
          className="h-10 px-3 rounded-xl border border-borda bg-fundo text-sm font-semibold focus:outline-none focus:border-brand-400"
        >
          <option value="todos">Todos os status</option>
          <option value="aberto">No pátio</option>
          <option value="fechado">Fechados</option>
          <option value="cancelado">Cancelados</option>
        </select>

        <div className="flex rounded-xl bg-fundo border border-borda p-0.5">
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              onClick={() => aplicar({ periodo: p.valor })}
              className={`relative px-3.5 h-9 rounded-[10px] text-xs font-bold transition-colors ${
                filtros.periodo === p.valor
                  ? "text-white"
                  : "text-texto-2 hover:text-texto"
              }`}
            >
              {filtros.periodo === p.valor && (
                <motion.span
                  layoutId="periodo-ativo"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-[10px] bg-gradient-to-r from-brand-600 to-brand-500"
                />
              )}
              <span className="relative">{p.rotulo}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tabela */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
      >
        {tickets.length === 0 ? (
          <div className="px-5 py-14 flex flex-col items-center gap-3 text-center">
            <span className="w-12 h-12 rounded-2xl bg-fundo grid place-items-center">
              <Inbox className="w-6 h-6 text-texto-3" />
            </span>
            <p className="text-sm text-texto-3">
              Nenhum movimento com esses filtros.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-texto-3 uppercase tracking-wider">
                  <th className="px-5 py-3 font-bold">Placa</th>
                  <th className="px-5 py-3 font-bold">Entrada</th>
                  <th className="px-5 py-3 font-bold">Saída</th>
                  <th className="px-5 py-3 font-bold">Permanência</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Pagamento</th>
                  <th className="px-5 py-3 font-bold text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.4) }}
                    onClick={() => abrirDetalhe(t)}
                    className="border-t border-borda hover:bg-brand-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <span className="font-black tracking-widest text-[13px] bg-fundo border border-borda rounded-md px-2 py-1">
                        {t.placa}
                      </span>
                      {t.foto_entrada_path && (
                        <Camera className="inline-block ml-2 w-3.5 h-3.5 text-texto-3" />
                      )}
                      {t.origem === "plano" && (
                        <span className="ml-2 text-[10px] font-bold text-info bg-info-bg rounded-full px-2 py-0.5">
                          mensalista
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-texto-2 tabular-nums">
                      {dataHora(t.entrada)}
                    </td>
                    <td className="px-5 py-3 text-texto-2 tabular-nums">
                      {t.saida ? dataHora(t.saida) : "—"}
                    </td>
                    <td className="px-5 py-3 text-texto-2 tabular-nums">
                      {permanencia(t.entrada, t.saida)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusChip status={t.status} />
                    </td>
                    <td className="px-5 py-3 text-texto-2 capitalize">
                      {t.motivo_isencao
                        ? `isento (${t.motivo_isencao})`
                        : (t.forma_pagamento ?? "—").replace("_", " ")}
                    </td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums">
                      {t.valor_cobrado != null
                        ? moeda.format(Number(t.valor_cobrado))
                        : "—"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>

      <AnimatePresence>
        {detalhe && (
          <ModalDetalhe
            ticket={detalhe.ticket}
            dados={detalhe.dados}
            carregando={carregando}
            fechar={() => setDetalhe(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ModalDetalhe({
  ticket,
  dados,
  carregando,
  fechar,
}: {
  ticket: Ticket;
  dados: DetalheTicket | null;
  carregando: boolean;
  fechar: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] grid place-items-center p-4 bg-noite/50 backdrop-blur-sm"
      onClick={fechar}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-superficie shadow-[var(--shadow-pop)] p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-extrabold tracking-widest">
              {ticket.placa}
            </h3>
            <p className="text-xs text-texto-2 capitalize">
              {ticket.tipo_veiculo} · entrada {dataHora(ticket.entrada)}
            </p>
          </div>
          <button
            onClick={fechar}
            aria-label="Fechar"
            className="text-texto-3 hover:text-texto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {carregando ? (
          <div className="py-16 grid place-items-center text-texto-3">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Foto de entrada */}
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-texto-3 mb-2">
                Foto da entrada
              </p>
              {dados?.fotoEntrada ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dados.fotoEntrada}
                  alt={`Entrada ${ticket.placa}`}
                  className="w-full rounded-xl border border-borda"
                />
              ) : (
                <div className="rounded-xl border border-dashed border-borda py-8 grid place-items-center text-sm text-texto-3">
                  <Camera className="w-6 h-6 mb-1" />
                  Sem foto de entrada
                </div>
              )}
            </div>

            {/* Avarias */}
            {(dados?.avarias.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-saida mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Avarias registradas ({dados!.avarias.length})
                </p>
                <div className="space-y-3">
                  {dados!.avarias.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border border-saida/20 bg-saida-bg/40 p-3"
                    >
                      <p className="text-sm font-semibold text-texto">
                        {a.descricao}
                      </p>
                      {a.fotos.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {a.fotos.map((f, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <a
                              key={i}
                              href={f}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={f}
                                alt={`Avaria ${i + 1}`}
                                className="w-20 h-20 object-cover rounded-lg border border-borda hover:brightness-95"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function permanencia(entrada: string, saida: string | null) {
  const fim = saida ? new Date(saida).getTime() : Date.now();
  const min = Math.max(0, Math.round((fim - new Date(entrada).getTime()) / 60000));
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h${String(min % 60).padStart(2, "0")}`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function StatusChip({ status }: { status: string }) {
  const cfg =
    status === "aberto"
      ? { cls: "bg-brand-50 text-brand-700 border-brand-200", dot: "bg-brand-500", label: "no pátio" }
      : status === "fechado"
        ? { cls: "bg-fundo text-texto-2 border-borda", dot: "bg-texto-3", label: "saiu" }
        : status === "cancelado"
          ? { cls: "bg-perigo-bg text-perigo border-perigo/20", dot: "bg-perigo", label: "cancelado" }
          : { cls: "bg-saida-bg text-saida border-saida/20", dot: "bg-saida", label: status };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
