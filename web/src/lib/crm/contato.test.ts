import { describe, expect, it } from "vitest";
import { normalizarContato, temContato, temWhatsApp } from "@/lib/crm/contato";

describe("normalizarContato", () => {
  it("e-mail em minúsculas e sem espaços; telefone só com dígitos", () => {
    expect(
      normalizarContato({ email: "  Ana.Souza@Exemplo.COM ", telefone: "(81) 99999-0001" }),
    ).toEqual({ ok: true, email: "ana.souza@exemplo.com", telefone: "81999990001" });
  });

  it("vazio vira null; basta um dos dois", () => {
    expect(normalizarContato({ email: "  ", telefone: "8133330000" })).toEqual({
      ok: true,
      email: null,
      telefone: "8133330000",
    });
    expect(normalizarContato({ email: "a@b.co", telefone: "" })).toEqual({
      ok: true,
      email: "a@b.co",
      telefone: null,
    });
  });

  it("nenhum contato é erro", () => {
    const r = normalizarContato({ email: " ", telefone: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.msg).toMatch(/pelo menos um contato/i);
  });

  it("e-mail mal formado é erro", () => {
    expect(normalizarContato({ email: "ana@", telefone: "" }).ok).toBe(false);
    expect(normalizarContato({ email: "a@b.co" + "x".repeat(260), telefone: "" }).ok).toBe(false);
  });

  it("telefone fora de 10 ou 11 dígitos é erro (não trunca)", () => {
    expect(normalizarContato({ email: "", telefone: "8199999" }).ok).toBe(false);
    expect(normalizarContato({ email: "", telefone: "55 81 99999-0001" }).ok).toBe(false);
  });
});

describe("temContato / temWhatsApp", () => {
  it("sem e-mail e sem telefone → sem contato", () => {
    expect(temContato({ email: null, telefone: null })).toBe(false);
    expect(temContato({ email: "", telefone: "" })).toBe(false);
    expect(temContato({ email: null, telefone: "8133330000" })).toBe(true);
  });

  it("10 dígitos (fixo) → sem WhatsApp; celular de 11 → com", () => {
    expect(temWhatsApp("8133330000")).toBe(false);
    expect(temWhatsApp("81999990001")).toBe(true);
    expect(temWhatsApp(null)).toBe(false);
  });
});
