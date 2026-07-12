"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  MailCheck,
  Sparkles,
  Check,
} from "lucide-react";
import { criarContaTrial, type ResultadoCadastro } from "@/app/cadastro/actions";

export function CadastroForm() {
  const [verSenha, setVerSenha] = useState(false);
  const [estado, agir, pendente] = useActionState<ResultadoCadastro, FormData>(
    criarContaTrial,
    null,
  );

  if (estado?.ok) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 fundo-aurora">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center bg-superficie/80 backdrop-blur-xl border border-borda rounded-2xl p-8 shadow-[var(--shadow-card-hover)]"
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-50 grid place-items-center mx-auto">
            <MailCheck className="w-8 h-8 text-brand-600" />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight">
            Confirme seu e-mail
          </h1>
          <p className="mt-2 text-sm text-texto-2 leading-relaxed">
            Enviamos um link para <b className="text-texto">{estado.email}</b>.
            Clique nele para ativar sua conta e liberar seus{" "}
            <b>15 dias grátis</b>.
          </p>
          <p className="mt-4 text-xs text-texto-3">
            Não chegou? Verifique o spam ou aguarde alguns minutos.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-bold text-brand-700 hover:underline"
          >
            Já confirmei — ir para o login
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6 fundo-aurora relative overflow-hidden">
      <div className="pointer-events-none absolute top-[12%] left-[10%] w-72 h-72 rounded-full bg-brand-400/15 blur-3xl animate-float" />
      <div
        className="pointer-events-none absolute bottom-[8%] right-[8%] w-80 h-80 rounded-full bg-acento/12 blur-3xl animate-float"
        style={{ animationDelay: "-3s" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-3 py-1">
            <Sparkles className="w-3.5 h-3.5" />
            15 dias grátis · sem cartão
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-center">
            Comece agora
          </h1>
          <p className="text-sm text-texto-2 mt-1 text-center">
            Crie sua conta e libere o painel na hora.
          </p>
        </div>

        <motion.form
          action={agir}
          animate={estado && !estado.ok ? { x: [0, -8, 8, -5, 5, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="bg-superficie/80 backdrop-blur-xl border border-borda rounded-2xl p-6 shadow-[var(--shadow-card-hover)] space-y-4"
        >
          {/* honeypot invisível anti-bot */}
          <input
            type="text"
            name="empresa_site"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          <Campo label="Nome do seu negócio">
            <input
              name="nome_rede"
              required
              placeholder="Estacionamento Central"
              className={inputCls}
            />
          </Campo>
          <Campo label="Seu nome">
            <input name="nome" placeholder="Como podemos te chamar?" className={inputCls} />
          </Campo>
          <Campo label="E-mail">
            <input
              name="email"
              type="email"
              required
              placeholder="voce@empresa.com.br"
              className={inputCls}
            />
          </Campo>
          <Campo label="Senha (mín. 6 caracteres)">
            <div className="relative">
              <input
                name="senha"
                type={verSenha ? "text" : "password"}
                required
                minLength={6}
                placeholder="••••••••"
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-texto-3 hover:text-texto-2"
              >
                {verSenha ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </Campo>

          {estado && !estado.ok && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm font-semibold text-perigo bg-perigo-bg border border-perigo/20 rounded-xl px-3.5 py-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {estado.msg}
            </motion.p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={pendente}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {pendente && <Loader2 className="w-4 h-4 animate-spin" />}
            {pendente ? "Criando sua conta…" : "Criar conta grátis"}
          </motion.button>

          <ul className="pt-1 space-y-1.5">
            {["Liberação automática", "Sem cartão de crédito", "Cancele quando quiser"].map(
              (t) => (
                <li key={t} className="flex items-center gap-2 text-xs text-texto-2">
                  <Check className="w-3.5 h-3.5 text-brand-600" />
                  {t}
                </li>
              ),
            )}
          </ul>
        </motion.form>

        <p className="text-center text-sm text-texto-3 mt-6">
          Já tem conta?{" "}
          <Link href="/login" className="font-bold text-brand-700 hover:underline">
            Entrar
          </Link>
        </p>
      </motion.div>
    </main>
  );
}

const inputCls =
  "w-full h-12 px-3.5 rounded-xl border border-borda bg-superficie text-sm placeholder:text-texto-3 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15";

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-texto-2 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
