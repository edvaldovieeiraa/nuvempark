import { describe, expect, it } from "vitest";
import {
  aplicarFiltros,
  casaBusca,
  contarPorEstagio,
  naJanela,
  opcoesFonte,
  opcoesPraca,
} from "@/lib/crm/filtros";
import type { Estagio, Fonte } from "@/lib/crm/tipos";

const AGORA = new Date("2026-11-26T12:00:00Z");

type L = {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  status: Estagio;
  fonte: Fonte;
  praca: string | null;
  estagioEm: string;
};

function lead(p: Partial<L> = {}): L {
  return {
    id: "l1",
    nome: "Ana Lúcia",
    empresa: "Estacionamento São José",
    email: "ana@saojose.com.br",
    telefone: "81998765432",
    status: "novo",
    fonte: "contato",
    praca: "Recife · PE",
    estagioEm: "2026-11-20T12:00:00Z",
    ...p,
  };
}

describe("casaBusca", () => {
  it("termo vazio casa tudo", () => {
    expect(casaBusca(lead(), "")).toBe(true);
    expect(casaBusca(lead(), "   ")).toBe(true);
  });

  it("nome, empresa e e-mail sem caixa e sem acento", () => {
    expect(casaBusca(lead(), "lucia")).toBe(true);
    expect(casaBusca(lead(), "SAO JOSÉ")).toBe(true);
    expect(casaBusca(lead(), "@saojose")).toBe(true);
    expect(casaBusca(lead(), "pedro")).toBe(false);
  });

  it("telefone pelos dígitos, com ou sem máscara", () => {
    expect(casaBusca(lead(), "(81) 99876")).toBe(true);
    expect(casaBusca(lead(), "98765-432")).toBe(true);
    expect(casaBusca(lead(), "11 9999")).toBe(false);
  });

  it("termo sem dígito não casa por telefone (senão casaria todo lead com telefone)", () => {
    expect(casaBusca(lead({ nome: "X", empresa: null, email: null }), "ana")).toBe(false);
  });

  it("lead sem contato nem empresa não quebra", () => {
    expect(casaBusca(lead({ empresa: null, email: null, telefone: null }), "81")).toBe(false);
  });
});

describe("naJanela", () => {
  it("novo, em contato e trial ficam sempre", () => {
    for (const status of ["novo", "em_contato", "trial"] as const)
      expect(naJanela(lead({ status, estagioEm: "2020-01-01T00:00:00Z" }), AGORA)).toBe(true);
  });

  it("ganho e perdido só nos últimos 30 dias pela data do estágio", () => {
    expect(naJanela(lead({ status: "ganho", estagioEm: "2026-10-28T12:00:00Z" }), AGORA)).toBe(true);
    expect(naJanela(lead({ status: "perdido", estagioEm: "2026-10-26T11:59:00Z" }), AGORA)).toBe(false);
  });
});

describe("aplicarFiltros", () => {
  const leads = [
    lead({ id: "a", fonte: "contato", praca: "Recife · PE" }),
    lead({ id: "b", nome: "Bruno", email: null, telefone: null, empresa: null, fonte: "trial", praca: null }),
    lead({ id: "c", nome: "Carla", email: "c@x.com", telefone: "11912345678", empresa: null, fonte: "manual", praca: "São Paulo · SP" }),
  ];

  it("sem filtro devolve todos", () => {
    expect(aplicarFiltros(leads, {}).map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("fonte, praça e busca se somam", () => {
    expect(aplicarFiltros(leads, { fonte: "trial" }).map((l) => l.id)).toEqual(["b"]);
    expect(aplicarFiltros(leads, { praca: "São Paulo · SP" }).map((l) => l.id)).toEqual(["c"]);
    expect(aplicarFiltros(leads, { busca: "carla", fonte: "contato" })).toEqual([]);
  });
});

describe("contarPorEstagio", () => {
  it("conta os 5 estágios, com zero onde não há", () => {
    const c = contarPorEstagio([lead({ status: "novo" }), lead({ status: "novo" }), lead({ status: "ganho" })]);
    expect(c).toEqual({ novo: 2, em_contato: 0, trial: 0, ganho: 1, perdido: 0 });
  });
});

describe("opções dos filtros", () => {
  it("praças distintas em ordem alfabética, sem as vazias", () => {
    const ls = [lead({ praca: "Recife · PE" }), lead({ praca: null }), lead({ praca: "Caruaru · PE" }), lead({ praca: "Recife · PE" })];
    expect(opcoesPraca(ls)).toEqual(["Caruaru · PE", "Recife · PE"]);
  });

  it("fontes presentes na ordem de FONTES", () => {
    expect(opcoesFonte([lead({ fonte: "manual" }), lead({ fonte: "contato" }), lead({ fonte: "manual" })])).toEqual([
      "contato",
      "manual",
    ]);
  });
});
