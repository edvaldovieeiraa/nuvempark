"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertTriangle, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ReenviarForm } from "@/components/reenviar-form";

type Estado =
  | { tipo: "processando" }
  | { tipo: "sucesso" }
  | { tipo: "ja_confirmado" }
  | { tipo: "expirado" }
  | { tipo: "erro"; detalhe: string };

export function CallbackHandler() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ tipo: "processando" });

  useEffect(() => {
    async function processar() {
      // 1) Erros vêm na query string (?error=...&error_code=...)
      const query = new URLSearchParams(window.location.search);
      const erroCode = query.get("error_code") || query.get("error");
      const erroDesc = query.get("error_description") || "";

      if (erroCode) {
        // otp_expired = link expirado; access_denied costuma vir junto de já-usado
        if (
          erroCode.includes("otp_expired") ||
          erroDesc.toLowerCase().includes("expired")
        ) {
          setEstado({ tipo: "expirado" });
        } else if (
          erroDesc.toLowerCase().includes("already") ||
          erroCode.includes("access_denied")
        ) {
          setEstado({ tipo: "ja_confirmado" });
        } else {
          setEstado({ tipo: "erro", detalhe: erroDesc || erroCode });
        }
        return;
      }

      // 2) Sucesso: tokens vêm no fragmento (#access_token=...&refresh_token=...)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (accessToken && refreshToken) {
        // O clique no link confirma o e-mail. Não mantemos a sessão aqui —
        // por decisão de UX, o usuário faz o primeiro login com e-mail+senha
        // (assim ele fixa a senha na memória). Encerramos a sessão temporária
        // e mandamos pro login com aviso de sucesso.
        const supabase = createClient();
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        await supabase.auth.signOut();
        setEstado({ tipo: "sucesso" });
        setTimeout(() => {
          router.push("/login?confirmado=1");
        }, 1200);
        return;
      }

      // 3) Sem token e sem erro: provavelmente já confirmado / link consumido
      setEstado({ tipo: "ja_confirmado" });
    }

    processar();
  }, [router]);

  return (
    <main className="flex-1 flex items-center justify-center p-6 fundo-aurora">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md text-center bg-superficie/85 backdrop-blur-xl border border-borda rounded-2xl p-8 shadow-[var(--shadow-card-hover)]"
      >
        {estado.tipo === "processando" && (
          <>
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto" />
            <p className="mt-4 text-sm text-texto-2">Confirmando seu e-mail…</p>
          </>
        )}

        {estado.tipo === "sucesso" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-brand-50 grid place-items-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-brand-600" />
            </div>
            <h1 className="mt-5 text-2xl font-black tracking-tight">
              E-mail confirmado! 🎉
            </h1>
            <p className="mt-2 text-sm text-texto-2">
              Tudo certo. Levando você para o login…
            </p>
            <Loader2 className="w-5 h-5 text-brand-500 animate-spin mx-auto mt-4" />
          </>
        )}

        {estado.tipo === "ja_confirmado" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-brand-50 grid place-items-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-brand-600" />
            </div>
            <h1 className="mt-5 text-2xl font-black tracking-tight">
              Seu e-mail já está confirmado
            </h1>
            <p className="mt-2 text-sm text-texto-2">
              Não precisa fazer de novo — é só entrar com seu e-mail e senha.
            </p>
            <Link
              href="/login?confirmado=1"
              className="mt-6 inline-flex items-center justify-center h-12 px-7 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold shadow-[var(--shadow-brand)] hover:brightness-110 transition-all"
            >
              Ir para o login
            </Link>
          </>
        )}

        {estado.tipo === "expirado" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-aviso-bg grid place-items-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-aviso" />
            </div>
            <h1 className="mt-5 text-2xl font-black tracking-tight">
              Este link expirou
            </h1>
            <p className="mt-2 text-sm text-texto-2 leading-relaxed">
              Os links de confirmação valem por tempo limitado. Sem problema —
              informe seu e-mail e enviamos um novo agora.
            </p>
            <div className="mt-6">
              <ReenviarForm />
            </div>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-bold text-texto-3 hover:text-texto"
            >
              Voltar ao login
            </Link>
          </>
        )}

        {estado.tipo === "erro" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-perigo-bg grid place-items-center mx-auto">
              <MailCheck className="w-8 h-8 text-perigo" />
            </div>
            <h1 className="mt-5 text-2xl font-black tracking-tight">
              Não conseguimos confirmar
            </h1>
            <p className="mt-2 text-sm text-texto-2 leading-relaxed">
              Algo deu errado com este link. Você pode pedir um novo abaixo.
            </p>
            <div className="mt-6">
              <ReenviarForm />
            </div>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-bold text-texto-3 hover:text-texto"
            >
              Voltar ao login
            </Link>
          </>
        )}
      </motion.div>
    </main>
  );
}
