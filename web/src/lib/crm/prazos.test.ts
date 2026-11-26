import { describe, expect, it } from "vitest";
import {
  alertaTrial,
  classificarTrial,
  diaEmSaoPaulo,
  estaPraHoje,
  motivosPraHoje,
  varianteProximaAcao,
} from "@/lib/crm/prazos";

// 23:30 em São Paulo do dia 10 = 02:30 UTC do dia 11: a virada que pega quem
// calcula "hoje" em UTC.
const AGORA = new Date("2026-11-10T23:30:00-03:00");

describe("diaEmSaoPaulo", () => {
  it("usa o fuso de São Paulo, não o UTC", () => {
    expect(AGORA.toISOString().slice(0, 10)).toBe("2026-11-11");
    expect(diaEmSaoPaulo(AGORA)).toBe("2026-11-10");
  });
});

describe("classificarTrial", () => {
  it("sem data → null", () => {
    expect(classificarTrial(null, AGORA)).toBeNull();
  });
  it("4 dias ou mais → ok", () => {
    expect(classificarTrial("2026-11-14T12:00:00-03:00", AGORA)).toEqual({ tipo: "ok", dias: 4 });
  });
  it("3 dias ou menos, contados no calendário de São Paulo → expirando", () => {
    // Em UTC seriam 2 dias (11 → 13); em São Paulo são 3 (10 → 13).
    expect(classificarTrial("2026-11-13T12:00:00-03:00", AGORA)).toEqual({
      tipo: "expirando",
      dias: 3,
    });
  });
  it("expira hoje mais tarde → expirando, 0 dias", () => {
    expect(classificarTrial("2026-11-10T23:50:00-03:00", AGORA)).toEqual({
      tipo: "expirando",
      dias: 0,
    });
  });
  it("já passou → expirado, com os dias desde a expiração", () => {
    expect(classificarTrial("2026-11-08T10:00:00-03:00", AGORA)).toEqual({
      tipo: "expirado",
      dias: 2,
    });
    expect(classificarTrial("2026-11-10T20:00:00-03:00", AGORA)).toEqual({
      tipo: "expirado",
      dias: 0,
    });
  });
});

describe("alertaTrial", () => {
  const base = { status: "trial" as const, assinaturaEstado: "trial" as const };
  it("só para card em trial com a assinatura em trial", () => {
    const expira = "2026-11-12T10:00:00-03:00";
    expect(alertaTrial({ ...base, trialExpiraEm: expira }, AGORA)?.tipo).toBe("expirando");
    expect(alertaTrial({ ...base, status: "ganho", trialExpiraEm: expira }, AGORA)).toBeNull();
    expect(
      alertaTrial({ ...base, assinaturaEstado: "ativa", trialExpiraEm: expira }, AGORA),
    ).toBeNull();
  });
});

describe("varianteProximaAcao", () => {
  it("sem ação", () => {
    expect(varianteProximaAcao(null, AGORA)).toBe("sem");
  });
  it("antes de agora → vencida (inclusive mais cedo hoje)", () => {
    expect(varianteProximaAcao("2026-11-10T09:00:00-03:00", AGORA)).toBe("vencida");
    expect(varianteProximaAcao("2026-11-01T09:00:00-03:00", AGORA)).toBe("vencida");
  });
  it("ainda hoje em São Paulo → hoje", () => {
    expect(varianteProximaAcao("2026-11-10T23:45:00-03:00", AGORA)).toBe("hoje");
  });
  it("amanhã em São Paulo, mesmo sendo o mesmo dia em UTC → futura", () => {
    expect(varianteProximaAcao("2026-11-11T09:00:00-03:00", AGORA)).toBe("futura");
  });
});

describe("motivosPraHoje / estaPraHoje", () => {
  const lead = {
    status: "em_contato" as const,
    proximaAcaoEm: null as string | null,
    trialExpiraEm: null as string | null,
    assinaturaEstado: null as "trial" | null,
  };

  it("sem ação e sem trial → fora", () => {
    expect(motivosPraHoje(lead, AGORA)).toEqual([]);
    expect(estaPraHoje(lead, AGORA)).toBe(false);
  });
  it("ação futura → fora", () => {
    expect(estaPraHoje({ ...lead, proximaAcaoEm: "2026-11-11T09:00:00-03:00" }, AGORA)).toBe(false);
  });
  it("ação vencida e ação de hoje → dentro", () => {
    expect(motivosPraHoje({ ...lead, proximaAcaoEm: "2026-11-09T10:00:00-03:00" }, AGORA)).toEqual([
      { tipo: "acao_vencida", em: "2026-11-09T10:00:00-03:00" },
    ]);
    expect(motivosPraHoje({ ...lead, proximaAcaoEm: "2026-11-10T23:45:00-03:00" }, AGORA)).toEqual([
      { tipo: "acao_hoje", em: "2026-11-10T23:45:00-03:00" },
    ]);
  });
  it("trial com 4 dias → fora; com 3 dias ou expirado → dentro", () => {
    const t = { ...lead, status: "trial" as const, assinaturaEstado: "trial" as const };
    expect(estaPraHoje({ ...t, trialExpiraEm: "2026-11-14T12:00:00-03:00" }, AGORA)).toBe(false);
    expect(motivosPraHoje({ ...t, trialExpiraEm: "2026-11-13T12:00:00-03:00" }, AGORA)).toEqual([
      { tipo: "trial_expirando", dias: 3, em: "2026-11-13T12:00:00-03:00" },
    ]);
    expect(motivosPraHoje({ ...t, trialExpiraEm: "2026-11-01T12:00:00-03:00" }, AGORA)).toEqual([
      { tipo: "trial_expirado", dias: 9, em: "2026-11-01T12:00:00-03:00" },
    ]);
  });
  it("lead com 2 motivos mostra os dois (trial em 2 dias + ação hoje)", () => {
    const m = motivosPraHoje(
      {
        status: "trial",
        assinaturaEstado: "trial",
        trialExpiraEm: "2026-11-12T12:00:00-03:00",
        proximaAcaoEm: "2026-11-10T23:45:00-03:00",
      },
      AGORA,
    );
    expect(m.map((x) => x.tipo)).toEqual(["acao_hoje", "trial_expirando"]);
  });
});
