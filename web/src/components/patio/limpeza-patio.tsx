"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BrushCleaning, X, AlertTriangle, Loader2, Users } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Campo, Input } from "@/components/ui/campos";
import { useToast } from "@/components/ui/toast";
import {
  preverLimpeza,
  executarLimpeza,
  type EscopoLimpeza,
} from "@/app/painel/patio/actions";

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
/** Bordas do dia no fuso LOCAL do gestor (o filtro é por data de entrada). */
function inicioDiaIso(dia: string): string {
  return new Date(`${dia}T00:00:00`).toISOString();
}
function fimDiaIso(dia: string): string {
  return new Date(`${dia}T23:59:59.999`).toISOString();
}

export function LimpezaPatio({
  patioId,
  patioNome,
}: {
  patioId: string;
  patioNome: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [modal, setModal] = useState<{ inicio: string; fim: string } | null>(
    null,
  );

  // Datas-padrão calculadas no evento de clique (leitura do relógio fora do render).
  function abrir() {
    const agora = new Date();
    setModal({
      inicio: ymd(new Date(agora.getTime() - 30 * 86_400_000)),
      fim: ymd(agora),
    });
  }

  return (
    <>
      <button
        onClick={abrir}
        className="inline-flex items-center gap-2 h-11 px-4 rounded-xl font-bold text-sm text-perigo bg-perigo-bg border border-perigo/25 hover:bg-perigo hover:text-white transition-colors"
      >
        <BrushCleaning className="w-4 h-4" />
        Limpeza de Pátio
      </button>

      <AnimatePresence>
        {modal && (
          <ModalLimpeza
            patioId={patioId}
            patioNome={patioNome}
            inicioInicial={modal.inicio}
            fimInicial={modal.fim}
            fechar={() => setModal(null)}
            aoConcluir={(msg) => {
              setModal(null);
              toast.sucesso("Pátio limpo", msg);
              router.refresh();
            }}
            aoErrar={(msg) => toast.erro("Não deu certo", msg)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ModalLimpeza({
  patioId,
  patioNome,
  inicioInicial,
  fimInicial,
  fechar,
  aoConcluir,
  aoErrar,
}: {
  patioId: string;
  patioNome: string;
  inicioInicial: string;
  fimInicial: string;
  fechar: () => void;
  aoConcluir: (msg: string) => void;
  aoErrar: (msg: string) => void;
}) {
  const [inicio, setInicio] = useState(inicioInicial);
  const [fim, setFim] = useState(fimInicial);
  const [motivo, setMotivo] = useState("");
  const [incluirMensalistas, setIncluirMensalistas] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [countPara, setCountPara] = useState<string>(""); // escopo a que o count se refere
  const [prevendo, iniciarPrevia] = useTransition();
  const [executando, setExecutando] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const intervaloValido = Boolean(inicio && fim && inicio <= fim);
  const chave = `${inicio}|${fim}|${incluirMensalistas}`;

  function escopo(): EscopoLimpeza {
    return {
      patioId,
      inicioIso: inicioDiaIso(inicio),
      fimIso: fimDiaIso(fim),
      incluirMensalistas,
    };
  }

  // Prévia OBRIGATÓRIA — recalcula (debounced) sempre que o escopo muda.
  // setState só acontece no callback assíncrono; o count é "amarrado" à chave
  // do escopo (countPara) para não confirmar sobre uma prévia desatualizada.
  useEffect(() => {
    if (!intervaloValido) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      iniciarPrevia(async () => {
        const r = await preverLimpeza({
          patioId,
          inicioIso: inicioDiaIso(inicio),
          fimIso: fimDiaIso(fim),
          incluirMensalistas,
        });
        setCount(r.count);
        setCountPara(`${inicio}|${fim}|${incluirMensalistas}`);
      });
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [inicio, fim, incluirMensalistas, intervaloValido, patioId]);

  const previaPronta = intervaloValido && countPara === chave && count !== null;
  const podeConfirmar =
    previaPronta &&
    (count ?? 0) > 0 &&
    motivo.trim().length > 0 &&
    !executando &&
    !prevendo;

  async function confirmar() {
    if (!podeConfirmar) return;
    setExecutando(true);
    const r = await executarLimpeza({ ...escopo(), motivo: motivo.trim() });
    setExecutando(false);
    if (r.ok) aoConcluir(r.msg);
    else aoErrar(r.msg);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] grid place-items-center p-4 bg-noite/50 backdrop-blur-sm"
      onClick={executando ? undefined : fechar}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-superficie shadow-[var(--shadow-pop)] p-6 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-extrabold flex items-center gap-2 text-perigo">
            <BrushCleaning className="w-5 h-5" />
            Limpeza de Pátio
          </h3>
          <button
            onClick={fechar}
            disabled={executando}
            aria-label="Fechar"
            className="text-texto-3 hover:text-texto disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-texto-2 mb-5">
          <b className="text-texto">{patioNome}</b> · remove os veículos que
          estão marcados como <b>no pátio</b> mas já saíram na vida real (ticket
          esquecido em aberto).
        </p>

        {/* Intervalo (por data de entrada) */}
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Entrada de">
            <Input
              type="date"
              value={inicio}
              max={fim}
              onChange={(e) => setInicio(e.target.value)}
            />
          </Campo>
          <Campo label="Entrada até">
            <Input
              type="date"
              value={fim}
              min={inicio}
              onChange={(e) => setFim(e.target.value)}
            />
          </Campo>
        </div>

        {/* Escopo: mensalistas */}
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-borda bg-fundo/50 p-3.5 cursor-pointer hover:border-brand-200 transition-colors">
          <input
            type="checkbox"
            checked={incluirMensalistas}
            onChange={(e) => setIncluirMensalistas(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-perigo"
          />
          <span className="min-w-0">
            <span className="text-sm font-bold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-texto-3" />
              Incluir veículos de mensalistas/credenciados
            </span>
            <span className="block text-xs text-texto-3 mt-0.5">
              Por padrão a limpeza afeta só veículos avulsos. Marque para incluir
              também os de planos.
            </span>
          </span>
        </label>

        {/* Motivo (obrigatório) */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-texto-2 mb-1.5">
            Motivo da limpeza <span className="text-perigo">*</span>
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Ex: veículos que saíram sem baixa no fim de semana."
            className="w-full px-3.5 py-2.5 rounded-xl border border-borda bg-superficie text-sm placeholder:text-texto-3 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 resize-none"
          />
        </div>

        {/* Prévia obrigatória */}
        <div className="mt-4">
          {!intervaloValido ? (
            <p className="text-sm font-semibold text-perigo bg-perigo-bg border border-perigo/20 rounded-xl px-3.5 py-2.5">
              A data final deve ser igual ou posterior à inicial.
            </p>
          ) : !previaPronta ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-texto-2 bg-fundo border border-borda rounded-xl px-3.5 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin" />
              Calculando quantos serão removidos…
            </p>
          ) : count === 0 ? (
            <p className="text-sm font-semibold text-texto-2 bg-fundo border border-borda rounded-xl px-3.5 py-2.5">
              Nenhum ticket no pátio nesse intervalo e escopo. Nada a remover.
            </p>
          ) : (
            <div className="rounded-xl border border-perigo/25 bg-perigo-bg px-3.5 py-3">
              <p className="text-sm font-bold text-perigo flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Esta ação removerá <span className="tabular-nums">{count}</span>{" "}
                {count === 1 ? "ticket" : "tickets"}.
              </p>
              <p className="text-xs text-perigo/80 mt-1">
                A remoção não pode ser desfeita. Os tickets vão para a página de
                removidos com o motivo informado.
              </p>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="mt-6 flex gap-3 justify-end">
          <Botao
            type="button"
            variante="fantasma"
            onClick={fechar}
            disabled={executando}
          >
            Cancelar
          </Botao>
          <Botao
            type="button"
            variante="perigo"
            onClick={confirmar}
            carregando={executando}
            disabled={!podeConfirmar}
          >
            <BrushCleaning className="w-4 h-4" />
            Remover {previaPronta && (count ?? 0) > 0 ? count : ""}
          </Botao>
        </div>
      </motion.div>
    </motion.div>
  );
}
