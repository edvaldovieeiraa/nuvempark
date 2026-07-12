"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Car,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Star,
} from "lucide-react";
import {
  salvarTiposVeiculo,
  type Resultado,
} from "@/app/painel/tipos-veiculo/actions";
import { nomeAmigavel } from "@/lib/nome-amigavel";
import { useToast } from "@/components/ui/toast";
import { Botao } from "@/components/ui/botao";
import { Confirmar } from "@/components/ui/confirmar";

export function TiposVeiculoClient({
  patioId,
  patioNome,
  tiposIniciais,
  tiposEmUso,
}: {
  patioId: string;
  patioNome: string;
  tiposIniciais: string[];
  /** Tipos referenciados por tarifas ativas (aviso ao remover). */
  tiposEmUso: string[];
}) {
  const toast = useToast();
  const [tipos, setTipos] = useState<string[]>(tiposIniciais);
  const [novo, setNovo] = useState("");
  const [sujo, setSujo] = useState(false);
  const [pendente, comecar] = useTransition();

  function mover(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= tipos.length) return;
    const copia = [...tipos];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setTipos(copia);
    setSujo(true);
  }

  function adicionar() {
    const t = novo.trim().toLowerCase();
    if (!t) return;
    if (tipos.includes(t)) {
      toast.erro("Já existe", `O tipo "${nomeAmigavel(t)}" já está na lista.`);
      return;
    }
    setTipos([...tipos, t]);
    setNovo("");
    setSujo(true);
  }

  function remover(t: string) {
    setTipos(tipos.filter((x) => x !== t));
    setSujo(true);
  }

  function salvar() {
    comecar(async () => {
      const r: Resultado = await salvarTiposVeiculo(patioId, tipos);
      if (r?.ok) {
        toast.sucesso("Salvo!", r.msg);
        setSujo(false);
      } else {
        toast.erro("Não deu certo", r?.msg ?? "Erro inesperado.");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-[26px] font-black tracking-tight">
            Tipos de veículo
          </h1>
          <p className="text-sm text-texto-2">
            <b className="text-texto">{patioNome}</b> · os tipos que o operador
            escolhe na entrada. <b>A ordem importa</b>: o app deixa o primeiro
            já selecionado.
          </p>
        </div>
        {sujo && (
          <Botao carregando={pendente} onClick={salvar} type="button">
            <Save className="w-4 h-4" />
            Salvar alterações
          </Botao>
        )}
      </motion.header>

      {/* Lista ordenável */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] overflow-hidden"
      >
        <ul className="divide-y divide-borda">
          <AnimatePresence initial={false}>
            {tipos.map((t, i) => (
              <motion.li
                key={t}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="px-4 py-3 flex items-center gap-3"
              >
                <span className="w-9 h-9 rounded-xl bg-brand-50 grid place-items-center shrink-0">
                  <Car className="w-4 h-4 text-brand-600" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm flex items-center gap-2">
                    {nomeAmigavel(t)}
                    {i === 0 && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-2 py-0.5"
                        title="Já vem selecionado no app do operador"
                      >
                        <Star className="w-3 h-3" />
                        padrão no app
                      </span>
                    )}
                  </p>
                  {tiposEmUso.includes(t) && (
                    <p className="text-[11px] text-texto-3">
                      usado por tarifas deste pátio
                    </p>
                  )}
                </div>
                <button
                  onClick={() => mover(i, -1)}
                  disabled={i === 0}
                  aria-label={`Subir ${nomeAmigavel(t)}`}
                  className="w-8 h-8 rounded-lg grid place-items-center text-texto-3 hover:text-brand-700 hover:bg-brand-50 transition-colors disabled:opacity-25 disabled:pointer-events-none"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => mover(i, 1)}
                  disabled={i === tipos.length - 1}
                  aria-label={`Descer ${nomeAmigavel(t)}`}
                  className="w-8 h-8 rounded-lg grid place-items-center text-texto-3 hover:text-brand-700 hover:bg-brand-50 transition-colors disabled:opacity-25 disabled:pointer-events-none"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <BotaoRemover
                  tipo={t}
                  emUso={tiposEmUso.includes(t)}
                  ultimo={tipos.length === 1}
                  onRemover={() => remover(t)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </motion.section>

      {/* Adicionar */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.14 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-5"
      >
        <p className="text-xs font-bold text-texto-2 mb-2">Novo tipo</p>
        <div className="flex gap-2">
          <input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            placeholder="Ex.: Van, Bicicleta, Caminhão…"
            className="flex-1 h-11 px-3.5 rounded-xl border border-borda bg-superficie text-sm placeholder:text-texto-3 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
          />
          <Botao type="button" onClick={adicionar} variante="fantasma">
            <Plus className="w-4 h-4" />
            Adicionar
          </Botao>
        </div>
        <p className="mt-3 text-xs text-texto-3">
          Lembre de <b>salvar</b> depois de mexer na lista. As mudanças chegam
          ao app na próxima sincronização.
        </p>
      </motion.section>
    </div>
  );
}

function BotaoRemover({
  tipo,
  emUso,
  ultimo,
  onRemover,
}: {
  tipo: string;
  emUso: boolean;
  ultimo: boolean;
  onRemover: () => void;
}) {
  if (ultimo) {
    return (
      <span
        className="w-8 h-8 grid place-items-center text-texto-3 opacity-25"
        title="Mantenha pelo menos um tipo"
      >
        <Trash2 className="w-4 h-4" />
      </span>
    );
  }
  return (
    <Confirmar
      titulo={`Remover ${nomeAmigavel(tipo)}?`}
      descricao={
        emUso
          ? `Existem tarifas deste pátio usando "${nomeAmigavel(tipo)}". Elas continuam valendo, mas o operador não conseguirá registrar novas entradas desse tipo.`
          : `O tipo "${nomeAmigavel(tipo)}" some das opções do app na próxima sincronização.`
      }
      rotuloConfirmar="Remover"
      aoConfirmar={async () => onRemover()}
    >
      {(abrir) => (
        <button
          onClick={abrir}
          aria-label={`Remover ${nomeAmigavel(tipo)}`}
          className="w-8 h-8 rounded-lg grid place-items-center text-texto-3 hover:text-perigo hover:bg-perigo-bg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </Confirmar>
  );
}
