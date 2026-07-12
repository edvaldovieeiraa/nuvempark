"use client";

import { useActionState } from "react";
import { Loader2, Send, CheckCircle2, AlertCircle } from "lucide-react";
import {
  reenviarConfirmacao,
  type ResultadoReenvio,
} from "@/app/auth/callback/actions";

export function ReenviarForm() {
  const [estado, agir, pendente] = useActionState<ResultadoReenvio, FormData>(
    reenviarConfirmacao,
    null,
  );

  if (estado?.ok) {
    return (
      <div className="flex items-center gap-2 justify-center text-sm font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        {estado.msg}
      </div>
    );
  }

  return (
    <form action={agir} className="space-y-2.5">
      <input
        name="email"
        type="email"
        required
        placeholder="seu@email.com.br"
        className="w-full h-12 px-3.5 rounded-xl border border-borda bg-superficie text-sm placeholder:text-texto-3 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
      />
      {estado && !estado.ok && (
        <p className="flex items-center gap-2 text-xs font-semibold text-perigo bg-perigo-bg border border-perigo/20 rounded-lg px-3 py-2 text-left">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {estado.msg}
        </p>
      )}
      <button
        type="submit"
        disabled={pendente}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        {pendente ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {pendente ? "Enviando…" : "Reenviar confirmação"}
      </button>
    </form>
  );
}
