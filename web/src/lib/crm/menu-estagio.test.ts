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
  it("livre: estágio atual marcado e os destinos possíveis, na ordem do funil", () => {
    const m = itensMenuEstagio(lead("novo"));
    expect(m.itens).toEqual([
      { tipo: "atual", estagio: "novo", rotulo: "Novo" },
      { tipo: "mover", destino: "em_contato", rotulo: "Em contato" },
      { tipo: "mover", destino: "perdido", rotulo: "Perdido…" },
    ]);
    expect(m.explicacao).toBeNull();
    expect(m.bloqueio).toBeNull();
  });

  it("perdido sem rede volta para novo ou em contato", () => {
    const m = itensMenuEstagio(lead("perdido"));
    expect(m.itens.map((i) => (i.tipo === "mover" ? i.destino : i.tipo))).toEqual([
      "novo",
      "em_contato",
      "atual",
    ]);
  });

  it("trial: um item só, com a explicação fora do menu", () => {
    const m = itensMenuEstagio(lead("trial", { tenantId: "t1", assinaturaEstado: "trial" }));
    expect(m.itens).toEqual([
      { tipo: "mover", destino: "perdido", rotulo: "Perdido… (desistiu no teste)" },
    ]);
    expect(m.explicacao).toMatch(/automático/);
  });

  it("perdido com rede em trial: só Reabrir", () => {
    const m = itensMenuEstagio(lead("perdido", { tenantId: "t1", assinaturaEstado: "trial" }));
    expect(m.itens).toEqual([{ tipo: "reabrir", rotulo: "Reabrir (volta para Trial)" }]);
  });

  it("perdido com rede fora do trial e ganho: sem itens, com o motivo", () => {
    const p = itensMenuEstagio(lead("perdido", { tenantId: "t1", assinaturaEstado: "cancelada" }));
    expect(p.itens).toEqual([]);
    expect(p.bloqueio).toMatch(/não está mais em trial/);

    const g = itensMenuEstagio(lead("ganho", { tenantId: "t1", assinaturaEstado: "ativa" }));
    expect(g.itens).toEqual([]);
    expect(g.bloqueio).toMatch(/Ganho é automático/);
  });

  it("nunca oferece mover para o próprio estágio nem para trial ou ganho", () => {
    for (const s of ["novo", "em_contato", "trial", "ganho", "perdido"] as const) {
      for (const i of itensMenuEstagio(lead(s, { tenantId: "t1", assinaturaEstado: "trial" })).itens) {
        if (i.tipo !== "mover") continue;
        expect(i.destino).not.toBe(s);
        expect(["novo", "em_contato", "perdido"]).toContain(i.destino);
      }
    }
  });

  it("excluir como spam só para lead do formulário sem rede e sem interação humana", () => {
    expect(itensMenuEstagio(lead("novo", { fonte: "contato" })).podeExcluir).toBe(true);
    expect(itensMenuEstagio(lead("novo", { fonte: "manual" })).podeExcluir).toBe(false);
    expect(
      itensMenuEstagio(lead("novo", { fonte: "contato", temInteracaoHumana: true })).podeExcluir,
    ).toBe(false);
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
