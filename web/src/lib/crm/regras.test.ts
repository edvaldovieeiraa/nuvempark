import { describe, expect, it } from "vitest";
import {
  destinosPossiveis,
  podeExcluirComoSpam,
  podeMoverPara,
  MOTIVOS_MANUAIS,
} from "@/lib/crm/regras";
import type { Estagio, EstadoAssinatura } from "@/lib/crm/tipos";

function lead(
  status: Estagio,
  tenantId: string | null = null,
  assinaturaEstado: EstadoAssinatura | null = null,
) {
  return { status, tenantId, assinaturaEstado };
}

describe("podeMoverPara — matriz da Revisão 1", () => {
  it("sem rede: livre entre novo, em_contato e perdido", () => {
    expect(destinosPossiveis(lead("novo"))).toEqual(["em_contato", "perdido"]);
    expect(destinosPossiveis(lead("em_contato"))).toEqual(["novo", "perdido"]);
    expect(destinosPossiveis(lead("perdido"))).toEqual(["novo", "em_contato"]);
  });

  it("nunca deixa ir para ganho, nem mover para o próprio estágio", () => {
    for (const s of ["novo", "em_contato", "trial", "perdido", "ganho"] as const) {
      expect(podeMoverPara(lead(s), "ganho" as never)).toBe(false);
      expect(podeMoverPara(lead(s), s as never)).toBe(false);
    }
  });

  it("sem rede, trial não é destino", () => {
    expect(podeMoverPara(lead("novo"), "trial")).toBe(false);
    expect(podeMoverPara(lead("perdido"), "trial")).toBe(false);
  });

  it("trial só vai para perdido", () => {
    expect(destinosPossiveis(lead("trial", "t1", "trial"))).toEqual(["perdido"]);
  });

  it("perdido com rede: só reabre (volta a trial) com a assinatura em trial", () => {
    expect(destinosPossiveis(lead("perdido", "t1", "trial"))).toEqual(["trial"]);
    for (const e of ["ativa", "atrasada", "suspensa", "cancelada"] as const) {
      expect(destinosPossiveis(lead("perdido", "t1", e))).toEqual([]);
    }
    expect(destinosPossiveis(lead("perdido", "t1", null))).toEqual([]);
  });

  it("ganho não tem destino manual", () => {
    expect(destinosPossiveis(lead("ganho"))).toEqual([]);
    expect(destinosPossiveis(lead("ganho", "t1", "ativa"))).toEqual([]);
  });

  it("rejeita estágio desconhecido vindo da rede", () => {
    expect(podeMoverPara(lead("novo"), "fechado" as never)).toBe(false);
  });
});

describe("MOTIVOS_MANUAIS", () => {
  it("tem os 6 motivos do master e não tem cancelou (é do sistema)", () => {
    expect(MOTIVOS_MANUAIS).toEqual([
      "preco",
      "sem_retorno",
      "concorrente",
      "sem_perfil",
      "desistiu",
      "outro",
    ]);
  });
});

describe("podeExcluirComoSpam — Revisão 3", () => {
  const base = { fonte: "contato" as const, tenantId: null, temInteracaoHumana: false };

  it("só lead do formulário, sem rede e sem interação humana", () => {
    expect(podeExcluirComoSpam(base)).toBe(true);
  });
  it("recusa lead com rede ligada", () => {
    expect(podeExcluirComoSpam({ ...base, tenantId: "t1" })).toBe(false);
  });
  it("recusa lead com interação humana", () => {
    expect(podeExcluirComoSpam({ ...base, temInteracaoHumana: true })).toBe(false);
  });
  it("recusa lead que não veio do formulário", () => {
    for (const fonte of ["trial", "master", "manual", "importacao"] as const) {
      expect(podeExcluirComoSpam({ ...base, fonte })).toBe(false);
    }
  });
});
