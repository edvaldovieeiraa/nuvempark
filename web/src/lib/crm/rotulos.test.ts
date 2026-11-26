import { describe, expect, it } from "vitest";
import { rotuloFonte, ROTULO_ESTAGIO, ROTULO_MOTIVO } from "@/lib/crm/rotulos";

describe("rotulos", () => {
  it("fonte mostra só o gravado; contato com rede vira 'Contato do site → Trial' (Revisão 4)", () => {
    expect(rotuloFonte({ fonte: "contato", tenantId: null })).toBe("Contato do site");
    expect(rotuloFonte({ fonte: "contato", tenantId: "t1" })).toBe("Contato do site → Trial");
    expect(rotuloFonte({ fonte: "importacao", tenantId: "t1" })).toBe("Importado");
    expect(rotuloFonte({ fonte: "master", tenantId: "t1" })).toBe("Master");
  });
  it("tem rótulo para todo estágio e motivo", () => {
    expect(ROTULO_ESTAGIO.em_contato).toBe("Em contato");
    expect(ROTULO_MOTIVO.cancelou).toBe("Cancelou o trial");
  });
});
