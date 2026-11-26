import { describe, expect, it } from "vitest";

// Prova do runner: o alias `@` resolve e o vitest roda fora do `next build`.
import { soDigitosTelefone } from "@/lib/telefone";

describe("runner", () => {
  it("resolve o alias @", () => {
    expect(typeof soDigitosTelefone).toBe("function");
  });
});
