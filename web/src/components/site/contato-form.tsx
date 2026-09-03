"use client";

import { useId, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { formatarTelefone, soDigitosTelefone, telefoneValido } from "@/lib/telefone";

/**
 * Formulário de contato do site. Substituiu o cartão de `mailto:` —
 * o lead cai em `leads_site` (db/39) e aparece em /master/leads.
 *
 * Os estilos são inline como no resto do site público: esta parte do produto
 * não usa os tokens Tailwind do app (verde diferente, ver components/site/tokens).
 *
 * A validação daqui é só para o visitante não perder a viagem. A que vale mora
 * no CHECK da policy (db/39), porque a chave anon é pública.
 */

type Estado = "ocioso" | "enviando" | "ok" | "erro";

const VERDE = "#16A34A";
const BORDA = "#E5E7EB";

const rotulo: CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
  marginBottom: 6,
};

function campoStyle(temErro: boolean): CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    height: 46,
    padding: "0 14px",
    borderRadius: 12,
    border: `1px solid ${temErro ? "#DC2626" : BORDA}`,
    background: "#fff",
    fontSize: 15,
    color: "#1F2937",
    fontFamily: "inherit",
    outlineColor: VERDE,
  };
}

export function ContatoForm() {
  const pathname = usePathname();
  const id = useId();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [assunto, setAssunto] = useState("");
  const [estado, setEstado] = useState<Estado>("ocioso");
  const [erro, setErro] = useState("");
  const [campoRuim, setCampoRuim] = useState<string | null>(null);

  function falhar(campo: string, msg: string) {
    setCampoRuim(campo);
    setErro(msg);
    setEstado("erro");
    document.getElementById(`${id}-${campo}`)?.focus();
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (estado === "enviando") return;

    if (nome.trim().length < 2) return falhar("nome", "Informe seu nome.");
    if (!telefoneValido(telefone))
      return falhar("telefone", "Informe um telefone válido com DDD.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      return falhar("email", "Informe um e-mail válido.");
    if (assunto.trim().length < 5)
      return falhar("assunto", "Conte um pouco mais sobre o que você precisa.");

    setEstado("enviando");
    setErro("");
    setCampoRuim(null);

    const form = evento.currentTarget;
    const honeypot = (form.elements.namedItem("empresa_site") as HTMLInputElement | null)?.value ?? "";

    try {
      const resposta = await fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: soDigitosTelefone(telefone),
          email: email.trim(),
          assunto: assunto.trim(),
          origem: pathname,
          empresa_site: honeypot,
        }),
      });
      const corpo: unknown = await resposta.json().catch(() => null);
      const msg =
        typeof corpo === "object" && corpo !== null && "erro" in corpo
          ? String((corpo as { erro: unknown }).erro)
          : "";

      if (!resposta.ok) {
        setEstado("erro");
        setErro(msg || "Não consegui enviar agora. Tente de novo.");
        return;
      }

      setEstado("ok");
      setNome("");
      setTelefone("");
      setEmail("");
      setAssunto("");
    } catch {
      setEstado("erro");
      setErro("Sem conexão. Tente de novo em instantes.");
    }
  }

  if (estado === "ok") {
    return (
      <div
        style={{
          height: "100%",
          borderRadius: 20,
          border: `1px solid ${BORDA}`,
          background: "#fff",
          padding: 28,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 48,
            height: 48,
            borderRadius: 16,
            background: "rgba(22,163,74,.1)",
            color: VERDE,
          }}
        >
          <CheckCircle2 size={24} strokeWidth={2.2} />
        </span>
        <h3 style={{ margin: "18px 0 0", fontSize: 19, fontWeight: 800, color: "#1F2937" }}>
          Recebemos sua mensagem
        </h3>
        <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.55, color: "#6B7280" }}>
          Respondemos em horário comercial, normalmente no mesmo dia. Se for
          urgente, chame no WhatsApp ao lado — é mais rápido.
        </p>
        <button
          type="button"
          onClick={() => setEstado("ocioso")}
          style={{
            marginTop: 18,
            border: "none",
            background: "none",
            padding: 0,
            cursor: "pointer",
            font: "inherit",
            fontSize: 14,
            fontWeight: 700,
            color: "#15803D",
          }}
        >
          Enviar outra mensagem
        </button>
      </div>
    );
  }

  const enviando = estado === "enviando";

  return (
    <form
      onSubmit={enviar}
      noValidate
      style={{
        height: "100%",
        borderRadius: 20,
        border: `1px solid ${BORDA}`,
        background: "#fff",
        padding: 28,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#1F2937" }}>
        Deixe seu contato
      </h3>
      <p style={{ margin: "8px 0 20px", fontSize: 14, lineHeight: 1.55, color: "#6B7280" }}>
        Preencha e a gente retorna. Sem cadastro, sem compromisso.
      </p>

      {/* Honeypot: invisível para gente, irresistível para bot. */}
      <div style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }} aria-hidden>
        <label htmlFor={`${id}-empresa_site`}>Não preencha este campo</label>
        <input id={`${id}-empresa_site`} name="empresa_site" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <label htmlFor={`${id}-nome`} style={rotulo}>Nome</label>
          <input
            id={`${id}-nome`}
            name="nome"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como podemos te chamar?"
            style={campoStyle(campoRuim === "nome")}
          />
        </div>

        <div data-contato-linha style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label htmlFor={`${id}-telefone`} style={rotulo}>Telefone</label>
            <input
              id={`${id}-telefone`}
              name="telefone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(81) 99999-9999"
              style={campoStyle(campoRuim === "telefone")}
            />
          </div>
          <div>
            <label htmlFor={`${id}-email`} style={rotulo}>E-mail</label>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com.br"
              style={campoStyle(campoRuim === "email")}
            />
          </div>
        </div>

        <div>
          <label htmlFor={`${id}-assunto`} style={rotulo}>Assunto</label>
          <textarea
            id={`${id}-assunto`}
            name="assunto"
            required
            rows={4}
            maxLength={2000}
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            placeholder="Quantos pátios você opera e o que precisa resolver?"
            style={{
              ...campoStyle(campoRuim === "assunto"),
              height: "auto",
              padding: "12px 14px",
              lineHeight: 1.5,
              resize: "vertical",
            }}
          />
        </div>
      </div>

      {estado === "erro" && erro && (
        <p
          role="alert"
          style={{
            margin: "14px 0 0",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            fontSize: 14,
            color: "#B91C1C",
          }}
        >
          <AlertCircle size={16} strokeWidth={2.4} style={{ flex: "none", marginTop: 2 }} />
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        style={{
          marginTop: 18,
          width: "100%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          height: 50,
          borderRadius: 14,
          border: "none",
          background: "linear-gradient(90deg,#16A34A,#166534)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 16,
          fontFamily: "inherit",
          cursor: enviando ? "default" : "pointer",
          opacity: enviando ? 0.7 : 1,
          boxShadow: "0 8px 24px -6px rgba(21,128,61,.5)",
        }}
      >
        {enviando ? (
          <>
            <Loader2 size={18} strokeWidth={2.4} style={{ animation: "np-spin 1s linear infinite" }} />
            Enviando…
          </>
        ) : (
          <>
            Enviar mensagem
            <ArrowRight size={16} strokeWidth={2.4} />
          </>
        )}
      </button>

      <p style={{ margin: "12px 0 0", fontSize: 12, lineHeight: 1.5, color: "#9CA3AF" }}>
        Usamos seus dados só para responder este contato. Não compartilhamos com
        ninguém.
      </p>
    </form>
  );
}
