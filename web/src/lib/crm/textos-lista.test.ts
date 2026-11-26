import { describe, expect, it } from "vitest";
import { motivosPraHoje } from "@/lib/crm/prazos";
import { REGRA_ORDEM, textoColunaVazia, textoMotivo, textosPorQueHoje } from "@/lib/crm/textos-lista";

// 14:00 em São Paulo do dia 10.
const AGORA = new Date("2026-11-10T14:00:00-03:00");

describe("textoMotivo", () => {
  it("ação de hoje com o horário de São Paulo", () => {
    expect(textoMotivo({ tipo: "acao_hoje", em: "2026-11-10T19:00:00Z" }, AGORA)).toBe(
      "ação hoje 16:00",
    );
  });

  it("ação vencida hoje mostra a hora; de outro dia mostra a data", () => {
    expect(textoMotivo({ tipo: "acao_vencida", em: "2026-11-10T09:30:00-03:00" }, AGORA)).toBe(
      "ação venceu hoje 09:30",
    );
    expect(textoMotivo({ tipo: "acao_vencida", em: "2026-11-07T10:00:00-03:00" }, AGORA)).toBe(
      "ação venceu em 07/11/2026",
    );
  });

  it("data da ação vencida é o dia de São Paulo, não o de UTC", () => {
    // 22:30 do dia 9 em São Paulo = 01:30 UTC do dia 10.
    expect(textoMotivo({ tipo: "acao_vencida", em: "2026-11-10T01:30:00Z" }, AGORA)).toBe(
      "ação venceu em 09/11/2026",
    );
  });

  it("trial expirando: hoje, 1 dia, n dias", () => {
    const em = "2026-11-12T12:00:00-03:00";
    expect(textoMotivo({ tipo: "trial_expirando", dias: 2, em }, AGORA)).toBe("trial expira em 2 dias");
    expect(textoMotivo({ tipo: "trial_expirando", dias: 1, em }, AGORA)).toBe("trial expira em 1 dia");
    expect(textoMotivo({ tipo: "trial_expirando", dias: 0, em }, AGORA)).toBe("trial expira hoje");
  });

  it("trial expirado: hoje, 1 dia, n dias", () => {
    const em = "2026-11-08T12:00:00-03:00";
    expect(textoMotivo({ tipo: "trial_expirado", dias: 0, em }, AGORA)).toBe("trial expirou hoje");
    expect(textoMotivo({ tipo: "trial_expirado", dias: 1, em }, AGORA)).toBe("trial expirou há 1 dia");
    expect(textoMotivo({ tipo: "trial_expirado", dias: 2, em }, AGORA)).toBe("trial expirou há 2 dias");
  });
});

describe("textosPorQueHoje", () => {
  it("lista todos os motivos do lead (trial em 2 dias e ação hoje)", () => {
    const lead = {
      status: "trial" as const,
      assinaturaEstado: "trial" as const,
      trialExpiraEm: "2026-11-12T12:00:00-03:00",
      proximaAcaoEm: "2026-11-10T16:00:00-03:00",
    };
    expect(motivosPraHoje(lead, AGORA)).toHaveLength(2);
    expect(textosPorQueHoje(lead, AGORA)).toEqual([
      { texto: "ação hoje 16:00", tom: "aviso" },
      { texto: "trial expira em 2 dias", tom: "aviso" },
    ]);
  });

  it("vencido e expirado em vermelho", () => {
    const lead = {
      status: "trial" as const,
      assinaturaEstado: "trial" as const,
      trialExpiraEm: "2026-11-08T12:00:00-03:00",
      proximaAcaoEm: "2026-11-10T09:00:00-03:00",
    };
    expect(textosPorQueHoje(lead, AGORA).map((m) => m.tom)).toEqual(["perigo", "perigo"]);
  });

  it("sem motivo, lista vazia", () => {
    const lead = { status: "novo" as const, assinaturaEstado: null, trialExpiraEm: null, proximaAcaoEm: null };
    expect(textosPorQueHoje(lead, AGORA)).toEqual([]);
  });
});

describe("textoColunaVazia", () => {
  it("um texto por estágio", () => {
    expect(textoColunaVazia("novo")).toBe("Nenhum lead em Novo");
    expect(textoColunaVazia("em_contato")).toBe("Nenhum lead em contato");
    expect(textoColunaVazia("trial")).toBe("Nenhum trial ativo");
    expect(textoColunaVazia("ganho")).toBe("Nenhum ganho nos últimos 30 dias");
    expect(textoColunaVazia("perdido")).toBe("Nenhum perdido nos últimos 30 dias");
  });
});

describe("REGRA_ORDEM", () => {
  it("uma linha curta para cada ordem", () => {
    expect(REGRA_ORDEM.praHoje).toBe("Vencidos primeiro, depois pelo horário.");
    expect(REGRA_ORDEM.lista).toBe(
      "Com próxima ação primeiro, pela mais cedo; depois os mais recentes.",
    );
  });
});
