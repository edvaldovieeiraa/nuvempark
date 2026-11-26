import { describe, expect, it } from "vitest";
import { carregarLead, inicioJanela, montarLead, type LinhaCrm } from "@/lib/crm/consulta";

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

describe("carregarLead", () => {
  function stub(data: unknown, error: { message: string } | null = null) {
    const chamadas: string[] = [];
    const sb = {
      from(t: string) {
        chamadas.push(t);
        return {
          select: () => ({
            eq: (_c: string, v: string) => {
              chamadas.push(v);
              return { maybeSingle: async () => ({ data, error }) };
            },
          }),
        };
      },
    };
    return { sb: sb as unknown as Parameters<typeof carregarLead>[0], chamadas };
  }
  const ID = "52884e97-edbd-4881-9ef1-6bb6712d8615";

  it("id que não é UUID nem chega ao banco", async () => {
    const { sb, chamadas } = stub({ ...linha });
    expect(await carregarLead(sb, "1 or 1=1")).toBeNull();
    expect(chamadas).toEqual([]);
  });
  it("monta o lead da view pelo id", async () => {
    const { sb, chamadas } = stub({ ...linha, id: ID });
    expect((await carregarLead(sb, ID))?.id).toBe(ID);
    expect(chamadas).toEqual(["crm_leads_v", ID]);
  });
  it("sem linha ou com erro → null", async () => {
    expect(await carregarLead(stub(null).sb, ID)).toBeNull();
    expect(await carregarLead(stub(null, { message: "x" }).sb, ID)).toBeNull();
  });
});
