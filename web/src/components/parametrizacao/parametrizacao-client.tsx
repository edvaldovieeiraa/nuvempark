"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal,
  Camera,
  Check,
  RotateCcw,
  Save,
  Printer,
  UserCheck,
  CircleSlash,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

/* =========================================================
   PARAMETRIZAÇÃO
   Habilitações da operação. A primeira: como a foto do
   veículo se comporta na impressão do recibo de entrada.
   Por ora é uma PRÉVIA — o valor vive em estado local e
   ainda não persiste nem chega ao app.
   ========================================================= */

type ModoFoto = "ativada" | "operador" | "desativada";

type OpcaoModo = {
  valor: ModoFoto;
  titulo: string;
  descricao: string;
  Icone: LucideIcon;
};

const OPCOES: OpcaoModo[] = [
  {
    valor: "ativada",
    titulo: "Impressão ativada para o pátio",
    descricao:
      "A foto do veículo sai sempre no recibo, em toda entrada — o operador não precisa decidir.",
    Icone: Printer,
  },
  {
    valor: "operador",
    titulo: "Operador decide na entrada",
    descricao:
      "Cada entrada mostra uma opção para o operador marcar se imprime a foto ou não.",
    Icone: UserCheck,
  },
  {
    valor: "desativada",
    titulo: "Impressão desativada",
    descricao: "A foto do veículo nunca é impressa no recibo.",
    Icone: CircleSlash,
  },
];

const PADRAO: ModoFoto = "operador";

export function ParametrizacaoClient() {
  const toast = useToast();
  const [modoFoto, setModoFoto] = useState<ModoFoto>(PADRAO);

  const sujo = modoFoto !== PADRAO;

  const salvar = () => {
    // Ainda sem backend — deixamos claro para o gestor.
    toast.info("A parametrização ainda não é salva — em breve.");
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Cabeçalho */}
      <div className="flex items-start gap-4">
        <span className="hidden sm:grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-acento-teal text-white shadow-[var(--shadow-brand)] shrink-0">
          <SlidersHorizontal className="w-6 h-6" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-texto">
              Parametrização
            </h1>
            <span className="rounded-full bg-brand-50 border border-brand-200 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-brand-700">
              Prévia
            </span>
          </div>
          <p className="mt-1 text-sm text-texto-2 leading-relaxed">
            Ligue e desligue recursos da sua operação. As mudanças passam a valer
            em todos os pátios da rede.
          </p>
        </div>
      </div>

      {/* Feature 1 — Impressão da foto do veículo no recibo */}
      <div className="mt-8 pb-28">
        <section className="rounded-2xl border border-borda bg-superficie shadow-[var(--shadow-card)] overflow-hidden">
          <header className="flex items-center gap-3 p-5 pb-4 border-b border-borda">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-brand-50 text-brand-600 shrink-0">
              <Camera className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-extrabold text-texto">
                Impressão da foto do veículo no recibo
              </h2>
              <p className="text-xs text-texto-3 leading-relaxed">
                Define se a foto tirada na entrada sai impressa no recibo do
                cliente.
              </p>
            </div>
          </header>

          <div className="p-4 sm:p-5 space-y-3">
            {OPCOES.map((o) => {
              const sel = modoFoto === o.valor;
              return (
                <button
                  key={o.valor}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => setModoFoto(o.valor)}
                  className={`w-full text-left flex items-start gap-3.5 rounded-xl border p-4 transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 ${
                    sel
                      ? "border-brand-400 bg-brand-50/50 shadow-[var(--shadow-card)]"
                      : "border-borda bg-superficie hover:border-brand-200 hover:bg-fundo/50"
                  }`}
                >
                  <span
                    className={`grid place-items-center w-9 h-9 rounded-lg shrink-0 transition-colors ${
                      sel
                        ? "bg-brand-500 text-white"
                        : "bg-fundo text-texto-3"
                    }`}
                  >
                    <o.Icone className="w-[18px] h-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-texto text-[15px]">
                      {o.titulo}
                    </span>
                    <span className="block text-sm text-texto-2 leading-relaxed mt-0.5">
                      {o.descricao}
                    </span>
                  </span>
                  {/* indicador de seleção (marca única — só um modo por vez) */}
                  <span
                    className={`grid place-items-center w-6 h-6 rounded-md border-2 shrink-0 mt-0.5 transition-all ${
                      sel
                        ? "bg-brand-500 border-brand-500"
                        : "bg-superficie border-borda"
                    }`}
                  >
                    <AnimatePresence>
                      {sel && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Check className="w-4 h-4 text-white" strokeWidth={3.5} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Espaço reservado para as próximas parametrizações */}
        <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-borda py-6 text-texto-3">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">
            Novas parametrizações serão adicionadas aqui.
          </span>
        </div>
      </div>

      {/* Barra de salvar (aparece só quando há mudança) */}
      <AnimatePresence>
        {sujo && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed bottom-4 inset-x-4 lg:left-[calc(16rem+2rem)] lg:right-8 z-30"
          >
            <div className="mx-auto max-w-3xl flex items-center gap-3 rounded-2xl border border-borda bg-superficie/95 backdrop-blur px-4 py-3 shadow-[var(--shadow-pop)]">
              <span className="w-2 h-2 rounded-full bg-aviso shrink-0" />
              <p className="text-sm font-semibold text-texto-2 flex-1 min-w-0">
                Você tem alterações não salvas.
              </p>
              <button
                onClick={() => setModoFoto(PADRAO)}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-sm font-bold text-texto-2 hover:bg-fundo transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Descartar</span>
              </button>
              <button
                onClick={salvar}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all"
              >
                <Save className="w-4 h-4" />
                Salvar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
