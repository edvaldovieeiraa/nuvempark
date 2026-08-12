"use client";

import { useActionState } from "react";
import { Ticket } from "lucide-react";
import { entrarParceiro, type Resultado } from "./actions";
import { Botao } from "@/components/ui/botao";
import { Campo, Input } from "@/components/ui/campos";

export default function LoginParceiroPage() {
  const [estado, agir, pendente] = useActionState<Resultado, FormData>(
    entrarParceiro,
    null,
  );

  return (
    <main className="min-h-dvh grid place-items-center bg-fundo px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 grid place-items-center mx-auto mb-3">
            <Ticket className="w-6 h-6 text-white" />
          </span>
          <h1 className="text-xl font-extrabold text-texto">
            Liberação de tickets
          </h1>
          <p className="text-sm text-texto-2 mt-1">
            Acesso do parceiro. Use o e-mail e a senha que o estacionamento
            enviou.
          </p>
        </div>

        <form
          action={agir}
          className="rounded-2xl border border-borda bg-superficie p-5 space-y-4"
        >
          <Campo label="E-mail">
            <Input
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoFocus
              required
            />
          </Campo>
          <Campo label="Senha">
            <Input
              name="senha"
              type="password"
              autoComplete="current-password"
              required
            />
          </Campo>

          {estado && !estado.ok && (
            <p
              role="alert"
              className="rounded-xl bg-perigo/10 border border-perigo/30 px-3 py-2 text-sm font-semibold text-perigo"
            >
              {estado.msg}
            </p>
          )}

          <Botao carregando={pendente} className="w-full">
            Entrar
          </Botao>
        </form>

        <p className="text-xs text-texto-2 text-center mt-4">
          Esqueceu a senha? Fale com o estacionamento — só eles conseguem
          gerar um acesso novo.
        </p>
      </div>
    </main>
  );
}
