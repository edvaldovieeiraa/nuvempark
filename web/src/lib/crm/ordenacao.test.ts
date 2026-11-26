import { describe, expect, it } from "vitest";
import { ordenarColuna, ordenarLista, ordenarPraHoje } from "@/lib/crm/ordenacao";

const AGORA = new Date("2026-11-10T12:00:00-03:00");

function l(
  id: string,
  extra: Partial<{
    status: "novo" | "em_contato" | "trial";
    proximaAcaoEm: string | null;
    trialExpiraEm: string | null;
    assinaturaEstado: "trial" | null;
    criadoEm: string;
  }> = {},
) {
  return {
    id,
    status: "em_contato" as "novo" | "em_contato" | "trial",
    proximaAcaoEm: null as string | null,
    trialExpiraEm: null as string | null,
    assinaturaEstado: null as "trial" | null,
    criadoEm: "2026-11-01T10:00:00-03:00",
    ...extra,
  };
}

const vencidaOntem = l("A", { proximaAcaoEm: "2026-11-09T09:00:00-03:00" });
const trialExpirado = l("B", {
  status: "trial",
  assinaturaEstado: "trial",
  trialExpiraEm: "2026-11-08T10:00:00-03:00",
});
const acaoAmanha = l("C", { proximaAcaoEm: "2026-11-11T09:00:00-03:00" });
const semAcaoRecente = l("D", { criadoEm: "2026-11-09T10:00:00-03:00" });
const semAcaoAntigo = l("E", { criadoEm: "2026-10-01T10:00:00-03:00" });
const acaoHojeTarde = l("F", { proximaAcaoEm: "2026-11-10T15:00:00-03:00" });

const todos = [semAcaoAntigo, acaoAmanha, vencidaOntem, semAcaoRecente, acaoHojeTarde, trialExpirado];

describe("ordenarColuna — Revisão 6", () => {
  it("vencido/expirado → próxima ação → chegada (mais recente primeiro)", () => {
    expect(ordenarColuna(todos, AGORA).map((x) => x.id)).toEqual(["B", "A", "F", "C", "D", "E"]);
  });
  it("não muda o array recebido", () => {
    const copia = [...todos];
    ordenarColuna(todos, AGORA);
    expect(todos).toEqual(copia);
  });
});

describe("ordenarPraHoje", () => {
  it("vencido primeiro, depois por horário", () => {
    const trialEm2Dias = l("G", {
      status: "trial",
      assinaturaEstado: "trial",
      trialExpiraEm: "2026-11-12T08:00:00-03:00",
    });
    const brunoTrialEAcao = l("H", {
      status: "trial",
      assinaturaEstado: "trial",
      trialExpiraEm: "2026-11-12T08:00:00-03:00",
      proximaAcaoEm: "2026-11-10T16:00:00-03:00",
    });
    expect(
      ordenarPraHoje([trialEm2Dias, acaoHojeTarde, brunoTrialEAcao, vencidaOntem, trialExpirado], AGORA).map(
        (x) => x.id,
      ),
    ).toEqual(["B", "A", "F", "H", "G"]);
  });
});

describe("ordenarLista (sem Pra hoje)", () => {
  it("pela próxima ação e depois pela chegada", () => {
    expect(
      ordenarLista([semAcaoAntigo, acaoAmanha, vencidaOntem, semAcaoRecente, acaoHojeTarde]).map((x) => x.id),
    ).toEqual(["A", "F", "C", "D", "E"]);
  });
});
