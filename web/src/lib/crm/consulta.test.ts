import { describe, expect, it } from "vitest";
import { carregarCrm, carregarLead, inicioJanela, montarLead, type LinhaCrm } from "@/lib/crm/consulta";

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

describe("carregarCrm — teto de linhas do PostgREST", () => {
  // Cliente falso que devolve no máximo 1000 linhas por pedido, como o Supabase.
  function stubPaginado(total: number, teto = 1000) {
    const faixas: [number, number][] = [];
    const q = {
      select: () => q,
      eq: () => q,
      or: () => q,
      order: () => q,
      range: (de: number, ate: number) => {
        faixas.push([de, ate]);
        const fim = Math.min(ate, total - 1, de + teto - 1);
        const data = de > fim ? [] : Array.from({ length: fim - de + 1 }, (_, i) => ({ ...linha, id: `l${de + i}` }));
        return Promise.resolve({ data, error: null });
      },
    };
    return { sb: { from: () => q } as unknown as Parameters<typeof carregarCrm>[0], faixas };
  }

  it("junta as páginas até uma vazia (2500 linhas → 4 pedidos)", async () => {
    const { sb, faixas } = stubPaginado(2500);
    const r = await carregarCrm(sb);
    expect(r.erro).toBe(false);
    expect(r.leads).toHaveLength(2500);
    expect(faixas).toEqual([[0, 999], [1000, 1999], [2000, 2999], [2500, 3499]]);
  });

  it("teto menor que 1000 no servidor (ex.: 500) não corta a lista", async () => {
    const { sb } = stubPaginado(1800, 500);
    expect((await carregarCrm(sb)).leads).toHaveLength(1800);
  });

  it("base vazia: um pedido só", async () => {
    const { sb, faixas } = stubPaginado(0);
    expect((await carregarCrm(sb)).leads).toEqual([]);
    expect(faixas).toHaveLength(1);
  });
});
