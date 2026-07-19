import type { CSSProperties } from "react";

/**
 * Tokens literais do protótipo (Claude Design) da landing.
 * Valores fiéis ao HTML de origem — não usam os tokens brand-* do app
 * (que são um verde diferente). Mono = Geist Mono.
 */
export const MONO = "'Geist Mono', monospace";
export const POPPINS =
  '"Poppins", -apple-system, "Segoe UI", Roboto, sans-serif';

/** WhatsApp comercial da NuvemPark. */
export const WHATSAPP =
  "https://wa.me/5581996142120?text=Ol%C3%A1!%20Quero%20conhecer%20o%20NuvemPark";

/** Botão primário: gradiente verde da marca. */
export const btnPrimary = (height = 52, padding = 30): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  height,
  padding: `0 ${padding}px`,
  borderRadius: 14,
  background: "linear-gradient(90deg,#16A34A,#166534)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 16,
  boxShadow: "0 8px 24px -6px rgba(21,128,61,.5)",
  whiteSpace: "nowrap",
});

/** Botão secundário sobre fundo escuro. */
export const btnGhostDark: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 52,
  padding: "0 30px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.16)",
  background: "rgba(255,255,255,.03)",
  color: "rgba(255,255,255,.85)",
  fontWeight: 700,
  fontSize: 16,
  whiteSpace: "nowrap",
};

/** Etiqueta "olho" das seções (RECURSOS, PREÇO...). */
export const eyebrow: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: ".16em",
  color: "#16A34A",
};

/** Pílula/chip arredondado colorido. */
export const pill = (
  bg: string,
  border: string,
  color: string,
): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  borderRadius: 9999,
  background: bg,
  border: `1px solid ${border}`,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: ".08em",
  color,
});

/** Item de lista com check verde. */
export const listItem: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  fontSize: 15,
  color: "#1F2937",
  fontWeight: 600,
};

/** Cartão branco padrão das seções claras. */
export const card: CSSProperties = {
  borderRadius: 20,
  border: "1px solid #E5E7EB",
  background: "#fff",
  boxShadow:
    "0 1px 2px rgba(11,18,32,.04),0 4px 16px -4px rgba(11,18,32,.06)",
};

/** Título grande de seção (h2). */
export const h2: CSSProperties = {
  margin: "12px 0 0",
  fontSize: "clamp(2rem,4vw,2.75rem)",
  fontWeight: 800,
  letterSpacing: "-.02em",
  lineHeight: 1.08,
  color: "#1F2937",
};
