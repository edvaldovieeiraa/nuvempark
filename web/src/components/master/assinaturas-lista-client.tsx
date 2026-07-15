"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CreditCard,
  Building2,
  Users,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Search,
} from "lucide-react";
import { moeda } from "@/lib/financeiro";
import { labelAssinaturaEstado } from "@/lib/status-labels";
import { formatarData } from "@/lib/format-data";

export type LinhaAssinatura = {
  tenantId: string;
  rede: string;
  codigo: string;
  estado: string;
  valorPorPatio: number;
  patiosAtivos: number;
  mensalidade: number;
  diaVencimento: number;
  temEmailCobranca: boolean;
  totalEmAberto: number;
  qtdVencidas: number;
  totalVencido: number;
  proximoVencimento: string | null;
};

const ESTADO_CLS: Record<string, string> = {
  trial: "bg-info-bg text-info border-info/25",
  ativa: "bg-brand-50 text-brand-700 border-brand-200",
  atrasada: "bg-aviso-bg text-aviso border-aviso/25",
  suspensa: "bg-perigo-bg text-perigo border-perigo/20",
  cancelada: "bg-fundo text-texto-3 border-borda",
};

type Filtro = "todas" | "ativa" | "atrasada" | "trial" | "suspensa";

const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: "todas", rotulo: "Todas" },
  { chave: "ativa", rotulo: "Ativas" },
  { chave: "atrasada", rotulo: "Em atraso" },
  { chave: "trial", rotulo: "Teste" },
  { chave: "suspensa", rotulo: "Suspensas" },
];

export function AssinaturasListaClient({
  assinaturas,
}: {
  assinaturas: LinhaAssinatura[];
}) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");

  const resumo = useMemo(() => {
    const ativas = assinaturas.filter((a) => a.estado === "ativa");
    const mrr = ativas.reduce((s, a) => s + a.mensalidade, 0);
    const emAtraso = assinaturas.filter((a) => a.totalVencido > 0);
    const totalVencido = emAtraso.reduce((s, a) => s + a.totalVencido, 0);
    return {
      total: assinaturas.length,
      ativas: ativas.length,
      mrr,
      redesEmAtraso: emAtraso.length,
      totalVencido,
    };
  }, [assinaturas]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return assinaturas.filter((a) => {
      if (filtro !== "todas" && a.estado !== filtro) return false;
      if (q && !a.rede.toLowerCase().includes(q) && !a.codigo.includes(q))
        return false;
      return true;
    });
  }, [assinaturas, filtro, busca]);

  const contagem = (c: Filtro) =>
    c === "todas"
      ? assinaturas.length
      : assinaturas.filter((a) => a.estado === c).length;

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[26px] font-black tracking-tight">Assinaturas</h1>
        <p className="text-sm text-texto-2">
          Gestão das assinaturas por rede — faturas, cobrança e situação.
        </p>
      </motion.header>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          indice={0}
          destaque
          Icone={TrendingUp}
          rotulo="MRR ativo"
          valor={moeda.format(resumo.mrr)}
          detalhe={`${resumo.ativas} ${resumo.ativas === 1 ? "assinatura ativa" : "assinaturas ativas"}`}
        />
        <Kpi
          indice={1}
          Icone={Users}
          rotulo="Redes"
          valor={String(resumo.total)}
          detalhe="assinaturas no total"
        />
        <Kpi
          indice={2}
          Icone={AlertTriangle}
          rotulo="Em atraso"
          valor={moeda.format(resumo.totalVencido)}
          detalhe={`${resumo.redesEmAtraso} ${resumo.redesEmAtraso === 1 ? "rede" : "redes"}`}
          alerta={resumo.totalVencido > 0}
        />
        <Kpi
          indice={3}
          Icone={CreditCard}
          rotulo="Ticket médio"
          valor={moeda.format(
            resumo.ativas > 0 ? resumo.mrr / resumo.ativas : 0,
          )}
          detalhe="por rede ativa"
        />
      </div>

      {/* Filtros + busca */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-fundo border border-borda overflow-x-auto">
          {FILTROS.map((f) => (
            <button
              key={f.chave}
              onClick={() => setFiltro(f.chave)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
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
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-texto-3" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar rede ou código…"
            className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-borda bg-superficie text-sm focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
      </div>

      {/* Lista */}
      {visiveis.length === 0 ? (
        <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] px-5 py-14 flex flex-col items-center gap-3 text-center">
          <span className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center">
            <CreditCard className="w-6 h-6 text-brand-600" />
          </span>
          <p className="text-sm text-texto-3">
            Nenhuma assinatura encontrada com esse filtro.
          </p>
        </div>
      ) : (
        <div className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden divide-y divide-borda">
          {visiveis.map((a, i) => (
            <LinhaRede key={a.tenantId} a={a} indice={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function LinhaRede({ a, indice }: { a: LinhaAssinatura; indice: number }) {
  const estadoCls = ESTADO_CLS[a.estado] ?? ESTADO_CLS.ativa;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(indice * 0.03, 0.3) }}
    >
      <Link
        href={`/master/assinaturas/${a.tenantId}`}
        className="group flex items-center gap-4 px-5 py-4 hover:bg-brand-50/30 transition-colors"
      >
        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-acento grid place-items-center text-white shrink-0">
          <Building2 className="w-5 h-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold truncate">{a.rede}</span>
            <span className="text-[10px] font-bold text-texto-3 bg-fundo border border-borda rounded-md px-1.5 py-0.5 tabular-nums">
              #{a.codigo}
            </span>
          </div>
          <div className="text-xs text-texto-3 mt-0.5">
            {a.patiosAtivos} {a.patiosAtivos === 1 ? "pátio" : "pátios"} ·{" "}
            {moeda.format(a.valorPorPatio)}/pátio · vence dia {a.diaVencimento}
            {a.qtdVencidas > 0 && (
              <span className="text-perigo font-bold">
                {" "}
                · {a.qtdVencidas} {a.qtdVencidas === 1 ? "fatura vencida" : "faturas vencidas"}
              </span>
            )}
            {a.qtdVencidas === 0 && a.proximoVencimento && (
              <span> · próx. {formatarData(a.proximoVencimento)}</span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 hidden sm:block">
          <div className="font-black tabular-nums">
            {moeda.format(a.mensalidade)}
          </div>
          <div className="text-[11px] text-texto-3">/mês</div>
        </div>

        <span
          className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${estadoCls}`}
        >
          {labelAssinaturaEstado(a.estado)}
        </span>

        <ChevronRight className="w-4 h-4 text-texto-3 shrink-0 group-hover:translate-x-0.5 group-hover:text-brand-600 transition-all" />
      </Link>
    </motion.div>
  );
}

function Kpi({
  rotulo,
  valor,
  detalhe,
  Icone,
  destaque = false,
  alerta = false,
  indice,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  Icone: React.ComponentType<{ className?: string }>;
  destaque?: boolean;
  alerta?: boolean;
  indice: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: indice * 0.06 }}
      className={`relative overflow-hidden rounded-2xl p-5 ${
        destaque
          ? "bg-gradient-to-br from-brand-700 via-brand-600 to-acento-teal text-white shadow-[var(--shadow-brand)]"
          : "bg-superficie border border-borda shadow-[var(--shadow-card)]"
      }`}
    >
      {destaque && (
        <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
      )}
      <div className="flex items-center justify-between">
        <span
          className={`text-[11px] font-bold uppercase tracking-wider ${destaque ? "text-white/75" : "text-texto-3"}`}
        >
          {rotulo}
        </span>
        <span
          className={`w-8 h-8 rounded-lg grid place-items-center ${
            destaque
              ? "bg-white/15"
              : alerta
                ? "bg-perigo-bg text-perigo"
                : "bg-brand-50 text-brand-600"
          }`}
        >
          <Icone className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-2 text-[24px] font-black tabular-nums leading-none">
        {valor}
      </div>
      {detalhe && (
        <div
          className={`mt-1 text-xs font-semibold ${
            destaque ? "text-white/70" : alerta ? "text-perigo" : "text-texto-3"
          }`}
        >
          {detalhe}
        </div>
      )}
    </motion.div>
  );
}
