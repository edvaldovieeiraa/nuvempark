import { describe, expect, it } from "vitest";
import {
  validarInteracao,
  validarLeadManual,
  validarMovimento,
  validarProximaAcao,
  validarContatoLead,
} from "@/lib/crm/validacao";

describe("validarMovimento", () => {
  const lead = { status: "em_contato" as const, tenantId: null, assinaturaEstado: null };

  it("aceita destino da matriz", () => {
    expect(validarMovimento(lead, { de: "em_contato", para: "novo" })).toEqual({ ok: true });
  });
  it("recusa quando o estágio lido já não é o atual", () => {
    const r = validarMovimento(lead, { de: "novo", para: "perdido", motivoPerda: "preco" });
    expect(r).toEqual({ ok: false, msg: expect.stringMatching(/mudou/i) });
  });
  it("aceita Trial e Ganho como destino; recusa o próprio estágio", () => {
    expect(validarMovimento({ ...lead, status: "ganho" }, { de: "ganho", para: "trial" }).ok).toBe(true);
    expect(validarMovimento(lead, { de: "em_contato", para: "ganho" }).ok).toBe(true);
    expect(validarMovimento(lead, { de: "em_contato", para: "em_contato" }).ok).toBe(false);
  });
  it("perdido exige um dos 6 motivos; cancelou é do sistema", () => {
    expect(validarMovimento(lead, { de: "em_contato", para: "perdido" }).ok).toBe(false);
    expect(
      validarMovimento(lead, { de: "em_contato", para: "perdido", motivoPerda: "cancelou" as never }).ok,
    ).toBe(false);
    expect(validarMovimento(lead, { de: "em_contato", para: "perdido", motivoPerda: "preco" }).ok).toBe(true);
  });
  it("outro exige comentário", () => {
    expect(
      validarMovimento(lead, { de: "em_contato", para: "perdido", motivoPerda: "outro", texto: "  " }).ok,
    ).toBe(false);
    expect(
      validarMovimento(lead, { de: "em_contato", para: "perdido", motivoPerda: "outro", texto: "Fechou com outro" }).ok,
    ).toBe(true);
  });
});

describe("validarInteracao", () => {
  it("aceita os 5 tipos do master e corta espaços", () => {
    expect(validarInteracao({ tipo: "ligacao", texto: "  Liguei  " })).toEqual({
      ok: true,
      tipo: "ligacao",
      texto: "Liguei",
    });
  });
  it("recusa sistema, vazio e texto acima de 4000", () => {
    expect(validarInteracao({ tipo: "sistema" as never, texto: "x" }).ok).toBe(false);
    expect(validarInteracao({ tipo: "nota", texto: "   " }).ok).toBe(false);
    expect(validarInteracao({ tipo: "nota", texto: "x".repeat(4001) }).ok).toBe(false);
  });
});

describe("validarProximaAcao", () => {
  it("null limpa", () => {
    expect(validarProximaAcao(null)).toEqual({ ok: true, proximaAcao: null, proximaAcaoEm: null });
  });
  it("exige texto de até 200 e data válida", () => {
    expect(validarProximaAcao({ proximaAcao: " ", proximaAcaoEm: "2026-11-11T09:00:00-03:00" }).ok).toBe(false);
    expect(
      validarProximaAcao({ proximaAcao: "x".repeat(201), proximaAcaoEm: "2026-11-11T09:00:00-03:00" }).ok,
    ).toBe(false);
    expect(validarProximaAcao({ proximaAcao: "Ligar", proximaAcaoEm: "amanhã" }).ok).toBe(false);
  });
  it("devolve a data em ISO UTC", () => {
    expect(validarProximaAcao({ proximaAcao: "Ligar", proximaAcaoEm: "2026-11-11T09:00:00-03:00" })).toEqual({
      ok: true,
      proximaAcao: "Ligar",
      proximaAcaoEm: "2026-11-11T12:00:00.000Z",
    });
  });
});

describe("validarLeadManual", () => {
  const base = { nome: "Ana", empresa: "", telefone: "(81) 99999-0001", email: "", status: "novo" as const };

  it("normaliza contato e campos vazios", () => {
    const r = validarLeadManual(base);
    expect(r).toMatchObject({ ok: true, dados: { nome: "Ana", empresa: null, telefone: "81999990001", email: null } });
  });
  it("nome obrigatório; pelo menos um contato; estágio só novo ou em contato", () => {
    expect(validarLeadManual({ ...base, nome: " " }).ok).toBe(false);
    expect(validarLeadManual({ ...base, telefone: "" }).ok).toBe(false);
    expect(validarLeadManual({ ...base, status: "trial" as never }).ok).toBe(false);
  });
  it("quando sem ação não vale", () => {
    expect(
      validarLeadManual({ ...base, proximaAcaoEm: "2026-11-11T09:00:00-03:00" }),
    ).toMatchObject({ ok: true, dados: { proximaAcao: null, proximaAcaoEm: null } });
  });
});

describe("validarContatoLead", () => {
  it("normaliza nome, empresa e contatos", () => {
    expect(
      validarContatoLead({ nome: "  Ana ", empresa: " ", email: " A@B.co ", telefone: "(81) 3333-0000" }),
    ).toEqual({ ok: true, dados: { nome: "Ana", empresa: null, email: "a@b.co", telefone: "8133330000" } });
  });
  it("nome obrigatório e até 120; pelo menos um contato", () => {
    expect(validarContatoLead({ nome: " ", email: "a@b.co" }).ok).toBe(false);
    expect(validarContatoLead({ nome: "x".repeat(121), email: "a@b.co" }).ok).toBe(false);
    expect(validarContatoLead({ nome: "Ana", email: "", telefone: "" }).ok).toBe(false);
  });
});

describe("validarProximaAcao — fuso explícito", () => {
  it("recusa data sem fuso (seria lida no fuso do servidor)", () => {
    expect(validarProximaAcao({ proximaAcao: "Ligar", proximaAcaoEm: "2026-11-11T09:00" }).ok).toBe(false);
    expect(validarProximaAcao({ proximaAcao: "Ligar", proximaAcaoEm: "2026-11-11T12:00:00Z" }).ok).toBe(true);
  });
});
