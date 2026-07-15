"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShieldAlert,
  Mail,
  Ban,
  Play,
  ChevronDown,
  CheckCircle2,
  Building2,
} from "lucide-react";
import {
  cobrarPorEmail,
  alternarSuspensao,
  marcarPaga,
  type Resultado,
} from "@/app/master/(console)/financeiro/actions";
import { useToast } from "@/components/ui/toast";
import { moeda, diasEmAtraso, competenciaCurta } from "@/lib/financeiro";
import { formatarData } from "@/lib/format-data";

export type RedeVencida = {
  tenantId: string;
  rede: string;
  codigo: string;
  total: number;
  qtdFaturas: number;
  maisAntiga: string;
  suspensa: boolean;
  temEmail: boolean;
  faturas: { id: string; competencia: string; vencimento: string; valor: number }[];
};

export function InadimplenciaClient({
  redes,
  emailAtivo,
}: {
  redes: RedeVencida[];
  emailAtivo: boolean;
}) {
  const totalGeral = redes.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-[26px] font-black tracking-tight">Inadimplência</h1>
          <p className="text-sm text-texto-2">
            {redes.length} {redes.length === 1 ? "rede" : "redes"} com faturas
            vencidas ·{" "}
            <b className="text-perigo">{moeda.format(totalGeral)}</b> em atraso
          </p>
        </div>
      </motion.header>

      {redes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] px-5 py-16 flex flex-col items-center gap-3 text-center"
        >
          <span className="w-14 h-14 rounded-2xl bg-brand-50 grid place-items-center">
            <CheckCircle2 className="w-7 h-7 text-brand-600" />
          </span>
          <p className="font-bold text-lg">Tudo em dia! 🎉</p>
          <p className="text-sm text-texto-3 max-w-xs">
            Nenhuma rede com fatura vencida no momento.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {redes.map((r, i) => (
            <CartaoRede
              key={r.tenantId}
              r={r}
              indice={i}
              emailAtivo={emailAtivo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CartaoRede({
  r,
  indice,
  emailAtivo,
}: {
  r: RedeVencida;
  indice: number;
  emailAtivo: boolean;
}) {
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [pendente, comecar] = useTransition();
  const atraso = diasEmAtraso(r.maisAntiga);

  function agir(fn: () => Promise<Resultado>) {
    comecar(async () => {
      const res = await fn();
      if (res?.ok) toast.sucesso(res.msg);
      else toast.erro(res?.msg ?? "Erro inesperado.");
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: indice * 0.05 }}
      className={`bg-superficie border rounded-2xl shadow-[var(--shadow-card)] overflow-hidden ${
        r.suspensa ? "border-perigo/30" : "border-borda"
      } ${pendente ? "opacity-60" : ""}`}
    >
      <div className="p-4 flex items-center gap-4">
        <span
          className={`w-11 h-11 rounded-xl grid place-items-center text-white shrink-0 ${
            atraso > 15
              ? "bg-gradient-to-br from-perigo to-saida"
              : "bg-gradient-to-br from-aviso to-saida"
          }`}
        >
          <ShieldAlert className="w-5 h-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-black truncate">{r.rede}</span>
            {r.suspensa && (
              <span className="text-[10px] font-black uppercase tracking-wide text-perigo bg-perigo-bg border border-perigo/20 px-1.5 py-0.5 rounded">
                Suspensa
              </span>
            )}
          </div>
          <div className="text-xs text-texto-3">
            {r.qtdFaturas} {r.qtdFaturas === 1 ? "fatura" : "faturas"} ·{" "}
            <span className="text-perigo font-bold">{atraso}d de atraso</span> ·
            código {r.codigo}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-black text-perigo tabular-nums">
            {moeda.format(r.total)}
          </div>
        </div>

        <button
          onClick={() => setAberto((a) => !a)}
          className="w-9 h-9 rounded-lg grid place-items-center text-texto-3 hover:text-texto hover:bg-fundo transition-colors shrink-0"
          aria-label="Detalhes"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${aberto ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Ações */}
      <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
        {emailAtivo && (
          <button
            onClick={() =>
              agir(async () => {
                // cobra a fatura mais antiga vencida
                const alvo = [...r.faturas].sort((a, b) =>
                  a.vencimento.localeCompare(b.vencimento),
                )[0];
                return cobrarPorEmail(alvo.id);
              })
            }
            disabled={pendente || !r.temEmail}
            title={r.temEmail ? "" : "Rede sem e-mail de cobrança"}
            className="h-9 px-3.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 font-bold text-xs inline-flex items-center gap-1.5 hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            Cobrar por e-mail
          </button>
        )}

        {r.suspensa ? (
          <button
            onClick={() => agir(() => alternarSuspensao(r.tenantId, false))}
            disabled={pendente}
            className="h-9 px-3.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 font-bold text-xs inline-flex items-center gap-1.5 hover:bg-brand-100 transition-colors"
          >
            <Play className="w-4 h-4" />
            Reativar acesso
          </button>
        ) : (
          <button
            onClick={() => agir(() => alternarSuspensao(r.tenantId, true))}
            disabled={pendente}
            className="h-9 px-3.5 rounded-lg bg-perigo-bg text-perigo border border-perigo/20 font-bold text-xs inline-flex items-center gap-1.5 hover:bg-perigo/10 transition-colors"
          >
            <Ban className="w-4 h-4" />
            Suspender acesso
          </button>
        )}
      </div>

      {/* Detalhe das faturas */}
      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-borda bg-fundo/40 overflow-hidden"
          >
            <div className="p-4 space-y-2">
              {r.faturas.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 text-sm bg-superficie border border-borda rounded-xl px-3.5 py-2.5"
                >
                  <Building2 className="w-4 h-4 text-texto-3 shrink-0" />
                  <span className="font-semibold capitalize">
                    {competenciaCurta(f.competencia)}
                  </span>
                  <span className="text-xs text-texto-3 whitespace-nowrap">
                    vence {formatarData(f.vencimento)}
                  </span>
                  <span className="ml-auto font-bold tabular-nums">
                    {moeda.format(f.valor)}
                  </span>
                  <button
                    onClick={() => agir(() => marcarPaga(f.id))}
                    disabled={pendente}
                    className="h-8 px-2.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 font-bold text-xs inline-flex items-center gap-1 hover:bg-brand-100 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Pago
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
