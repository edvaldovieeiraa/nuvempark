"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

type Props = {
  children: React.ReactNode;
  carregando?: boolean;
  variante?: "primario" | "fantasma" | "perigo";
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
};

const VARIANTES: Record<NonNullable<Props["variante"]>, string> = {
  primario:
    "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-[var(--shadow-brand)] hover:brightness-110",
  fantasma:
    "border border-borda bg-superficie text-texto-2 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50",
  perigo: "bg-perigo text-white hover:brightness-110 shadow-lg shadow-perigo/25",
};

export function Botao({
  children,
  carregando = false,
  variante = "primario",
  type = "submit",
  onClick,
  className = "",
  disabled,
}: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      type={type}
      onClick={onClick}
      disabled={disabled || carregando}
      className={`inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-sm transition-all disabled:opacity-60 disabled:pointer-events-none ${VARIANTES[variante]} ${className}`}
    >
      {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  );
}
