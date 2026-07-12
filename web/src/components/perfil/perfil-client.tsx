"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UserRound, Building2, KeyRound, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { Campo, Input } from "@/components/ui/campos";

export function PerfilClient({
  email,
  criadoEm,
  tenantNome,
  tenantCodigo,
  patiosAtivos,
  patiosTotal,
}: {
  email: string;
  criadoEm: string | null;
  tenantNome: string;
  tenantCodigo: string;
  patiosAtivos: number;
  patiosTotal: number;
}) {
  const toast = useToast();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function alterarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      toast.erro("Senha curta", "Use pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirma) {
      toast.erro("Não confere", "As duas senhas precisam ser iguais.");
      return;
    }
    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      toast.erro("Não deu certo", "Não foi possível alterar a senha.");
      return;
    }
    setSenha("");
    setConfirma("");
    toast.sucesso("Senha alterada!", "Use a nova senha no próximo login.");
  }

  const inicial = email.charAt(0).toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[26px] font-black tracking-tight">Perfil</h1>
        <p className="text-sm text-texto-2">
          Sua conta de gestor e os dados da rede.
        </p>
      </motion.header>

      {/* Conta */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-acento grid place-items-center text-white text-xl font-black shrink-0">
            {inicial}
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-lg truncate">{email}</p>
            <p className="text-xs text-texto-3 flex items-center gap-1.5">
              <UserRound className="w-3.5 h-3.5" />
              Gestor da rede
              {criadoEm &&
                ` · conta criada em ${new Date(criadoEm).toLocaleDateString("pt-BR")}`}
            </p>
          </div>
        </div>
      </motion.section>

      {/* Rede */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center">
            <Building2 className="w-4 h-4 text-brand-600" />
          </span>
          <h2 className="font-bold">Sua rede</h2>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-texto-2">Nome</dt>
            <dd className="font-bold">{tenantNome}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-texto-2">Código interno da rede</dt>
            <dd className="font-mono font-black tracking-[0.25em] text-texto-2 bg-fundo border border-borda rounded-lg px-2.5 py-1 text-xs">
              {tenantCodigo}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-texto-2">Pátios</dt>
            <dd className="font-bold tabular-nums">
              {patiosAtivos} ativos{" "}
              <span className="text-texto-3 font-normal">
                de {patiosTotal}
              </span>
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-texto-3 leading-relaxed">
          O código que o operador usa no app é o <b>de cada pátio</b> — veja em
          Cadastros → Pátios.
        </p>
      </motion.section>

      {/* Alterar senha */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.14 }}
        className="bg-superficie border border-borda rounded-2xl shadow-[var(--shadow-card)] p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-lg bg-brand-50 grid place-items-center">
            <KeyRound className="w-4 h-4 text-brand-600" />
          </span>
          <h2 className="font-bold">Alterar senha</h2>
        </div>
        <form
          onSubmit={alterarSenha}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg"
        >
          <Campo label="Nova senha (mín. 6)">
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={6}
              required
            />
          </Campo>
          <Campo label="Confirmar nova senha">
            <Input
              type="password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              minLength={6}
              required
            />
          </Campo>
          <div className="col-span-full">
            <button
              type="submit"
              disabled={salvando}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-sm shadow-[var(--shadow-brand)] hover:brightness-110 transition-all disabled:opacity-60"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar nova senha
            </button>
          </div>
        </form>
      </motion.section>
    </div>
  );
}
