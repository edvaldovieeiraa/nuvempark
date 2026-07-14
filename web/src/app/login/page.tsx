"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { Marca } from "@/components/marca";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginConteudo />
    </Suspense>
  );
}

function LoginConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const confirmado = searchParams.get("confirmado") === "1";
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) {
      setErro("E-mail ou senha inválidos.");
      setCarregando(false);
      return;
    }
    toast.sucesso("Bem-vindo de volta!", "Carregando seu painel…");
    router.push("/painel");
    router.refresh();
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6 fundo-aurora relative overflow-hidden">
      {/* blobs decorativos flutuando */}
      <div className="pointer-events-none absolute top-[12%] left-[14%] w-72 h-72 rounded-full bg-brand-400/15 blur-3xl animate-float" />
      <div
        className="pointer-events-none absolute bottom-[8%] right-[10%] w-80 h-80 rounded-full bg-acento/12 blur-3xl animate-float"
        style={{ animationDelay: "-3s" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm relative"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ rotate: -8, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-acento-teal grid place-items-center shadow-[var(--shadow-brand)]"
          >
            <Marca className="w-9 h-9" />
          </motion.div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">
            Nuvem<span className="texto-brand-gradiente">Park</span>
          </h1>
          <p className="text-sm text-texto-2 mt-1">
            Sua rede de pátios, em tempo real.
          </p>
        </div>

        <motion.form
          onSubmit={entrar}
          animate={erro ? { x: [0, -10, 10, -6, 6, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="bg-superficie/80 backdrop-blur-xl border border-borda rounded-2xl p-6 shadow-[var(--shadow-card-hover)] space-y-4"
        >
          {confirmado && (
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl px-3.5 py-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              E-mail confirmado! Agora é só entrar.
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-texto-2 mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-3.5 rounded-xl border border-borda bg-superficie text-sm placeholder:text-texto-3 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
              placeholder="voce@empresa.com.br"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-texto-2 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                type={verSenha ? "text" : "password"}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full h-12 px-3.5 pr-11 rounded-xl border border-borda bg-superficie text-sm placeholder:text-texto-3 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-texto-3 hover:text-texto-2 transition-colors"
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
              className="flex items-center gap-2 text-sm font-semibold text-perigo bg-perigo-bg border border-perigo/20 rounded-xl px-3.5 py-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {erro}
            </motion.p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={carregando}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
            {carregando ? "Entrando…" : "Entrar no painel"}
          </motion.button>
        </motion.form>

        <p className="text-center text-sm text-texto-2 mt-6">
          Ainda não tem conta?{" "}
          <a href="/cadastro" className="font-bold text-brand-700 hover:underline">
            Teste grátis por 15 dias
          </a>
        </p>
        <p className="text-center text-xs text-texto-3 mt-2">
          Gestão de estacionamento na nuvem · nuvempark.com
        </p>
      </motion.div>
    </main>
  );
}

