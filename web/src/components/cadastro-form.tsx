"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, AlertCircle, MailCheck, Check } from "lucide-react";
import { criarContaTrial, type ResultadoCadastro } from "@/app/cadastro/actions";

/* Cores literais do protótipo Claude Design (NÃO usar tokens brand-* do app). */
const VERDE = {
  g600: "#16A34A",
  g700: "#15803D",
  g800: "#166534",
  g500: "#22C55E",
  g300: "#86EFAC",
  bg100: "#DCFCE7",
} as const;

const CHECKS = [
  "Liberação automática, sem falar com vendedor",
  "Sem cartão de crédito no teste",
  "Cancele quando quiser",
] as const;

const CHECKS_CURTOS = [
  "Liberação automática",
  "Sem cartão de crédito",
  "Cancele quando quiser",
] as const;

function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <Link
      href="/"
      style={{ fontSize: size, letterSpacing: "-0.01em", textDecoration: "none" }}
    >
      <span style={{ fontWeight: 300, color: "#FFFFFF" }}>Nuvem</span>
      <span style={{ fontWeight: 800, color: VERDE.g500 }}>Park</span>
    </Link>
  );
}

function CircleCheck({ size = 20 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(34,197,94,.15)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <Check size={size * 0.6} color={VERDE.g500} strokeWidth={3} />
    </span>
  );
}

export function CadastroForm() {
  const [verSenha, setVerSenha] = useState(false);
  const [estado, agir, pendente] = useActionState<ResultadoCadastro, FormData>(
    criarContaTrial,
    null,
  );

  /* ---------- Estado de sucesso: "Confirme seu e-mail" ---------- */
  if (estado?.ok) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#F9FAFB",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            width: "100%",
            maxWidth: 420,
            textAlign: "center",
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 20,
            padding: 32,
            boxShadow: "0 24px 64px -24px rgba(11,18,32,.14)",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: VERDE.bg100,
              display: "grid",
              placeItems: "center",
              margin: "0 auto",
            }}
          >
            <MailCheck size={32} color={VERDE.g600} />
          </div>
          <h2
            style={{
              marginTop: 20,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#111827",
            }}
          >
            Confirme seu e-mail
          </h2>
          <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: "#6B7280" }}>
            Enviamos um link para <b style={{ color: "#111827" }}>{estado.email}</b>.
            Clique nele para ativar sua conta e liberar seus{" "}
            <b style={{ color: "#111827" }}>15 dias grátis</b>.
          </p>
          <p style={{ marginTop: 16, fontSize: 12, color: "#9CA3AF" }}>
            Não chegou? Verifique o spam ou aguarde alguns minutos.
          </p>
          <Link
            href="/login"
            style={{
              marginTop: 24,
              display: "inline-block",
              fontSize: 14,
              fontWeight: 700,
              color: VERDE.g700,
              textDecoration: "none",
            }}
          >
            Já confirmei — ir para o login
          </Link>
        </motion.div>
      </main>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 48,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    background: "#fff",
    fontSize: 14,
    color: "#111827",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#6B7280",
    marginBottom: 6,
  };

  /* ---------- Estado padrão: split-screen ---------- */
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexWrap: "wrap" }}>
      {/* ============ PAINEL ESQUERDO — marca (oculto <900px) ============ */}
      <div
        className="cad-left"
        style={{
          flex: "1 1 420px",
          minHeight: "100vh",
          background:
            "radial-gradient(55% 45% at 30% 20%,rgba(22,163,74,.16),transparent 70%), #0B1220",
          padding: "40px 56px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* topo: wordmark */}
        <Wordmark size={20} />

        {/* meio */}
        <div style={{ maxWidth: 420 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
              color: VERDE.g300,
              border: "1px solid rgba(34,197,94,.35)",
              background: "rgba(34,197,94,.1)",
              borderRadius: 999,
              padding: "6px 12px",
            }}
          >
            <span
              className="cad-dot"
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: VERDE.g500,
                display: "inline-block",
              }}
            />
            15 dias grátis · sem cartão
          </span>

          <h1
            style={{
              marginTop: 24,
              fontSize: "clamp(1.9rem,3vw,2.5rem)",
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: "-0.02em",
              lineHeight: 1.12,
            }}
          >
            Seu pátio operando na nuvem ainda hoje
          </h1>

          <p
            style={{
              marginTop: 16,
              fontSize: 16,
              lineHeight: 1.6,
              color: "rgba(255,255,255,.66)",
            }}
          >
            Crie a conta, confirme o e-mail e o painel abre na hora — com todos os
            recursos liberados.
          </p>

          <ul style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
            {CHECKS.map((t) => (
              <li
                key={t}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 15,
                  color: "rgba(255,255,255,.82)",
                }}
              >
                <CircleCheck />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* base */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <span
            style={{
              fontFamily: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 13,
              color: "rgba(255,255,255,.5)",
            }}
          >
            app.nuvempark.com/cadastro
          </span>
          <Link
            href="/"
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,.66)",
              textDecoration: "none",
            }}
          >
            ← Voltar ao site
          </Link>
        </div>
      </div>

      {/* ============ PAINEL DIREITO — formulário ============ */}
      <div
        style={{
          flex: "1 1 480px",
          minHeight: "100vh",
          background: "#F9FAFB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* logo só no mobile (<900px) */}
          <div
            className="cad-mobile-logo"
            style={{ justifyContent: "center", marginBottom: 24 }}
          >
            <Link href="/" style={{ fontSize: 22, textDecoration: "none" }}>
              <span style={{ fontWeight: 300, color: "#0B1220" }}>Nuvem</span>
              <span style={{ fontWeight: 800, color: VERDE.g600 }}>Park</span>
            </Link>
          </div>

          {/* cabeçalho */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h2
              style={{
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#111827",
              }}
            >
              Comece agora
            </h2>
            <p style={{ marginTop: 6, fontSize: 15, color: "#6B7280" }}>
              Crie sua conta e libere o painel na hora.
            </p>
          </div>

          {/* card do formulário */}
          <motion.form
            action={agir}
            animate={estado && !estado.ok ? { x: [0, -8, 8, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
            style={{
              background: "#fff",
              border: "1px solid #E5E7EB",
              borderRadius: 20,
              padding: 24,
              boxShadow: "0 24px 64px -24px rgba(11,18,32,.14)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* honeypot invisível anti-bot */}
            <input
              type="text"
              name="empresa_site"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />

            <div>
              <label htmlFor="nome_rede" style={labelStyle}>
                Nome do seu negócio
              </label>
              <input
                id="nome_rede"
                name="nome_rede"
                required
                placeholder="Estacionamento Central"
                className="cad-input"
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="nome" style={labelStyle}>
                Seu nome
              </label>
              <input
                id="nome"
                name="nome"
                placeholder="Como podemos te chamar?"
                className="cad-input"
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="email" style={labelStyle}>
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="voce@empresa.com.br"
                className="cad-input"
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="senha" style={labelStyle}>
                Senha (mín. 6 caracteres)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="senha"
                  name="senha"
                  type={verSenha ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="cad-input"
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setVerSenha((v) => !v)}
                  aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#9CA3AF",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {estado && !estado.ok && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#B91C1C",
                  background: "#FEF2F2",
                  border: "1px solid rgba(185,28,28,.2)",
                  borderRadius: 12,
                  padding: "10px 14px",
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                {estado.msg}
              </motion.p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={pendente}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(180deg,#16A34A,#166534)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: pendente ? "default" : "pointer",
                opacity: pendente ? 0.7 : 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {pendente && <Loader2 size={16} className="animate-spin" />}
              {pendente ? "Criando sua conta…" : "Criar conta grátis"}
            </motion.button>

            <ul style={{ paddingTop: 2, display: "flex", flexDirection: "column", gap: 8 }}>
              {CHECKS_CURTOS.map((t) => (
                <li
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                >
                  <Check size={14} color={VERDE.g600} strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>
          </motion.form>

          {/* rodapé */}
          <p style={{ textAlign: "center", fontSize: 14, color: "#6B7280", marginTop: 24 }}>
            Já tem conta?{" "}
            <Link
              href="/login"
              style={{ fontWeight: 700, color: VERDE.g700, textDecoration: "none" }}
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
