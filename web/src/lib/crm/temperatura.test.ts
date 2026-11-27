import { describe, expect, it } from "vitest";
import {
  OPCOES_TEMPERATURA,
  ROTULO_TEMPERATURA,
  ehTemperatura,
  textoInteracaoTemperatura,
  validarTemperatura,
} from "@/lib/crm/temperatura";

describe("temperatura", () => {
  it("rótulos dos três níveis", () => {
    expect(ROTULO_TEMPERATURA).toEqual({ quente: "Quente", morno: "Morno", frio: "Frio" });
  });

  it("seletor: Sem marca, Frio, Morno, Quente, nessa ordem", () => {
    expect(OPCOES_TEMPERATURA.map((o) => [o.valor, o.rotulo])).toEqual([
      [null, "Sem marca"],
      ["frio", "Frio"],
      ["morno", "Morno"],
      ["quente", "Quente"],
    ]);
  });

  it("reconhece só os três valores", () => {
    expect(ehTemperatura("quente")).toBe(true);
    expect(ehTemperatura("frio")).toBe(true);
    expect(ehTemperatura("Quente")).toBe(false);
    expect(ehTemperatura("")).toBe(false);
    expect(ehTemperatura(null)).toBe(false);
    expect(ehTemperatura(3)).toBe(false);
  });

  it("texto da linha do tempo igual ao do banco", () => {
    expect(textoInteracaoTemperatura(null, "quente")).toBe("Temperatura: — → Quente");
    expect(textoInteracaoTemperatura("morno", "frio")).toBe("Temperatura: Morno → Frio");
    expect(textoInteracaoTemperatura("frio", null)).toBe("Temperatura: Frio → —");
  });

  it("valida a troca", () => {
    expect(validarTemperatura({ de: null, para: "quente" })).toEqual({ ok: true, de: null, para: "quente" });
    expect(validarTemperatura({ de: "quente", para: null })).toEqual({ ok: true, de: "quente", para: null });
    expect(validarTemperatura({ de: "morno", para: "morno" })).toMatchObject({ ok: false });
    expect(validarTemperatura({ de: null, para: "fervendo" as never })).toMatchObject({ ok: false });
    expect(validarTemperatura({ de: "x" as never, para: "frio" })).toMatchObject({ ok: false });
  });
});
