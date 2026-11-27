import { describe, expect, it } from "vitest";
import {
  cobrancasParaCancelar,
  decisaoCobrancaAsaas,
  motivoBloqueioExclusao,
} from "@/lib/excluir-rede";

const rede = (over: Partial<{ ativo: boolean; contaRevisao: boolean; codigo: string }> = {}) => ({
  ativo: false,
  contaRevisao: false,
  codigo: "3474",
  ...over,
});

describe("motivoBloqueioExclusao", () => {
  it("libera rede desativada com o código certo", () => {
    expect(motivoBloqueioExclusao(rede(), "3474")).toBeNull();
  });

  it("aceita o código com espaços em volta", () => {
    expect(motivoBloqueioExclusao(rede(), " 3474 ")).toBeNull();
  });

  it("recusa a conta de revisão das lojas mesmo desativada e com o código certo", () => {
    expect(motivoBloqueioExclusao(rede({ contaRevisao: true }), "3474")).toMatch(/revisão/i);
  });

  it("recusa rede ativa", () => {
    expect(motivoBloqueioExclusao(rede({ ativo: true }), "3474")).toMatch(/desative/i);
  });

  it("recusa código diferente", () => {
    expect(motivoBloqueioExclusao(rede(), "3475")).toMatch(/código/i);
  });

  it("recusa código vazio", () => {
    expect(motivoBloqueioExclusao(rede(), "")).toMatch(/código/i);
  });
});

describe("cobrancasParaCancelar", () => {
  it("pega só aberta e vencida que têm cobrança no gateway", () => {
    expect(
      cobrancasParaCancelar([
        { estado: "aberta", gateway_cobranca_id: "pay_a" },
        { estado: "vencida", gateway_cobranca_id: "pay_b" },
        { estado: "paga", gateway_cobranca_id: "pay_c" },
        { estado: "cancelada", gateway_cobranca_id: "pay_d" },
        { estado: "vencida", gateway_cobranca_id: null },
      ]),
    ).toEqual(["pay_a", "pay_b"]);
  });

  it("não repete o mesmo id", () => {
    expect(
      cobrancasParaCancelar([
        { estado: "aberta", gateway_cobranca_id: "pay_a" },
        { estado: "vencida", gateway_cobranca_id: "pay_a" },
      ]),
    ).toEqual(["pay_a"]);
  });

  it("lista vazia quando não há faturas", () => {
    expect(cobrancasParaCancelar([])).toEqual([]);
  });
});

describe("decisaoCobrancaAsaas", () => {
  it("ignora cobrança que não existe mais (404)", () => {
    expect(decisaoCobrancaAsaas(null)).toBe("ignorar");
  });

  it("ignora cobrança já removida", () => {
    expect(decisaoCobrancaAsaas({ deleted: true, status: "PENDING" })).toBe("ignorar");
  });

  it("exclui pendente e vencida", () => {
    expect(decisaoCobrancaAsaas({ deleted: false, status: "PENDING" })).toBe("excluir");
    expect(decisaoCobrancaAsaas({ status: "OVERDUE" })).toBe("excluir");
  });

  it("bloqueia cobrança paga no Asaas, que o nosso banco ainda não viu", () => {
    expect(decisaoCobrancaAsaas({ status: "RECEIVED" })).toBe("bloquear");
    expect(decisaoCobrancaAsaas({ status: "CONFIRMED" })).toBe("bloquear");
    expect(decisaoCobrancaAsaas({ status: "RECEIVED_IN_CASH" })).toBe("bloquear");
  });

  it("bloqueia status desconhecido em vez de apagar às cegas", () => {
    expect(decisaoCobrancaAsaas({ status: "AWAITING_RISK_ANALYSIS" })).toBe("bloquear");
    expect(decisaoCobrancaAsaas({})).toBe("bloquear");
  });
});
