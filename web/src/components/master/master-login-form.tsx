"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Eye, EyeOff, AlertCircle } from "lucide-react";

export function MasterLoginForm({
  entrar,
  erro,
}: {
  entrar: (formData: FormData) => Promise<void>;
  erro: boolean;
}) {
  const [verSenha, setVerSenha] = useState(false);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-noite relative overflow-hidden">
      <div className="pointer-events-none absolute top-[15%] left-[12%] w-80 h-80 rounded-full bg-brand-500/15 blur-3xl animate-float" />
      <div
        className="pointer-events-none absolute bottom-[10%] right-[8%] w-96 h-96 rounded-full bg-acento/10 blur-3xl animate-float"
        style={{ animationDelay: "-3s" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm relative"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-acento grid place-items-center shadow-[var(--shadow-brand)]">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-white">
            Nuvem<span className="text-brand-400">Park</span>{" "}
            <span className="text-white/50 font-bold">Master</span>
          </h1>
          <p className="text-sm text-white/50 mt-1">Console da plataforma</p>
        </div>

        <motion.form
          action={entrar}
          animate={erro ? { x: [0, -10, 10, -6, 6, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-white/60 mb-1.5">
              Senha mestra
            </label>
            <div className="relative">
              <input
                name="senha"
                type={verSenha ? "text" : "password"}
                required
                autoFocus
                className="w-full h-12 px-3.5 pr-11 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/20"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? "Ocultar" : "Mostrar"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {verSenha ? (
                  <EyeOff className="w-4.5 h-4.5" />
                ) : (
                  <Eye className="w-4.5 h-4.5" />
                )}
              </button>
            </div>
          </div>

          {erro && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm font-semibold text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              Senha incorreta.
            </motion.p>
          )}

          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all"
          >
            Acessar console
          </button>
        </motion.form>

        <p className="text-center text-xs text-white/30 mt-6">
          Acesso restrito · NuvemPark
        </p>
      </motion.div>
    </main>
  );
}
