import { describe, expect, it } from "vitest";
import { indiceAoTeclar, itensMenuEstagio } from "@/lib/crm/menu-estagio";
import type { Estagio, EstadoAssinatura, Fonte } from "@/lib/crm/tipos";

function lead(
  status: Estagio,
  extra: {
    tenantId?: string | null;
    assinaturaEstado?: EstadoAssinatura | null;
    fonte?: Fonte;
    temInteracaoHumana?: boolean;
  } = {},
) {
  return {
    status,
    tenantId: extra.tenantId ?? null,
    assinaturaEstado: extra.assinaturaEstado ?? null,
    fonte: extra.fonte ?? "manual",
    temInteracaoHumana: extra.temInteracaoHumana ?? false,
  };
}

describe("itensMenuEstagio", () => {
  it("todo estágio aparece, o atual marcado, na ordem do funil; perdido abre o motivo", () => {
    const m = itensMenuEstagio(lead("ganho", { tenantId: "t1", assinaturaEstado: "ativa" }));
    expect(m.itens.map((i) => (i.tipo === "atual" ? `[${i.estagio}]` : i.destino))).toEqual([
      "novo",
      "em_contato",
      "trial",
      "[ganho]",
      "perdido",
    ]);
    expect(m.itens.find((i) => i.tipo === "mover" && i.destino === "perdido")?.rotulo).toBe("Perdido…");
  });

  it("explica que Trial e Ganho também mudam sozinhos", () => {
    expect(itensMenuEstagio(lead("novo")).explicacao).toMatch(/sozinh/i);
  });

  it("conta que no computador também dá para arrastar", () => {
    expect(itensMenuEstagio(lead("novo")).explicacao).toMatch(/arrastar o card/);
  });

  it("não tem mais regra de spam: o Excluir vale para qualquer lead", () => {
    expect(itensMenuEstagio(lead("novo", { fonte: "manual" })) as object).not.toHaveProperty("podeExcluir");
  });
});

describe("indiceAoTeclar — setas, Home e End", () => {
  it("setas giram nas pontas", () => {
    expect(indiceAoTeclar(0, "ArrowDown", 3)).toBe(1);
    expect(indiceAoTeclar(2, "ArrowDown", 3)).toBe(0);
    expect(indiceAoTeclar(0, "ArrowUp", 3)).toBe(2);
  });

  it("Home e End", () => {
    expect(indiceAoTeclar(1, "Home", 3)).toBe(0);
    expect(indiceAoTeclar(1, "End", 3)).toBe(2);
  });

  it("sem foco num item: seta para baixo vai ao primeiro, para cima ao último", () => {
    expect(indiceAoTeclar(-1, "ArrowDown", 3)).toBe(0);
    expect(indiceAoTeclar(-1, "ArrowUp", 3)).toBe(2);
  });

  it("outra tecla ou menu vazio → null", () => {
    expect(indiceAoTeclar(0, "a", 3)).toBeNull();
    expect(indiceAoTeclar(0, "ArrowDown", 0)).toBeNull();
  });
});
