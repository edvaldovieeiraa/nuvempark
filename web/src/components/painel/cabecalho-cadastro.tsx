"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

/** Cabeçalho padrão das páginas de cadastro: voltar + título + contexto. */
export function CabecalhoCadastro({
  voltarHref,
  voltarLabel,
  titulo,
  descricao,
}: {
  voltarHref: string;
  voltarLabel: string;
  titulo: string;
  descricao: string;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link
        href={voltarHref}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-texto-2 hover:text-brand-700 transition-colors mb-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {voltarLabel}
      </Link>
      <h1 className="text-[26px] font-black tracking-tight">{titulo}</h1>
      <p className="text-sm text-texto-2">{descricao}</p>
    </motion.header>
  );
}
