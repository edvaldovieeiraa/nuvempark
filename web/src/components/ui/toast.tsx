"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type Tipo = "sucesso" | "erro" | "info";

type Toast = {
  id: number;
  tipo: Tipo;
  titulo: string;
  descricao?: string;
};

type ToastApi = {
  sucesso: (titulo: string, descricao?: string) => void;
  erro: (titulo: string, descricao?: string) => void;
  info: (titulo: string, descricao?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa do <ToastProvider>");
  return ctx;
}

const ESTILO: Record<
  Tipo,
  { icone: React.ReactNode; barra: string; fundoIcone: string }
> = {
  sucesso: {
    icone: <CheckCircle2 className="w-5 h-5 text-brand-600" />,
    barra: "bg-brand-500",
    fundoIcone: "bg-brand-50",
  },
  erro: {
    icone: <XCircle className="w-5 h-5 text-perigo" />,
    barra: "bg-perigo",
    fundoIcone: "bg-perigo-bg",
  },
  info: {
    icone: <Info className="w-5 h-5 text-info" />,
    barra: "bg-info",
    fundoIcone: "bg-info-bg",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const proximoId = useRef(1);

  const remover = useCallback((id: number) => {
    setToasts((atual) => atual.filter((t) => t.id !== id));
  }, []);

  const empurrar = useCallback(
    (tipo: Tipo, titulo: string, descricao?: string) => {
      const id = proximoId.current++;
      setToasts((atual) => [...atual.slice(-3), { id, tipo, titulo, descricao }]);
      setTimeout(() => remover(id), 4200);
    },
    [remover],
  );

  const api = useMemo<ToastApi>(
    () => ({
      sucesso: (t, d) => empurrar("sucesso", t, d),
      erro: (t, d) => empurrar("erro", t, d),
      info: (t, d) => empurrar("info", t, d),
    }),
    [empurrar],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,360px)] pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const e = ESTILO[t.tipo];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 48, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 48, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="pointer-events-auto relative overflow-hidden rounded-xl bg-superficie border border-borda shadow-[var(--shadow-pop)] flex items-start gap-3 p-3.5 pr-9"
              >
                <span
                  className={`absolute left-0 top-0 bottom-0 w-1 ${e.barra}`}
                />
                <span
                  className={`shrink-0 w-9 h-9 rounded-full grid place-items-center ${e.fundoIcone}`}
                >
                  {e.icone}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-bold leading-snug">{t.titulo}</p>
                  {t.descricao && (
                    <p className="text-xs text-texto-2 mt-0.5 leading-snug">
                      {t.descricao}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => remover(t.id)}
                  aria-label="Fechar aviso"
                  className="absolute top-2.5 right-2.5 text-texto-3 hover:text-texto transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
