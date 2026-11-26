import { describe, expect, it } from "vitest";
import { inicioJanela, montarLead, type LinhaCrm } from "@/lib/crm/consulta";

const linha: LinhaCrm = {
  id: "l1",
  nome: "Rede Sol",
  empresa: "Rede Sol",
  email: "dono@sol.com",
  telefone: "81999990001",
  assunto: null,
  origem: null,
  status: "trial",
  fonte: "trial",
  motivo_perda: null,
  proxima_acao: null,
  proxima_acao_em: null,
  utm_source: "google",
  utm_medium: null,
  utm_campaign: null,
  tenant_id: "t1",
  vinculo_criou_lead: true,
  atendido_em: null,
  estagio_em: "2026-11-01T10:00:00Z",
  criado_em: "2026-11-01T10:00:00Z",
  atualizado_em: "2026-11-01T10:00:00Z",
  tenant_codigo: "1234",
  tenant_nome: "Rede Sol",
  assinatura_estado: "trial",
  trial_expira_em: "2026-11-16T10:00:00Z",
  tem_interacao_humana: false,
};

describe("montarLead", () => {
  it("mapeia para camelCase com a praça pelo DDD", () => {
    const l = montarLead(linha);
    expect(l).toMatchObject({
      id: "l1",
      status: "trial",
      tenantCodigo: "1234",
      assinaturaEstado: "trial",
      utmSource: "google",
      vinculoCriouLead: true,
    });
    expect(l.praca).toMatch(/· PE$/);
  });
  it("nome = empresa = nome da rede → sem responsável informado (Revisão 10)", () => {
    expect(montarLead(linha).semResponsavel).toBe(true);
    expect(montarLead({ ...linha, nome: "Carla" }).semResponsavel).toBe(false);
    expect(montarLead({ ...linha, tenant_nome: null, tenant_id: null }).semResponsavel).toBe(false);
  });
  it("sem telefone → sem praça", () => {
    expect(montarLead({ ...linha, telefone: null }).praca).toBeNull();
  });
});

describe("inicioJanela", () => {
  it("30 dias antes de agora (Ganho e Perdido do kanban)", () => {
    expect(inicioJanela(new Date("2026-11-30T12:00:00Z"))).toBe("2026-10-31T12:00:00.000Z");
  });
});
