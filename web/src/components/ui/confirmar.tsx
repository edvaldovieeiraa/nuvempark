"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";

type Props = {
  titulo: string;
  descricao: string;
  rotuloConfirmar: string;
  aoConfirmar: () => Promise<void>;
  children: (abrir: () => void) => React.ReactNode;
};

/** Modal de confirmação animado para ações destrutivas. */
export function Confirmar({
  titulo,
  descricao,
  rotuloConfirmar,
  aoConfirmar,
  children,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [pendente, comecar] = useTransition();

  function confirmar() {
    comecar(async () => {
      await aoConfirmar();
      setAberto(false);
    });
  }

  return (
    <>
      {children(() => setAberto(true))}
      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] grid place-items-center p-4 bg-noite/50 backdrop-blur-sm"
            onClick={() => !pendente && setAberto(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-superficie shadow-[var(--shadow-pop)] p-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-perigo-bg grid place-items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-perigo" />
              </div>
              <h3 className="text-lg font-extrabold">{titulo}</h3>
              <p className="text-sm text-texto-2 mt-1.5 leading-relaxed">
                {descricao}
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setAberto(false)}
                  disabled={pendente}
                  className="flex-1 h-11 rounded-xl border border-borda text-sm font-bold text-texto-2 hover:bg-fundo transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmar}
                  disabled={pendente}
                  className="flex-1 h-11 rounded-xl bg-perigo text-white text-sm font-bold hover:brightness-110 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {pendente && <Loader2 className="w-4 h-4 animate-spin" />}
                  {rotuloConfirmar}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
