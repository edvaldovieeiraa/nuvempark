"use client";

import { useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";

/**
 * Captura de e-mail. Grava em `blog_inscritos` via /api/blog/inscrever —
 * o envio (newsletter de fato) fica para uma etapa posterior.
 *
 * E-mail já cadastrado responde SUCESSO de propósito: uma mensagem de "já
 * existe" transformaria o formulário num verificador de e-mails.
 */

type Estado = "ocioso" | "enviando" | "ok" | "erro";

export function CapturaEmail({ compacto = false }: { compacto?: boolean }) {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<Estado>("ocioso");
  const [mensagem, setMensagem] = useState("");

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (estado === "enviando") return;

    setEstado("enviando");
    setMensagem("");

    try {
      const resposta = await fetch("/api/blog/inscrever", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const corpo: unknown = await resposta.json().catch(() => null);
      const erro =
        typeof corpo === "object" && corpo !== null && "erro" in corpo
          ? String((corpo as { erro: unknown }).erro)
          : "";

      if (!resposta.ok) {
        setEstado("erro");
        setMensagem(erro || "Não consegui inscrever agora. Tente de novo.");
        return;
      }

      setEstado("ok");
      setEmail("");
      setMensagem("Pronto! Você vai receber as próximas dicas por e-mail.");
    } catch {
      setEstado("erro");
      setMensagem("Sem conexão. Tente de novo em instantes.");
    }
  }

  const idAjuda = "captura-email-ajuda";

  return (
    <section
      className={
        compacto
          ? "rounded-2xl border border-borda bg-superficie p-6"
          : "rounded-3xl border border-brand-100 bg-brand-50 p-8 sm:p-10"
      }
    >
      <div className={compacto ? "" : "mx-auto max-w-xl text-center"}>
        {!compacto && (
          <span className="inline-grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 shadow-brand">
            <Mail className="h-5 w-5 text-white" aria-hidden />
          </span>
        )}

        <h2
          className={`font-black tracking-tight text-texto ${
            compacto ? "text-lg" : "mt-4 text-2xl"
          }`}
        >
          Receba dicas de gestão de estacionamento
        </h2>
        <p
          className={`text-texto-2 ${compacto ? "mt-1.5 text-sm" : "mt-3 text-[15px] leading-relaxed"}`}
        >
          Um e-mail por mês, no máximo, com o que funciona no pátio de verdade.
          Sem spam — cancele quando quiser.
        </p>

        <form
          onSubmit={enviar}
          className={`flex flex-col gap-2.5 sm:flex-row ${compacto ? "mt-4" : "mt-6"}`}
        >
          <label htmlFor="captura-email" className="sr-only">
            Seu melhor e-mail
          </label>
          <input
            id="captura-email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com.br"
            aria-describedby={mensagem ? idAjuda : undefined}
            className="h-12 flex-1 rounded-xl border border-borda bg-superficie px-4 text-[15px] text-texto placeholder:text-texto-3 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none"
          />
          <button
            type="submit"
            disabled={estado === "enviando"}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-[15px] font-bold text-white shadow-brand transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {estado === "enviando" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : estado === "ok" ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : null}
            {estado === "ok" ? "Inscrito" : "Quero receber"}
          </button>
        </form>

        {mensagem ? (
          <p
            id={idAjuda}
            role="status"
            aria-live="polite"
            className={`mt-3 text-sm font-semibold ${
              estado === "erro" ? "text-perigo" : "text-brand-700"
            }`}
          >
            {mensagem}
          </p>
        ) : null}
      </div>
    </section>
  );
}
