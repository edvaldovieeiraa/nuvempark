import { describe, expect, it } from "vitest";
import { linksContato } from "@/lib/crm/atalhos";

describe("linksContato", () => {
  it("celular: WhatsApp, ligar e e-mail", () => {
    expect(linksContato({ telefone: "(81) 99876-5432", email: " Ana@Ex.com " })).toEqual({
      telefone: "81998765432",
      email: "ana@ex.com",
      whatsapp: "https://wa.me/5581998765432",
      tel: "tel:+5581998765432",
      mailto: "mailto:ana@ex.com",
    });
  });

  it("fixo (10 dígitos) não tem WhatsApp", () => {
    const l = linksContato({ telefone: "8133334444", email: null });
    expect(l.whatsapp).toBeNull();
    expect(l.tel).toBe("tel:+558133334444");
    expect(l.mailto).toBeNull();
  });

  it("sem contato: tudo nulo", () => {
    expect(linksContato({ telefone: "", email: "  " })).toEqual({
      telefone: null,
      email: null,
      whatsapp: null,
      tel: null,
      mailto: null,
    });
  });
});

describe("linksContato — e-mail vindo do formulário anônimo", () => {
  it("não deixa o e-mail injetar cc/body no mailto", () => {
    const l = linksContato({ telefone: null, email: "a@b.co?cc=x@y.com&body=oi" });
    expect(l.mailto).toBe("mailto:a@b.co%3Fcc%3Dx@y.com%26body%3Doi");
  });
});
