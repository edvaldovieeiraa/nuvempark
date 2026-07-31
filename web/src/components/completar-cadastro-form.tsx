"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, Check } from "lucide-react";
import { completarCadastro } from "@/app/cadastro/completar/actions";
import { formatarTelefone, telefoneValido } from "@/lib/telefone";

/* Mesma paleta literal do /cadastro (protótipo Claude Design). */
const VERDE = { g600: "#16A34A", g700: "#15803D", g500: "#22C55E" } as const;

const CHECKS = [
  "15 dias grátis",
  "Sem cartão de crédito",
  "Cancele quando quiser",
] as const;

export function CompletarCadastroForm({
  nomeSugerido,
  email,
}: {
  nomeSugerido: string;
  email: string;
}) {
  const router = useRouter();
  const [nomeRede, setNomeRede] = useState("");
  const [nome, setNome] = useState(nomeSugerido);
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const telInvalido = telefone.length > 0 && !telefoneValido(telefone);
  const podeEnviar =
    nomeRede.trim().length >= 2 && telefoneValido(telefone) && !salvando;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEnviar) return;
    setErro(null);
    setSalvando(true);
    const r = await completarCadastro({ nomeRede, nome, telefone });
    if (r?.ok) {
      router.push("/painel");
      router.refresh();
      return;
    }
    setErro(r?.msg ?? "Não foi possível concluir. Tente de novo.");
    setSalvando(false);
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: "100%", maxWidth: 420 }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#111827",
            }}
          >
            Falta pouco
          </h1>
          <p style={{ marginTop: 6, fontSize: 15, color: "#6B7280" }}>
            Entramos com <b style={{ color: "#111827" }}>{email}</b>. Só
            precisamos de mais dois dados para abrir seu painel.
          </p>
        </div>

        <motion.form
          onSubmit={enviar}
          animate={erro ? { x: [0, -8, 8, -5, 5, 0] } : {}}
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
          <div>
            <label htmlFor="nome_rede" style={labelStyle}>
              Nome do seu negócio
            </label>
            <input
              id="nome_rede"
              required
              value={nomeRede}
              onChange={(e) => setNomeRede(e.target.value)}
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
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como podemos te chamar?"
              className="cad-input"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="telefone" style={labelStyle}>
              Telefone / WhatsApp
            </label>
            <input
              id="telefone"
              type="tel"
              required
              inputMode="numeric"
              autoComplete="tel"
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(81) 90000-0000"
              className="cad-input"
              style={
                telInvalido
                  ? { ...inputStyle, border: "1px solid rgba(185,28,28,.5)" }
                  : inputStyle
              }
            />
            {telInvalido && (
              <p
                style={{
                  marginTop: 6,
                  marginBottom: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#B91C1C",
                }}
              >
                Informe o DDD + número (10 ou 11 dígitos).
              </p>
            )}
          </div>

          {erro && (
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
              {erro}
            </motion.p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={!podeEnviar}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(180deg,#16A34A,#166534)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor: podeEnviar ? "pointer" : "default",
              opacity: podeEnviar ? 1 : 0.7,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {salvando && <Loader2 size={16} className="animate-spin" />}
            {salvando ? "Criando sua conta…" : "Abrir meu painel"}
          </motion.button>

          <ul
            style={{ paddingTop: 2, display: "flex", flexDirection: "column", gap: 8 }}
          >
            {CHECKS.map((t) => (
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

        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#9CA3AF",
            marginTop: 20,
          }}
        >
          Não é você?{" "}
          <a href="/login" style={{ color: VERDE.g700, fontWeight: 700 }}>
            Entrar com outra conta
          </a>
        </p>
      </motion.div>
    </main>
  );
}
