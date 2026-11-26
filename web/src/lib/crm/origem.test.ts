import { describe, expect, it } from "vitest";
import {
  COOKIE_ORIGEM,
  cortarCaminho,
  cortarUtm,
  dominioDoCookie,
  extrairOrigem,
  lerOrigem,
  serializarOrigem,
  utmParaLead,
  type Origem,
} from "@/lib/crm/origem";

const AGORA = new Date("2026-11-26T12:00:00.000Z");

describe("extrairOrigem", () => {
  it("lê utm_* da query e o caminho sem a query", () => {
    expect(
      extrairOrigem(
        "https://nuvempark.com/solucoes/x?utm_source=google&utm_medium=cpc&utm_campaign=bf",
        AGORA,
      ),
    ).toEqual({
      v: 1,
      src: "google",
      med: "cpc",
      camp: "bf",
      caminho: "/solucoes/x",
      em: "2026-11-26T12:00:00.000Z",
    });
  });

  it("sem UTM: campos nulos, caminho preenchido; aceita objeto URL", () => {
    expect(extrairOrigem(new URL("https://nuvempark.com/"), AGORA)).toEqual({
      v: 1,
      src: null,
      med: null,
      camp: null,
      caminho: "/",
      em: "2026-11-26T12:00:00.000Z",
    });
  });

  it("URL inválida não lança", () => {
    expect(extrairOrigem("não é url", AGORA)).toBeNull();
  });

  it("UTM de 300 caracteres na URL sai com 100", () => {
    const o = extrairOrigem(`https://nuvempark.com/?utm_source=${"a".repeat(300)}`, AGORA);
    expect(o?.src).toHaveLength(100);
  });
});

describe("cortes", () => {
  it("UTM de 300 → 100; caminho de 300 → 200", () => {
    expect(cortarUtm("x".repeat(300))).toHaveLength(100);
    expect(cortarCaminho("/" + "y".repeat(299))).toHaveLength(200);
  });

  it("remove caractere de controle e apara", () => {
    expect(cortarUtm(" goo\u0000gle\n\t\u007f\u0085 ")).toBe("google");
    expect(cortarCaminho("/a\r\nb")).toBe("/ab");
  });

  it("vazio ou só controle vira null; não-string vira null", () => {
    expect(cortarUtm("   ")).toBeNull();
    expect(cortarUtm("\u0001\u0002")).toBeNull();
    expect(cortarUtm(42)).toBeNull();
    expect(cortarUtm(undefined)).toBeNull();
  });

  it("descarta surrogate solto (o Postgres recusaria o JSON)", () => {
    expect(cortarUtm("go\ud800ogle\udc00")).toBe("google");
    expect(lerOrigem(JSON.stringify({ v: 1, src: "\ud800" }))?.src).toBeNull();
    expect(cortarUtm("ok😀")).toBe("ok😀");
  });

  it("corta por caractere, sem partir emoji ao meio", () => {
    const v = "a".repeat(99) + "😀" + "b";
    const cortado = cortarUtm(v);
    expect(cortado).toBe("a".repeat(99) + "😀");
    expect(() => encodeURIComponent(cortado as string)).not.toThrow();
  });
});

describe("serializarOrigem / lerOrigem", () => {
  const origem: Origem = {
    v: 1,
    src: "google",
    med: "cpc",
    camp: "black friday; 50%",
    caminho: "/precos",
    em: "2026-11-26T12:00:00.000Z",
  };

  it("ida e volta, com e sem decodificação do valor", () => {
    const s = serializarOrigem(origem);
    expect(s).not.toBeNull();
    expect(s).not.toMatch(/[;,\s"]/);
    expect(lerOrigem(s)).toEqual(origem);
    expect(lerOrigem(decodeURIComponent(s as string))).toEqual(origem);
  });

  it("cookie ausente, vazio, truncado ou não-JSON → null sem lançar", () => {
    const s = serializarOrigem(origem) as string;
    for (const v of [undefined, null, "", s.slice(0, 20), "abc", "%E0%A4%A", "{"]) {
      expect(() => lerOrigem(v)).not.toThrow();
      expect(lerOrigem(v)).toBeNull();
    }
  });

  it("JSON que não é objeto ou versão errada → null", () => {
    for (const v of ["null", "[]", "1", '"x"', JSON.stringify({ ...origem, v: 2 })]) {
      expect(lerOrigem(v)).toBeNull();
    }
  });

  it("tipos errados viram null campo a campo", () => {
    expect(
      lerOrigem(JSON.stringify({ v: 1, src: 5, med: ["x"], camp: {}, caminho: 1, em: "ontem" })),
    ).toEqual({ v: 1, src: null, med: null, camp: null, caminho: null, em: null });
  });

  it("valor gigante → null; campo longo é cortado na leitura", () => {
    expect(lerOrigem("x".repeat(5000))).toBeNull();
    const longo = JSON.stringify({ ...origem, src: "s".repeat(300), caminho: "/" + "c".repeat(300) });
    const lido = lerOrigem(longo);
    expect(lido?.src).toHaveLength(100);
    expect(lido?.caminho).toHaveLength(200);
  });

  it("nome do cookie", () => {
    expect(COOKIE_ORIGEM).toBe("np_origem");
  });
});

describe("dominioDoCookie", () => {
  it("dev sem hosts → sem Domain", () => {
    expect(dominioDoCookie(undefined, undefined)).toBeUndefined();
    expect(dominioDoCookie("", "")).toBeUndefined();
    expect(dominioDoCookie("dashboard.nuvempark.com", undefined)).toBeUndefined();
  });

  it("app em subdomínio do site → .site", () => {
    expect(dominioDoCookie("dashboard.nuvempark.com", "nuvempark.com")).toBe(".nuvempark.com");
    expect(dominioDoCookie("Dashboard.NuvemPark.com", "nuvempark.com")).toBe(".nuvempark.com");
  });

  it("hosts sem relação → sem Domain", () => {
    expect(dominioDoCookie("app.outro.com", "nuvempark.com")).toBeUndefined();
    expect(dominioDoCookie("xnuvempark.com", "nuvempark.com")).toBeUndefined();
  });

  it("página fora do domínio (ex.: localhost com env de produção) → sem Domain", () => {
    expect(dominioDoCookie("dashboard.nuvempark.com", "nuvempark.com", "localhost")).toBeUndefined();
    expect(dominioDoCookie("dashboard.nuvempark.com", "nuvempark.com", "nuvempark.com")).toBe(
      ".nuvempark.com",
    );
    expect(
      dominioDoCookie("dashboard.nuvempark.com", "nuvempark.com", "dashboard.nuvempark.com"),
    ).toBe(".nuvempark.com");
  });
});

describe("utmParaLead", () => {
  it("null → tudo null", () => {
    expect(utmParaLead(null)).toEqual({ utm_source: null, utm_medium: null, utm_campaign: null });
  });

  it("corta de novo (o objeto pode ter vindo de fora)", () => {
    const r = utmParaLead({
      v: 1,
      src: "s".repeat(300),
      med: "cpc",
      camp: null,
      caminho: "/",
      em: null,
    });
    expect(r.utm_source).toHaveLength(100);
    expect(r.utm_medium).toBe("cpc");
    expect(r.utm_campaign).toBeNull();
  });
});
