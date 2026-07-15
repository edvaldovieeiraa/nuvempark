"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * Regra opcional de formulário: checkbox + explicação curta; os campos só
 * aparecem (e valem) quando habilitada. Padrão do produto para funções
 * avançadas — o usuário entende a regra antes de ligá-la.
 */
export function SecaoOpcional({
  titulo,
  descricao,
  habilitado,
  onChange,
  children,
}: {
  titulo: string;
  descricao: string;
  habilitado: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`col-span-full rounded-xl border transition-colors ${
        habilitado ? "border-brand-200 bg-brand-50/40" : "border-borda bg-fundo/50"
      }`}
    >
      <label className="flex items-start gap-3 p-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={habilitado}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-4.5 h-4.5 accent-[#059669] cursor-pointer shrink-0"
        />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-texto">{titulo}</span>
          <span className="block text-xs text-texto-2 leading-relaxed mt-0.5">
            {descricao}
          </span>
        </span>
      </label>

      <AnimatePresence initial={false}>
        {habilitado && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
