import { describe, expect, it } from "vitest";
import { arrastoLigado, decidirSoltura, idColuna, estagioDaColuna } from "@/lib/crm/arrastar";

describe("decidirSoltura", () => {
  it("soltar na própria coluna não faz nada", () => {
    expect(decidirSoltura({ status: "novo" }, "novo")).toEqual({ tipo: "nada" });
  });

  it("soltar fora do quadro não faz nada", () => {
    expect(decidirSoltura({ status: "novo" }, null)).toEqual({ tipo: "nada" });
    expect(decidirSoltura({ status: "novo" }, "lixo")).toEqual({ tipo: "nada" });
  });

  it("Perdido pede o motivo", () => {
    expect(decidirSoltura({ status: "em_contato" }, "perdido")).toEqual({ tipo: "pedirMotivo" });
  });

  it("outra coluna move", () => {
    expect(decidirSoltura({ status: "novo" }, "em_contato")).toEqual({ tipo: "mover", destino: "em_contato" });
    expect(decidirSoltura({ status: "ganho" }, "trial")).toEqual({ tipo: "mover", destino: "trial" });
    expect(decidirSoltura({ status: "perdido" }, "novo")).toEqual({ tipo: "mover", destino: "novo" });
  });

  it("card já movendo não move de novo", () => {
    expect(decidirSoltura({ status: "novo" }, "trial", true)).toEqual({ tipo: "nada" });
  });
});

describe("ids das colunas", () => {
  it("ida e volta", () => {
    expect(idColuna("em_contato")).toBe("coluna:em_contato");
    expect(estagioDaColuna("coluna:em_contato")).toBe("em_contato");
    expect(estagioDaColuna("coluna:xyz")).toBeNull();
    expect(estagioDaColuna("em_contato")).toBeNull();
    expect(estagioDaColuna(null)).toBeNull();
  });
});

describe("arrastoLigado", () => {
  it("só com pelo menos 2 colunas visíveis", () => {
    expect(arrastoLigado(5)).toBe(true);
    expect(arrastoLigado(2)).toBe(true);
    expect(arrastoLigado(1)).toBe(false);
    expect(arrastoLigado(0)).toBe(false);
  });
});
