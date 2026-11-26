import { describe, expect, it } from "vitest";
import {
  rodapeCard,
  seloCard,
  subtituloCard,
  textoProximaAcao,
  textoTrial,
} from "@/lib/crm/textos-card";
import type { LeadCrm } from "@/lib/crm/tipos";

// 23:30 em São Paulo do dia 10 = 02:30 UTC do dia 11.
const AGORA = new Date("2026-11-10T23:30:00-03:00");

function lead(o: Partial<LeadCrm> = {}): LeadCrm {
  return {
    id: "1",
    nome: "Rafael Monteiro",
    empresa: "Estacionamento Boa Viagem",
    email: "rafael@exemplo.com",
    telefone: "81999998888",
    assunto: null,
    origem: null,
    status: "novo",
    fonte: "contato",
    motivoPerda: null,
    proximaAcao: null,
    proximaAcaoEm: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    tenantId: null,
    tenantCodigo: null,
    tenantNome: null,
    assinaturaEstado: null,
    trialExpiraEm: null,
    vinculoCriouLead: false,
    atendidoEm: null,
    estagioEm: "2026-11-10T22:00:00-03:00",
    criadoEm: "2026-11-10T22:00:00-03:00",
    temInteracaoHumana: false,
    praca: "Recife · PE",
    semResponsavel: false,
    ...o,
  };
}

describe("subtituloCard", () => {
  it("empresa · praça", () => {
    expect(subtituloCard(lead())).toBe("Estacionamento Boa Viagem · Recife · PE");
  });
  it("sem empresa: só a praça", () => {
    expect(subtituloCard(lead({ empresa: null }))).toBe("Recife · PE");
  });
  it("lead do vínculo: sem responsável informado no lugar da empresa", () => {
    expect(
      subtituloCard(lead({ nome: "Praia Mar", empresa: "Praia Mar", semResponsavel: true })),
    ).toBe("sem responsável informado · Recife · PE");
  });
  it("sem contato", () => {
    expect(subtituloCard(lead({ email: null, telefone: null, praca: null }))).toBe(
      "Estacionamento Boa Viagem · sem contato",
    );
  });
  it("nada a dizer → null", () => {
    expect(subtituloCard(lead({ empresa: null, praca: null }))).toBeNull();
  });
});

describe("textoTrial", () => {
  const em = "2026-11-12T12:00:00-03:00";
  it("expira em N dias, com a data", () => {
    expect(textoTrial({ tipo: "expirando", dias: 2 }, em)).toBe("Expira em 2 dias · 12/11/2026");
  });
  it("singular", () => {
    expect(textoTrial({ tipo: "expirando", dias: 1 }, em)).toBe("Expira em 1 dia · 12/11/2026");
  });
  it("expira hoje", () => {
    expect(textoTrial({ tipo: "expirando", dias: 0 }, em)).toBe("Expira hoje · 12/11/2026");
  });
  it("expirado", () => {
    expect(textoTrial({ tipo: "expirado", dias: 4 }, em)).toBe("Expirou há 4 dias, sem pagamento");
    expect(textoTrial({ tipo: "expirado", dias: 1 }, em)).toBe("Expirou há 1 dia, sem pagamento");
    expect(textoTrial({ tipo: "expirado", dias: 0 }, em)).toBe("Expirou hoje, sem pagamento");
  });
  it("data no calendário de São Paulo, não no UTC", () => {
    // 22:00 em São Paulo do dia 12 já é dia 13 em UTC.
    expect(textoTrial({ tipo: "ok", dias: 9 }, "2026-11-12T22:00:00-03:00")).toBe(
      "Expira em 9 dias · 12/11/2026",
    );
  });
});

describe("textoProximaAcao", () => {
  it("sem ação → null", () => {
    expect(textoProximaAcao(null, AGORA)).toBeNull();
  });
  it("venceu hoje mais cedo", () => {
    expect(textoProximaAcao("2026-11-10T09:00:00-03:00", AGORA)).toBe("Venceu hoje às 09:00");
  });
  it("venceu em outro dia", () => {
    expect(textoProximaAcao("2026-11-08T09:00:00-03:00", AGORA)).toBe("Venceu em 08/11/2026");
  });
  it("hoje ainda", () => {
    expect(textoProximaAcao("2026-11-10T23:45:00-03:00", AGORA)).toBe("Hoje às 23:45");
  });
  it("futura, no calendário de São Paulo", () => {
    expect(textoProximaAcao("2026-11-11T10:00:00-03:00", AGORA)).toBe("11/11/2026 às 10:00");
  });
});

describe("seloCard", () => {
  it("ganho com assinatura atrasada → aviso", () => {
    expect(seloCard(lead({ status: "ganho", assinaturaEstado: "atrasada", tenantId: "t" }))).toEqual({
      texto: "Assinatura atrasada",
      tom: "aviso",
    });
  });
  it("ganho suspensa ou cancelada → perigo", () => {
    expect(seloCard(lead({ status: "ganho", assinaturaEstado: "suspensa" }))?.tom).toBe("perigo");
    expect(seloCard(lead({ status: "ganho", assinaturaEstado: "cancelada" }))?.tom).toBe("perigo");
  });
  it("ganho com assinatura ativa → sem selo", () => {
    expect(seloCard(lead({ status: "ganho", assinaturaEstado: "ativa" }))).toBeNull();
  });
  it("perdido → motivo em selo neutro", () => {
    expect(seloCard(lead({ status: "perdido", motivoPerda: "preco" }))).toEqual({
      texto: "Preço",
      tom: "neutro",
    });
  });
  it("outros estágios → sem selo", () => {
    expect(seloCard(lead())).toBeNull();
  });
});

describe("rodapeCard", () => {
  it("novo: fonte e chegada", () => {
    expect(rodapeCard(lead())).toBe("Contato do site · chegou em 10/11/2026");
  });
  it("ganho: fonte derivada e data do estágio", () => {
    expect(
      rodapeCard(
        lead({ status: "ganho", tenantId: "t", estagioEm: "2026-11-08T12:00:00-03:00" }),
      ),
    ).toBe("Contato do site → Trial · ganho em 08/11/2026");
  });
  it("perdido", () => {
    expect(
      rodapeCard(lead({ status: "perdido", fonte: "manual", estagioEm: "2026-11-08T12:00:00-03:00" })),
    ).toBe("Manual · perdido em 08/11/2026");
  });
});
