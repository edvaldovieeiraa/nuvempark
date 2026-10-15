"use client";

import { AlertTriangle, Check, CircleAlert, Info } from "lucide-react";
import type { ErroCampo, Indisponivel } from "@/lib/contrato-painel";

/**
 * Tokens e peças do editor de contrato. Os tokens repetem os de
 * `nova-tarifa-form.tsx` (como `campos-hospede.tsx` já faz); as cores novas são
 * as do design (âmbar = só simulação / ainda não suportado; vermelho = erro;
 * azul = informação).
 */
export const cssLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#6B7280",
  marginBottom: 6,
};
export const cssInput: React.CSSProperties = {
  width: "100%",
  // 44 px: alvo de toque do design (o formulário avulso usa 42).
  height: 44,
  borderRadius: 11,
  border: "1px solid #E4E8EC",
  background: "#FAFBFC",
  fontSize: 13,
  color: "#1F2937",
  padding: "0 13px",
  outline: "none",
};
export const cssInputErro: React.CSSProperties = {
  border: "2px solid #DC2626",
  background: "#FEF2F2",
};
export const cssBtnOutline: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 44,
  padding: "0 16px",
  borderRadius: 11,
  border: "1px solid #E4E8EC",
  background: "#fff",
  fontSize: 13,
  fontWeight: 700,
  color: "#6B7280",
  cursor: "pointer",
};

export const COR = {
  ambar: { fundo: "#FEF7E6", borda: "#FCE3A6", texto: "#92400E", forte: "#78350F" },
  erro: { fundo: "#FEF2F2", borda: "#FECACA", texto: "#B91C1C", forte: "#991B1B" },
  info: { fundo: "#EFF6FF", borda: "#BFDBFE", texto: "#1E3A8A", forte: "#1E40AF" },
  verde: "#15803D",
};

/** Atributos de acessibilidade de um campo com (ou sem) erro. */
export function aria(campo: string, erro: ErroCampo | undefined) {
  return {
    id: campo,
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": erro ? `${campo}-erro` : undefined,
  } as const;
}

/** Mensagem embaixo do campo, ligada por `aria-describedby`. */
export function MensagemErro({ erro }: { erro: ErroCampo | undefined }) {
  if (!erro) return null;
  return (
    <p
      id={`${erro.campo}-erro`}
      style={{
        display: "flex",
        gap: 6,
        alignItems: "flex-start",
        margin: "6px 0 0",
        fontSize: 12,
        color: COR.erro.texto,
      }}
    >
      <CircleAlert aria-hidden style={{ width: 14, height: 14, flex: "none", marginTop: 1 }} />
      {erro.mensagem}
    </p>
  );
}

/** Bloco âmbar "Ainda não suportado" (códigos `nao_provado_*`). */
export function BlocoNaoSuportado({ erro }: { erro: ErroCampo }) {
  return (
    <div
      id={`${erro.campo}-${erro.codigo}`}
      style={{
        border: `1px solid ${COR.ambar.borda}`,
        background: COR.ambar.fundo,
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <AlertTriangle
        aria-hidden
        style={{ width: 18, height: 18, flex: "none", marginTop: 1, color: COR.ambar.texto }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: COR.ambar.texto }}>
          Ainda não suportado
        </span>
        <span style={{ fontSize: 12, color: COR.ambar.forte }}>{erro.mensagem}</span>
      </div>
    </div>
  );
}

/** Motivo de uma opção indisponível: cinza (regra) ou âmbar (ainda não suportado). */
export function Motivo({ id, motivo }: { id?: string; motivo: Indisponivel }) {
  return (
    <p
      id={id}
      style={{
        margin: "4px 0 0",
        fontSize: 12,
        color: motivo.tom === "nao_suportado" ? COR.ambar.texto : "#6B7280",
      }}
    >
      {motivo.motivo}
    </p>
  );
}

/** Etiqueta azul de origem na conversão ("veio do teto"). */
export function Origem({ texto }: { texto: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: COR.info.forte,
        background: COR.info.fundo,
        borderRadius: 999,
        padding: "2px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {texto}
    </span>
  );
}

/** Aviso azul (informação). */
export function AvisoInfo({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        fontSize: 12,
        color: COR.info.texto,
        background: COR.info.fundo,
        border: `1px solid ${COR.info.borda}`,
        borderRadius: 10,
        padding: "8px 10px",
      }}
    >
      <Info aria-hidden style={{ width: 14, height: 14, flex: "none", marginTop: 1 }} />
      {children}
    </p>
  );
}

/**
 * Chip de escolha (dias, fração/recomeçar): selecionado verde sólido com check,
 * nunca só cor; 44 px de altura.
 */
export function Chip({
  selecionado,
  papel,
  desabilitado,
  aoClicar,
  children,
  ...resto
}: {
  selecionado: boolean;
  papel: "radio" | "toggle";
  desabilitado?: boolean;
  aoClicar: () => void;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "role" | "disabled">) {
  return (
    <button
      type="button"
      {...resto}
      role={papel === "radio" ? "radio" : undefined}
      aria-checked={papel === "radio" ? selecionado : undefined}
      aria-pressed={papel === "toggle" ? selecionado : undefined}
      disabled={desabilitado}
      onClick={aoClicar}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 44,
        padding: "0 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        cursor: desabilitado ? "not-allowed" : "pointer",
        border: selecionado ? `1px solid ${COR.verde}` : "1px solid #D1D5DB",
        background: selecionado ? COR.verde : desabilitado ? "#F9FAFB" : "#fff",
        color: selecionado ? "#fff" : desabilitado ? "#9CA3AF" : "#374151",
      }}
    >
      {selecionado && <Check aria-hidden style={{ width: 14, height: 14 }} />}
      {children}
    </button>
  );
}
