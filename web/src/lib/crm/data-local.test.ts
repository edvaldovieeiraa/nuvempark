import { describe, expect, it } from "vitest";
import { isoParaLocalSP, localSPParaIso } from "@/lib/crm/data-local";

describe("localSPParaIso — o datetime-local é a hora de São Paulo", () => {
  it("converte com -03:00, independente do fuso do navegador", () => {
    expect(localSPParaIso("2026-11-26T09:30")).toBe("2026-11-26T12:30:00.000Z");
  });

  it("23:30 em São Paulo já é o dia seguinte em UTC", () => {
    expect(localSPParaIso("2026-11-26T23:30")).toBe("2026-11-27T02:30:00.000Z");
  });

  it("aceita segundos", () => {
    expect(localSPParaIso("2026-11-26T09:30:15")).toBe("2026-11-26T12:30:15.000Z");
  });

  it("vazio ou fora do formato → null", () => {
    expect(localSPParaIso("")).toBeNull();
    expect(localSPParaIso("   ")).toBeNull();
    expect(localSPParaIso("26/11/2026 09:30")).toBeNull();
    expect(localSPParaIso("2026-11-26")).toBeNull();
    expect(localSPParaIso("2026-13-40T99:99")).toBeNull();
  });
});

describe("isoParaLocalSP — preenche o datetime-local", () => {
  it("mostra o relógio de São Paulo", () => {
    expect(isoParaLocalSP("2026-11-26T12:30:00Z")).toBe("2026-11-26T09:30");
  });

  it("02:30 UTC ainda é o dia anterior em São Paulo", () => {
    expect(isoParaLocalSP("2026-11-27T02:30:00Z")).toBe("2026-11-26T23:30");
  });

  it("meia-noite sai como 00, não 24", () => {
    expect(isoParaLocalSP("2026-11-27T03:00:00Z")).toBe("2026-11-27T00:00");
  });

  it("ida e volta", () => {
    expect(localSPParaIso(isoParaLocalSP("2026-01-05T18:05:00Z"))).toBe("2026-01-05T18:05:00.000Z");
  });

  it("nulo ou inválido → vazio", () => {
    expect(isoParaLocalSP(null)).toBe("");
    expect(isoParaLocalSP("ontem")).toBe("");
  });
});
