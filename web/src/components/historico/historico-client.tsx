"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, History, ChevronRight, Building2 } from "lucide-react";
import { formatarDataHora } from "@/lib/format-data";

export type AuditRow = {
  id: string;
  criado_em: string;
  usuario_nome: string | null;
  usuario_email: string | null;
  modulo: string;
  acao: string;
  descricao: string;
  dados: Record<string, unknown> | null;
  patio_id: string | null;
};

type Filtros = { modulo: string; di: string; df: string; q: string };

const MODULOS: Record<string, { label: string; cls: string }> = {
  operacao: { label: "Operação", cls: "bg-aviso-bg text-aviso border-aviso/25" },
  tarifas: { label: "Tarifas", cls: "bg-brand-50 text-brand-700 border-brand-200" },
  operadores: { label: "Operadores", cls: "bg-info-bg text-info border-info/20" },
  mensalistas: {
    label: "Mensalistas",
    cls: "bg-violeta/10 text-violeta border-violeta/20",
  },
  config: { label: "Configurações", cls: "bg-fundo text-texto-2 border-borda" },
  "tipos-veiculo": {
    label: "Tipos de veículo",
    cls: "bg-saida-bg text-saida border-saida/20",
  },
  patios: { label: "Pátios", cls: "bg-perigo-bg text-perigo border-perigo/20" },
};

function isoToYmd(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function inicioDiaIso(dia: string): string {
  return dia ? new Date(`${dia}T00:00:00`).toISOString() : "";
}
function fimDiaIso(dia: string): string {
  return dia ? new Date(`${dia}T23:59:59.999`).toISOString() : "";
}

export function HistoricoClient({
  linhas,
  total,
  pagina,
  pageSize,
  patios,
  filtros,
}: {
  linhas: AuditRow[];
  total: number;
  pagina: number;
  pageSize: number;
  patios: Record<string, string>;
  filtros: Filtros;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busca, setBusca] = useState(filtros.q);
  const [inicio, setInicio] = useState(isoToYmd(filtros.di));
  const [fim, setFim] = useState(isoToYmd(filtros.df));
  const [aberta, setAberta] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  function aplicar(mud: Partial<Filtros & { p: number }>) {
    const f = {
      modulo: mud.modulo ?? filtros.modulo,
      di: mud.di ?? inicioDiaIso(inicio),
      df: mud.df ?? fimDiaIso(fim),
      q: mud.q ?? busca,
    };
    const params = new URLSearchParams();
    if (f.modulo) params.set("modulo", f.modulo);
    if (f.di) params.set("di", f.di);
    if (f.df) params.set("df", f.df);
    if (f.q.trim()) params.set("q", f.q.trim());
    // Qualquer mudança de filtro volta para a página 1.
    if (mud.p && mud.p > 1) params.set("p", String(mud.p));
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (busca === filtros.q) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => aplicar({ q: busca }), 350);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const temFiltro = Boolean(
    filtros.modulo || filtros.di || filtros.df || filtros.q,
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[26px] font-black tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-brand-600" />
          Histórico de alterações
        </h1>
        <p className="text-sm text-texto-2">
          Toda alteração feita no painel da rede · {total}
          {temFiltro ? " no filtro" : " no total"}
        </p>
      </motion.header>

      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-3 flex flex-wrap items-center gap-2"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-texto-3" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar na descrição…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-borda bg-fundo text-sm font-semibold placeholder:font-normal placeholder:text-texto-3 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
          />
        </div>

        <select
          value={filtros.modulo}
          onChange={(e) => aplicar({ modulo: e.target.value })}
          className="h-10 px-3 rounded-xl border border-borda bg-fundo text-sm font-semibold focus:outline-none focus:border-brand-400"
        >
          <option value="">Todos os módulos</option>
          {Object.entries(MODULOS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={inicio}
          max={fim || undefined}
          onChange={(e) => {
            setInicio(e.target.value);
            aplicar({ di: inicioDiaIso(e.target.value) });
          }}
          aria-label="De"
          className="h-10 px-3 rounded-xl border border-borda bg-fundo text-sm font-semibold focus:outline-none focus:border-brand-400"
        />
        <span className="text-texto-3 text-sm">até</span>
        <input
          type="date"
          value={fim}
          min={inicio || undefined}
          onChange={(e) => {
            setFim(e.target.value);
            aplicar({ df: fimDiaIso(e.target.value) });
          }}
          aria-label="Até"
          className="h-10 px-3 rounded-xl border border-borda bg-fundo text-sm font-semibold focus:outline-none focus:border-brand-400"
        />

        {temFiltro && (
          <button
            onClick={() => {
              setBusca("");
              setInicio("");
              setFim("");
              router.replace(pathname);
            }}
            className="h-10 px-3 rounded-xl border border-borda bg-fundo text-sm font-semibold text-texto-2 hover:text-texto hover:border-brand-300 transition-colors"
          >
            Limpar
          </button>
        )}
      </motion.div>

      {/* Lista */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
      >
        {linhas.length === 0 ? (
          <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
            <span className="w-12 h-12 rounded-2xl bg-fundo grid place-items-center">
              <History className="w-6 h-6 text-texto-3" />
            </span>
            <p className="text-sm text-texto-3 max-w-[340px]">
              {temFiltro
                ? "Nenhuma alteração com esses filtros."
                : "Nenhuma alteração registrada ainda. As mudanças feitas no painel aparecem aqui."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-borda">
            {linhas.map((l) => {
              const mod = MODULOS[l.modulo] ?? {
                label: l.modulo,
                cls: "bg-fundo text-texto-2 border-borda",
              };
              const temDados = l.dados && Object.keys(l.dados).length > 0;
              const expandida = aberta === l.id;
              return (
                <div key={l.id}>
                  <button
                    onClick={() =>
                      temDados ? setAberta(expandida ? null : l.id) : undefined
                    }
                    className={`w-full text-left px-5 py-3.5 flex items-start gap-3 transition-colors ${
                      temDados ? "hover:bg-brand-50/40 cursor-pointer" : "cursor-default"
                    }`}
                  >
                    {temDados ? (
                      <ChevronRight
                        className={`w-4 h-4 mt-0.5 shrink-0 text-texto-3 transition-transform ${expandida ? "rotate-90" : ""}`}
                      />
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${mod.cls}`}
                        >
                          {mod.label}
                        </span>
                        {l.patio_id && patios[l.patio_id] && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-texto-3">
                            <Building2 className="w-3 h-3" />
                            {patios[l.patio_id]}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-texto mt-1 leading-snug">
                        {l.descricao}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-xs font-semibold text-texto-2 tabular-nums whitespace-nowrap">
                        {formatarDataHora(l.criado_em)}
                      </div>
                      <div className="text-[11px] text-texto-2 truncate max-w-[200px]">
                        {l.usuario_nome ?? l.usuario_email ?? "—"}
                      </div>
                      {l.usuario_email && l.usuario_nome && (
                        <div className="text-[10px] text-texto-3 truncate max-w-[200px]">
                          {l.usuario_email}
                        </div>
                      )}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandida && temDados && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 pl-12">
                          <DadosView dados={l.dados as Record<string, unknown>} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-texto-3">
            Página {pagina} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagina <= 1}
              onClick={() => aplicar({ p: pagina - 1 })}
              className="h-10 px-4 rounded-xl border border-borda bg-superficie text-sm font-semibold text-texto-2 hover:border-brand-300 hover:text-brand-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Anterior
            </button>
            <button
              disabled={pagina >= totalPaginas}
              onClick={() => aplicar({ p: pagina + 1 })}
              className="h-10 px-4 rounded-xl border border-borda bg-superficie text-sm font-semibold text-texto-2 hover:border-brand-300 hover:text-brand-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Renderiza o jsonb `dados` de forma legível: diff antes→depois ou lista. */
function DadosView({ dados }: { dados: Record<string, unknown> }) {
  const fmt = (v: unknown): string => {
    if (v === null || v === undefined || v === "") return "—";
    if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  if ("antes" in dados && "depois" in dados) {
    const antes = (dados.antes ?? {}) as Record<string, unknown>;
    const depois = (dados.depois ?? {}) as Record<string, unknown>;
    const chaves = Array.from(
      new Set([...Object.keys(antes), ...Object.keys(depois)]),
    );
    if (chaves.length === 0) {
      return (
        <p className="text-xs text-texto-3 italic">Sem alteração de valores.</p>
      );
    }
    return (
      <div className="rounded-xl border border-borda bg-fundo/50 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-texto-3">
              <th className="px-3 py-2 font-bold">Campo</th>
              <th className="px-3 py-2 font-bold">Antes</th>
              <th className="px-3 py-2 font-bold">Depois</th>
            </tr>
          </thead>
          <tbody>
            {chaves.map((k) => (
              <tr key={k} className="border-t border-borda">
                <td className="px-3 py-1.5 font-semibold text-texto-2">{k}</td>
                <td className="px-3 py-1.5 text-texto-3">{fmt(antes[k])}</td>
                <td className="px-3 py-1.5 text-texto font-medium">
                  {fmt(depois[k])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-borda bg-fundo/50 p-3 space-y-1">
      {Object.entries(dados).map(([k, v]) => (
        <div key={k} className="flex gap-2 text-xs">
          <span className="font-semibold text-texto-2 shrink-0">{k}:</span>
          <span className="text-texto-3 break-all">{fmt(v)}</span>
        </div>
      ))}
    </div>
  );
}
